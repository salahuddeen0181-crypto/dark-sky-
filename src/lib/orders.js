import 'server-only';
import * as S from './order-store';
import { tgReady, notifyNewOrder, refreshOrderMessage, refreshOrderMessages, notifyEdited } from './telegram';
import { staffReady, getStaffById, orderRecipients } from './staff';

export class OrderError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

const staffName = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');
const MAX_LINES = 40, MAX_QTY = 20, MAX_NOTE = 200, RATE_N = 5, RATE_MINUTES = 2;

const sums = (lines, cash) => {
  let subtotal = 0, onRequest = false;
  for (const l of lines) if (l.total == null) onRequest = true; else subtotal += l.total;
  const discount = cash ? Math.round(subtotal * 0.15) : 0;
  return { subtotal, discount, total: subtotal - discount, on_request: onRequest };
};

// Telegram is a second channel next to the staff page: if it is down the order still stands.
// site: the address the staff link in the message points to. Older orders have one group message (tg_message_id).
async function tgRefresh(o, site) {
  if (!o || !tgReady()) return;
  try {
    const msgs = await S.orderMessages(o.id);
    if (msgs.length) await refreshOrderMessages(o, msgs, site);
    else if (o.tg_message_id) await refreshOrderMessage(o, site);
  } catch (e) { console.error('tg edit', e); }
}

// [{ id, vi, oi, qty }] → priced lines. Prices always come from the menu on the server, never from a phone.
// oi: the free option picked (a dessert's topping), null for none; staff read it inside `variant`.
async function priceLines(lines, { allowHidden = false } = {}) {
  const ids = [...new Set(lines.map(l => String(l.id)))];
  const byId = Object.fromEntries((await S.menuRows(ids)).map(r => [r.id, r]));
  return lines.map(l => {
    const r = byId[String(l.id)], qty = Math.floor(Number(l.qty));
    if (!r || (r.hidden && !allowHidden)) throw new OrderError('unavailable', 409);
    if (!(qty >= 1 && qty <= MAX_QTY)) throw new OrderError('bad_lines');
    const it = r.data, vi = Math.floor(Number(l.vi) || 0);
    if (it.v && !(vi >= 0 && vi < it.v.length)) throw new OrderError('bad_lines');
    const oi = l.oi == null || !it.opt ? null : Math.floor(Number(l.oi));
    if (oi != null && !(oi >= 0 && oi < it.opt.o.length)) throw new OrderError('bad_lines');
    const price = it.v ? it.v[vi].p : it.p;
    const variant = [it.v ? staffName(it.v[vi].n) : '', oi != null ? `${staffName(it.opt.n).toLowerCase()}: ${staffName(it.opt.o[oi])}` : ''].filter(Boolean).join(' · ');
    return { id: r.id, vi: it.v ? vi : null, oi, name: it.name, variant, qty, price: price ?? null, total: price == null ? null : price * qty };
  });
}

export async function placeOrder({ token, lines, cash, lang, note, site }) {
  if (!Array.isArray(lines) || !lines.length || lines.length > MAX_LINES) throw new OrderError('bad_lines');
  const table = await S.findTable(token);
  if (!table) throw new OrderError('bad_table', 404);
  if ((await S.recentOrders(table.id, RATE_MINUTES)) >= RATE_N) throw new OrderError('rate', 429);
  const priced = await priceLines(lines);

  const o = await S.insertOrder({
    table_id: table.id, table_number: table.number, lines: priced, ...sums(priced, !!cash), cash: !!cash,
    lang: String(lang || '').slice(0, 5), note: String(note || '').trim().slice(0, MAX_NOTE) || null,
  });

  // privately to the waiters on shift (first to press «Взять» gets it) and to the owners' feed group
  if (tgReady()) {
    try { await S.saveMessages(o.id, await notifyNewOrder(o, site, await orderRecipients())); } catch (e) { console.error('order notify failed', o.id, e); }
  }
  return { id: o.id, status: o.status };
}

// staff: { id, name } — a waiter (id > 0) from the staff table; id 0 only when there is no database (free-text name)
export async function acceptOrder(id, staff, site) {
  const o = await S.markAccepted(id, String(staff?.name || '').trim().slice(0, 60) || 'официант', staff?.id || null);
  await tgRefresh(o, site);
  return o;
}

