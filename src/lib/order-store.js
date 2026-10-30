import 'server-only';
import { db } from './db';
import * as D from './darksky-data';

// Storage for tables and orders. With DATABASE_URL it is Postgres; without one (local preview) orders live in server
// memory until restart, tables 1–20 open as /t/demo-<number> and prices come from the bundled menu.
export const memMode = () => !process.env.DATABASE_URL;

const mem = () => (globalThis.__darkskyOrders ||= { seq: 0, orders: [] });
const memOrder = id => mem().orders.find(o => o.id === Number(id)) || null;
const DEMO = /^demo-(\d{1,2})$/;
const ACTIVE = new Set(['new', 'accepted']);

export async function findTable(token) {
  token = String(token || '');
  if (memMode()) {
    const n = Number((token.match(DEMO) || [])[1]);
    return n >= 1 && n <= 20 ? { id: n, number: n, token } : null;
  }
  const [t] = await db()`select id, number, label, token from tables where token = ${token} and active`;
  return t || null;
}

export async function recentOrders(tableId, minutes) {
  if (memMode()) return mem().orders.filter(o => o.table_id === tableId && Date.now() - o.created_at < minutes * 60e3).length;
  const [{ n }] = await db()`select count(*)::int as n from orders where table_id = ${tableId} and created_at > now() - make_interval(mins => ${minutes}) and status <> 'failed'`;
  return n;
}

// [{ id, hidden, data }] — data is the item as the menu renders it
export async function menuRows(ids) {
  if (memMode()) return D.ITEMS.filter(it => ids.includes(it.id)).map(it => ({ id: it.id, hidden: false, data: it }));
  return db()`select id, hidden, data from menu_items where id in ${db()(ids)}`;
}

// A retry of a send already placed (same table, same key) gets that order back; null otherwise
export async function orderByKey(tableId, key) {
  if (!key) return null;
  if (memMode()) return mem().orders.find(o => o.table_id === tableId && o.client_key === key) || null;
  const [o] = await db()`select id, status from orders where table_id = ${tableId} and client_key = ${key}`;
  return o || null;
}

// An earlier order of the same table, recent enough to be the same guests' visit: its id, else null
export async function recentOrderOfTable(tableId, id, hours) {
  if (!Number.isInteger(id) || id <= 0) return null;
  if (memMode()) { const o = memOrder(id); return o && o.table_id === tableId && Date.now() - o.created_at < hours * 3600e3 ? id : null; }
  const [o] = await db()`select id from orders where id = ${id} and table_id = ${tableId} and created_at > now() - make_interval(hours => ${hours})`;
  return o ? o.id : null;
}

// null: the same send was placed meanwhile by a parallel request (the unique key held it off)
export async function insertOrder(o) {
  if (memMode()) {
    const row = { ...o, id: ++mem().seq, status: 'new', accepted_by: null, tg_message_id: null, created_at: Date.now(), accepted_at: null, served_at: null, edited_at: null };
    mem().orders.unshift(row);
    return row;
  }
  const sql = db();
  const [row] = await sql`
    insert into orders (table_id, table_number, table_label, lines, subtotal, discount, total, cash, on_request, lang, note, client_key, extra_of)
    values (${o.table_id}, ${o.table_number}, ${o.table_label || null}, ${sql.json(o.lines)}, ${o.subtotal}, ${o.discount}, ${o.total}, ${o.cash}, ${o.on_request}, ${o.lang}, ${o.note}, ${o.client_key || null}, ${o.extra_of || null})
    on conflict (table_id, client_key) where client_key is not null do nothing
    returning *`;
  return row;
}

// Atomic transitions: two waiters tapping "Принять" at once → only the first wins, the other gets null.
export async function markAccepted(id, by, byId = null) {
  if (memMode()) {
    const o = memOrder(id);
    if (!o || o.status !== 'new') return null;
    return Object.assign(o, { status: 'accepted', accepted_by: by, accepted_by_id: byId, accepted_at: Date.now() });
  }
  const [o] = await db()`update orders set status = 'accepted', accepted_by = ${by}, accepted_by_id = ${byId}, accepted_at = now() where id = ${id} and status = 'new' returning *`;
  return o || null;
}

