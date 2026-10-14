import 'server-only';
import { db } from './db';
import { tgReady, notifyNewOrder, refreshOrderMessage } from './telegram';

export class OrderError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

const staffName = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');
const MAX_LINES = 40, MAX_QTY = 20, RATE_N = 5, RATE_MINUTES = 2;

// Prices always come from the database, never from the guest's phone.
export async function placeOrder({ token, lines, cash, lang }) {
  if (!Array.isArray(lines) || !lines.length || lines.length > MAX_LINES) throw new OrderError('bad_lines');
  const sql = db();
  const [table] = await sql`select id, number from tables where token = ${String(token || '')} and active`;
  if (!table) throw new OrderError('bad_table', 404);

  const [{ recent }] = await sql`select count(*)::int as recent from orders where table_id = ${table.id} and created_at > now() - make_interval(mins => ${RATE_MINUTES}) and status <> 'failed'`;
  if (recent >= RATE_N) throw new OrderError('rate', 429);

  const ids = [...new Set(lines.map(l => String(l.id)))];
  const rows = await sql`select id, hidden, data from menu_items where id in ${sql(ids)}`;
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));

  let subtotal = 0, onRequest = false;
  const priced = [];
  for (const l of lines) {
    const r = byId[String(l.id)], qty = Math.floor(Number(l.qty));
    if (!r || r.hidden) throw new OrderError('unavailable', 409);
    if (!(qty >= 1 && qty <= MAX_QTY)) throw new OrderError('bad_lines');
    const it = r.data, vi = Math.floor(Number(l.vi) || 0);
    if (it.v && !(vi >= 0 && vi < it.v.length)) throw new OrderError('bad_lines');
    const price = it.v ? it.v[vi].p : it.p;
    const total = price == null ? null : price * qty;
    if (total == null) onRequest = true; else subtotal += total;
    priced.push({ id: r.id, name: it.name, variant: it.v ? staffName(it.v[vi].n) : '', qty, price: price ?? null, total });
  }
  const discount = cash ? Math.round(subtotal * 0.15) : 0;

  const [o] = await sql`
    insert into orders (table_id, table_number, lines, subtotal, discount, total, cash, on_request, lang)
    values (${table.id}, ${table.number}, ${sql.json(priced)}, ${subtotal}, ${discount}, ${subtotal - discount}, ${!!cash}, ${onRequest}, ${String(lang || '').slice(0, 5)})
    returning *`;

  // The waiter must hear about it; if Telegram is down the guest is told to call the waiter instead.
  try {
    if (!tgReady()) throw new Error('Telegram is not configured');
    const mid = await notifyNewOrder(o);
    await sql`update orders set tg_message_id = ${mid} where id = ${o.id}`;
  } catch (e) {
    console.error('order notify failed', o.id, e);
    await sql`update orders set status = 'failed' where id = ${o.id}`;
    throw new OrderError('notify', 502);
  }
  return { id: o.id, status: 'new' };
}

// Atomic transitions: two waiters tapping "Принял" at once → only the first wins.
export async function acceptOrder(id, by) {
  const [o] = await db()`update orders set status = 'accepted', accepted_by = ${by}, accepted_at = now() where id = ${id} and status = 'new' returning *`;
  if (o) await refreshOrderMessage(o).catch(e => console.error('tg edit', e));
  return o || null;
}

export async function serveOrder(id) {
  const [o] = await db()`update orders set status = 'served', served_at = now() where id = ${id} and status = 'accepted' returning *`;
  if (o) await refreshOrderMessage(o).catch(e => console.error('tg edit', e));
  return o || null;
}

export async function getOrder(id) {
  const [o] = await db()`select * from orders where id = ${id}`;
  return o || null;
}

export async function getOrderStatusForTable(id, token) {
  const [o] = await db()`select o.status from orders o join tables t on t.id = o.table_id where o.id = ${id} and t.token = ${String(token || '')}`;
  return o ? o.status : null;
}