export async function serveOrder(id, staff, site) {
  const o = await S.markServed(id, staff?.id || null);
  await tgRefresh(o, site);
  return o;
}

// What changed between two versions of the lines: removed, quantity changed, added (by dish + variant + topping)
const lineKey = l => `${l.id}:${l.vi ?? ''}:${l.oi ?? ''}`;
function diffLines(before, after) {
  const key = lineKey, was = new Map(before.map(l => [key(l), l])), now = new Map(after.map(l => [key(l), l]));
  const out = [];
  for (const [k, l] of was) {
    const n = now.get(k);
    if (!n) out.push({ kind: 'removed', name: l.name, variant: l.variant });
    else if (n.qty !== l.qty) out.push({ kind: 'qty', name: l.name, variant: l.variant, from: l.qty, to: n.qty });
  }
  for (const [k, l] of now) if (!was.has(k)) out.push({ kind: 'added', name: l.name, variant: l.variant, to: l.qty });
  return out;
}

// The waiter who took the order hears about changes made by someone else (a private message from the bot)
async function tellWaiter(o, changes, editor, site) {
  if (!changes.length || !o.accepted_by_id || o.accepted_by_id === editor?.id || !tgReady() || !staffReady()) return;
  const w = await getStaffById(o.accepted_by_id);
  if (!w || !w.tg_id) return; // a waiter without Telegram sees it in the staff app
  await notifyEdited(o, w.tg_id, changes, editor?.name || 'персонал', site).catch(e => console.error('tg edit dm', e));
}

// Staff change the order: edits = [{ i: line index, qty }] (qty 0 removes the line), add = [{ id, vi, qty }] new dishes.
// A dish added again with the same variant just raises the quantity of its line.
// editor: { id, name } of who changed it (id 0 for the bar tablet or an admin).
export async function editOrder(id, edits = [], add = [], site, editor = null) {
  const cur = await S.getOrder(id);
  if (!cur) throw new OrderError('not_found', 404);
  if (!Array.isArray(edits) || !Array.isArray(add) || add.length > MAX_LINES) throw new OrderError('bad_lines');
  const qty = cur.lines.map(l => l.qty);
  for (const e of edits) {
    const i = Math.floor(Number(e.i)), q = Math.floor(Number(e.qty));
    if (!(i >= 0 && i < qty.length) || !(q >= 0 && q <= MAX_QTY)) throw new OrderError('bad_lines');
    qty[i] = q;
  }
  const lines = cur.lines.map((l, i) => ({ ...l, qty: qty[i], total: l.price == null ? null : l.price * qty[i] }));
  for (const n of add.length ? await priceLines(add, { allowHidden: true }) : []) {
    const same = lines.find(l => lineKey(l) === lineKey(n));
    if (same) { same.qty = Math.min(MAX_QTY, same.qty + n.qty); same.total = same.price == null ? null : same.price * same.qty; } else lines.push(n);
  }
  const kept = lines.filter(l => l.qty > 0);
  if (!kept.length) throw new OrderError('empty');
  if (kept.length > MAX_LINES) throw new OrderError('bad_lines');
  const o = await S.replaceLines(id, { lines: kept, ...sums(kept, cur.cash) });
  if (!o) throw new OrderError('closed', 409);
  await Promise.all([tgRefresh(o, site), tellWaiter(o, diffLines(cur.lines, kept), editor, site)]);
  return o;
}

export const getOrder = S.getOrder;
export const listOrders = S.listOrders;

// What the guest's phone sees while it waits: status, who took it and the order as it stands now.
export async function getOrderForGuest(id, token) {
  const o = await S.getOrderForTable(id, token);
  if (!o) return null;
  return {
    status: o.status, by: o.accepted_by || null, edited: !!o.edited_at,
    lines: o.lines.map(l => ({ id: l.id, vi: l.vi ?? null, oi: l.oi ?? null, variant: l.variant, qty: l.qty, total: l.total })),
    subtotal: o.subtotal, discount: o.discount, total: o.total, onRequest: o.on_request,
  };
}
