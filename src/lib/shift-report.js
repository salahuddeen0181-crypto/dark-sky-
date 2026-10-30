import 'server-only';
import { db } from './db';
import { memMode } from './order-store';
import { report, shiftKey, shiftOf, shiftStart } from './stats';
import { fmtPrice } from './money';
import { tg, tgReady, staffChatId, esc } from './telegram';

// Report of a working day (06:00 → 06:00 venue time) for the owners: sent to their Telegram group (TELEGRAM_CHAT_ID,
// where every order already goes) when the last waiter ends the shift, or at 06:00 if nobody did; kept in
// shift_reports for the admin. A later order makes the kept report out of date, and the 06:00 check sends it again.
const DAY = 864e5, CATCH_UP_H = 3; // the 06:00 check runs during the first hours of the new day only
const tz = () => process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires';
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz() });
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const dayLabel = day => `${day.slice(8, 10)}.${day.slice(5, 7)} (${WD[new Date(day + 'T12:00:00Z').getUTCDay()]})`;
const mins = v => (v == null ? '—' : v < 1 ? '&lt;1 мин' : Math.round(v) + ' мин');
const pct = v => Math.round(v * 100) + '%';
const delta = (a, b) => (!b ? '' : ` <i>(${a >= b ? '↑' : '↓'}${Math.abs(Math.round(((a - b) / b) * 100))}% к прошлой смене)</i>`);

export const currentDay = (now = Date.now()) => shiftKey(now);

// First and last order of the day (archived and failed ones left out)
async function span(day) {
  const start = new Date(shiftOf(day)), end = new Date(shiftOf(day) + DAY);
  const [r] = await db()`select min(created_at) as first, max(created_at) as last, count(*)::int as n,
    count(*) filter (where status in ('new', 'accepted'))::int as open from orders
    where archived_at is null and status <> 'failed' and created_at >= ${start} and created_at < ${end}`;
  return r;
}

// { text (Telegram HTML), data, last, n } — n = 0: no orders that day
export async function buildReport(day) {
  const [r, s] = await Promise.all([report({ from: day, to: day }), span(day)]);
  const { now, prev } = r, L = [];
  L.push(`📊 <b>Отчёт за смену ${dayLabel(day)}</b>`);
  if (s.first) L.push(`Заказы с ${hhmm(s.first)} до ${hhmm(s.last)}`);
  L.push('', `💰 Выручка: <b>${fmtPrice(now.revenue)}</b>${delta(now.revenue, prev.revenue)}`);
  L.push(`🧾 Заказов: <b>${now.orders}</b> · средний чек ${fmtPrice(now.avg)} · позиций ${now.items}`);
  if (now.orders) L.push(`💵 Наличными: ${pct(r.pay.cashShare)} заказов${r.pay.discount ? ` · скидки ${fmtPrice(r.pay.discount)}` : ''}`);
  if (r.items.length) { L.push('', '<b>Топ позиций</b>'); r.items.slice(0, 5).forEach((it, i) => L.push(`${i + 1}. ${esc(it.name)} — ${it.qty} шт · ${fmtPrice(it.revenue)}`)); }
  if (r.cats.length) { L.push('', '<b>По категориям</b>'); r.cats.slice(0, 6).forEach(c => L.push(`${esc(c.name)} — ${fmtPrice(c.revenue)} (${pct(c.share)})`)); }
  if (r.waiters.length) { L.push('', '<b>Официанты</b>'); r.waiters.forEach(w => L.push(`${esc(w.name)} — ${w.orders} зак. · ${fmtPrice(w.revenue)}${w.accept != null ? ` · одобряет за ${mins(w.accept)}` : ''}`)); }
  if (r.speed.accept != null) L.push('', `⏱ Одобрение ${mins(r.speed.accept)} · подача ${mins(r.speed.serve)} · весь заказ ${mins(r.speed.total)}`);
  if (s.open) L.push(`⚠️ Не закрыто заказов: ${s.open}`);
  const data = { revenue: now.revenue, orders: now.orders, avg: now.avg, items: now.items, prev: prev.revenue, first: s.first, last: s.last };
  return { text: L.join('\n'), data, last: s.last, n: s.n };
}

// Saves the day's report and sends it to the owners' group (if set up). claim: only when no report was sent yet or a
// later order came after it — one send even with several server processes. Returns the saved report or null.
export async function saveReport(day, { send = true, claim = false } = {}) {
  if (memMode()) return null;
  const b = await buildReport(day);
  if (!b.n) return null;
  const to = send && tgReady() ? staffChatId() : '', sql = db();
  const [row] = claim
    ? await sql`insert into shift_reports (day, text, data, last_order, sent_at) values (${day}, ${b.text}, ${sql.json(b.data)}, ${b.last}, ${to ? new Date() : null})
        on conflict (day) do update set text = excluded.text, data = excluded.data, last_order = excluded.last_order, sent_at = excluded.sent_at, created_at = now(), archived_at = null
        where shift_reports.sent_at is null or shift_reports.last_order < excluded.last_order or shift_reports.archived_at is not null returning *`
    : await sql`insert into shift_reports (day, text, data, last_order, sent_at) values (${day}, ${b.text}, ${sql.json(b.data)}, ${b.last}, ${to ? new Date() : null})
        on conflict (day) do update set text = excluded.text, data = excluded.data, last_order = excluded.last_order,
          sent_at = coalesce(excluded.sent_at, shift_reports.sent_at), created_at = now(), archived_at = null returning *`;
  if (row && to) await tg('sendMessage', { chat_id: to, text: b.text, parse_mode: 'HTML' }).catch(e => console.error('shift report send', e.message));
  return row || null;
}

// The last waiter ended the shift that started at `startedAt`: the report of that working day
export const shiftEnded = startedAt => saveReport(shiftKey(+new Date(startedAt)));

// Every tick (src/lib/reminders.js): in the first hours after 06:00, the day that just ended gets its report if it
// had orders and none was sent after the last one (nobody ended the shift, or orders came after they did).
export async function catchUp(now = Date.now()) {
  if (memMode()) return;
  const start = shiftStart(now);
  if (now - start > CATCH_UP_H * 3600e3) return;
  const day = shiftKey(start - 1), from = new Date(shiftOf(day)), until = new Date(start);
  const [r] = await db()`select
    (select max(created_at) from orders where archived_at is null and status <> 'failed' and created_at >= ${from} and created_at < ${until}) as last,
    (select last_order from shift_reports where day = ${day} and sent_at is not null and archived_at is null) as sent`;
  if (!r.last || (r.sent && +new Date(r.sent) >= +new Date(r.last))) return;
  await saveReport(day, { claim: true });
}

// Reports kept for the admin, newest first
export async function listReports(limit = 60) {
  if (memMode()) return [];
  return db()`select day::text as day, text, data, sent_at, created_at from shift_reports where archived_at is null order by day desc limit ${limit}`;
}