export async function markServed(id, byId = null) {
  if (memMode()) {
    const o = memOrder(id);
    if (!o || o.status !== 'accepted') return null;
    return Object.assign(o, { status: 'served', served_by_id: byId, served_at: Date.now() });
  }
  const [o] = await db()`update orders set status = 'served', served_by_id = ${byId}, served_at = now() where id = ${id} and status = 'accepted' returning *`;
  return o || null;
}

// New lines and sums; only while the order is still open (new or accepted).
export async function replaceLines(id, s) {
  if (memMode()) {
    const o = memOrder(id);
    if (!o || !ACTIVE.has(o.status)) return null;
    return Object.assign(o, s, { edited_at: Date.now() });
  }
  const sql = db();
  const [o] = await sql`
    update orders set lines = ${sql.json(s.lines)}, subtotal = ${s.subtotal}, discount = ${s.discount}, total = ${s.total}, on_request = ${s.on_request}, edited_at = now()
    where id = ${id} and status in ('new', 'accepted') returning *`;
  return o || null;
}

export async function getOrder(id) {
  if (memMode()) return memOrder(id);
  const [o] = await db()`select * from orders where id = ${id}`;
  return o || null;
}

export async function getOrderForTable(id, token) {
  if (memMode()) { const o = memOrder(id); return o && `demo-${o.table_number}` === String(token || '') ? o : null; }
  const [o] = await db()`select o.* from orders o join tables t on t.id = o.table_id where o.id = ${id} and t.token = ${String(token || '')}`;
  return o || null;
}

// The admin's correction of an order, whatever its status. Moving the status back clears the later timestamps,
// moving it on fills the missing ones with now.
export async function saveOrderAdmin(id, s) {
  if (memMode()) {
    const o = memOrder(id);
    if (!o) return null;
    const at = Date.now(), st = s.status;
    return Object.assign(o, s, {
      accepted_at: st === 'new' ? null : o.accepted_at || at, served_at: st === 'served' ? o.served_at || at : null, edited_at: at,
    });
  }
  const sql = db(), st = s.status;
  const [o] = await sql`
    update orders set lines = ${sql.json(s.lines)}, subtotal = ${s.subtotal}, discount = ${s.discount}, total = ${s.total},
      on_request = ${s.on_request}, cash = ${s.cash}, note = ${s.note}, status = ${st}, edited_at = now(),
      accepted_at = case when ${st} = 'new' then null else coalesce(accepted_at, now()) end,
      served_at = case when ${st} = 'served' then coalesce(served_at, now()) else null end
    where id = ${id} returning *`;
  return o || null;
}
// One order out of the statistics (its own archive entry, brought back from «Архив статистики»)
export async function archiveOrder(id) {
  if (memMode()) { const o = memOrder(id); if (o) o.archived_at = Date.now(); return !!o; }
  const [o] = await db()`update orders set archived_at = now() where id = ${id} and archived_at is null returning id`;
  return !!o;
}

// Staff board: everything still open plus what was served in the last 12 hours, newest first.
export async function listOrders() {
  if (memMode()) return mem().orders.filter(o => !o.archived_at && (ACTIVE.has(o.status) || Date.now() - o.created_at < 12 * 3600e3)).slice(0, 200);
  return db()`select * from orders where archived_at is null and (status in ('new', 'accepted') or created_at > now() - interval '12 hours') order by created_at desc limit 200`;
}

// Statistics: every order created since the date, oldest first (archived ones left out).
export async function ordersSince(date) {
  if (memMode()) return mem().orders.filter(o => !o.archived_at && o.created_at >= +date).reverse();
  return db()`select * from orders where archived_at is null and created_at >= ${date} order by created_at`;
}

// MARK: - Archive
// Everything not archived yet (orders, ended shifts, day reports) goes to one archive: the statistics start from
// zero. Returns { at, orders, open } — open: orders still not served that leave the waiters' board too.
export async function archiveAll() {
  if (memMode()) {
    const at = Date.now(), list = mem().orders.filter(o => !o.archived_at);
    for (const o of list) o.archived_at = at;
    return { at, orders: list.length, open: list.filter(o => ACTIVE.has(o.status)).length };
  }
  return db().begin(async sql => {
    const [{ at }] = await sql`select now() as at`;
    const rows = await sql`update orders set archived_at = ${at} where archived_at is null returning status`;
    await sql`update shifts set archived_at = ${at} where archived_at is null and ended_at is not null`;
    await sql`update shift_reports set archived_at = ${at} where archived_at is null`;
    return { at, orders: rows.length, open: rows.filter(o => ACTIVE.has(o.status)).length };
  });
}
// What would go: { orders, open } (for the confirmation)
export async function archivePreview() {
  if (memMode()) { const l = mem().orders.filter(o => !o.archived_at); return { orders: l.length, open: l.filter(o => ACTIVE.has(o.status)).length }; }
  const [r] = await db()`select count(*)::int as orders, count(*) filter (where status in ('new', 'accepted'))::int as open from orders where archived_at is null`;
  return r;
}
// Archives made so far, newest first: [{ at, orders, revenue, from, to }]
export async function archives() {
  if (memMode()) {
    const by = new Map();
    for (const o of mem().orders.filter(o => o.archived_at)) {
      const a = by.get(o.archived_at) || { at: o.archived_at, orders: 0, revenue: 0, from: o.created_at, to: o.created_at };
      a.orders++; a.revenue += o.status === 'failed' ? 0 : o.total; a.from = Math.min(a.from, o.created_at); a.to = Math.max(a.to, o.created_at);
      by.set(o.archived_at, a);
    }
    return [...by.values()].sort((a, b) => b.at - a.at);
  }
  // at as text: microseconds kept, so it matches exactly when the archive is brought back
  return db()`select archived_at::text as at, count(*)::int as orders, coalesce(sum(total) filter (where status <> 'failed'), 0)::int as revenue,
    min(created_at) as "from", max(created_at) as "to" from orders where archived_at is not null group by archived_at order by archived_at desc limit 50`;
}
// Brings an archive back (at: as archives() gave it)
export async function restoreArchive(at) {
  if (memMode()) { for (const o of mem().orders) if (o.archived_at && String(o.archived_at) === String(at)) o.archived_at = null; return; }
  await db().begin(async sql => {
    await sql`update orders set archived_at = null where archived_at::text = ${String(at)}`;
    await sql`update shifts set archived_at = null where archived_at::text = ${String(at)}`;
    await sql`update shift_reports set archived_at = null where archived_at::text = ${String(at)}`;
  });
}

// MARK: - Telegram messages of an order and reminders
// msgs: [{ chat_id, message_id, staff_id, role: 'waiter' | 'feed' }]
export async function saveMessages(orderId, msgs) {
  if (!msgs.length) return;
  if (memMode()) { const o = memOrder(orderId); if (o) o.messages = [...(o.messages || []), ...msgs]; return; }
  const sql = db();
  await sql`insert into order_messages ${sql(msgs.map(m => ({ order_id: orderId, chat_id: m.chat_id, message_id: m.message_id, staff_id: m.staff_id ?? null, role: m.role })))}
    on conflict (order_id, chat_id) do update set message_id = excluded.message_id`;
}
export async function orderMessages(orderId) {
  if (memMode()) return memOrder(orderId)?.messages || [];
  return db()`select chat_id, message_id, staff_id, role from order_messages where order_id = ${orderId}`;
}

// New orders waiting longer than `minutes` × (reminders already sent + 1), while fewer than `times` were sent
export async function dueReminders(minutes, times) {
  if (memMode()) return mem().orders.filter(o => o.status === 'new' && (o.reminders || 0) < times && Date.now() - o.created_at > minutes * 60e3 * ((o.reminders || 0) + 1));
  return db()`select * from orders where status = 'new' and reminders < ${times}
    and created_at < now() - make_interval(secs => ${minutes * 60} * (reminders + 1)) and created_at > now() - interval '3 hours'`;
}
// Claims the next reminder of an order (null if another process already sent it)
export async function claimReminder(id, sent) {
  if (memMode()) { const o = memOrder(id); if (!o || (o.reminders || 0) !== sent) return null; o.reminders = sent + 1; o.reminded_at = Date.now(); return o; }
  const [o] = await db()`update orders set reminders = reminders + 1, reminded_at = now() where id = ${id} and reminders = ${sent} and status = 'new' returning *`;
  return o || null;
}
