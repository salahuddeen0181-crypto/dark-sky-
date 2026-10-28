import 'server-only';
import * as S from './order-store';
import { getMenuItems } from './menu-server';
import * as D from './darksky-data';
import { shiftsSince, onShift } from './staff';
import { tableName } from './table-name';

// Order statistics for the admin. A lounge night runs past midnight, so a "day" is a shift: 06:00 → 06:00 venue time.
const TZ = () => process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires';
const SHIFT_START = 6, DAY = 864e5;
export const PERIODS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// MARK: - Venue time
function parts(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) };
}
// Venue clock offset from UTC at time t (handles a timezone without DST as well as one with it)
const offset = t => { const p = parts(t), m = new Date(t).getUTCMinutes(); return Date.UTC(p.y, p.m - 1, p.d, p.h, m) - Math.floor(t / 60e3) * 60e3; };
// Start of the shift that contains t
export function shiftStart(t) {
  const local = t + offset(t), l = new Date(local - SHIFT_START * 3600e3);
  const startLocal = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), SHIFT_START);
  return startLocal - offset(startLocal);
}
export const shiftKey = t => new Date(shiftStart(t) + offset(shiftStart(t))).toISOString().slice(0, 10);
// 'YYYY-MM-DD' → when that day's shift starts (06:00 venue time)
export function shiftOf(day) {
  const [y, m, d] = day.split('-').map(Number), local = Date.UTC(y, m - 1, d, SHIFT_START);
  return local - offset(local);
}
export const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const MAX_DAYS = 366;

// MARK: - Helpers
const ms = d => (d == null ? null : +new Date(d));
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
const sum = (a, f) => a.reduce((x, o) => x + f(o), 0);
const top = (map, n, by) => [...map.values()].sort((a, b) => b[by] - a[by]).slice(0, n);
const bump = (map, key, init, f) => { const v = map.get(key) || { ...init }; f(v); map.set(key, v); };

function kpis(list) {
  const revenue = sum(list, o => o.total);
  return { revenue, orders: list.length, avg: list.length ? revenue / list.length : 0, items: sum(list, o => sum(o.lines, l => l.qty)) };
}

// MARK: - Report
// period: one of PERIODS, or { from, to } — days 'YYYY-MM-DD' picked by hand (both included)
export async function report(period = '7d') {
  const now = Date.now(), custom = typeof period === 'object';
  let start, end;
  if (custom) {
    const [a, b] = [period.from, period.to].sort();
    start = shiftOf(a); end = Math.min(shiftOf(b) + DAY, start + MAX_DAYS * DAY);
  } else {
    end = shiftStart(now) + DAY; start = end - (PERIODS[period] || 7) * DAY;
  }
  const n = Math.max(1, Math.round((end - start) / DAY)), prevStart = start - n * DAY, upTo = Math.min(end, now);
  const [rows, menu, shifts, nowOn] = await Promise.all([S.ordersSince(new Date(prevStart)), getMenuItems({ includeHidden: true }), shiftsSince(new Date(start)), onShift()]);
  const valid = rows.filter(o => o.status !== 'failed');
  const cur = valid.filter(o => ms(o.created_at) >= start && ms(o.created_at) < end), prev = valid.filter(o => ms(o.created_at) < start);
  const catOf = Object.fromEntries(menu.map(i => [i.id, i.cat]));
  const catName = id => (D.CATS.find(c => c.id === id)?.n.ru) || id;

  // revenue per shift (oldest first) and load per hour / weekday
  const days = Array.from({ length: n }, (_, i) => ({ key: shiftKey(start + i * DAY + 12 * 3600e3), revenue: 0, orders: 0 }));
  const dayIdx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  const hours = Array.from({ length: 24 }, (_, i) => ({ h: (SHIFT_START + i) % 24, orders: 0 }));
  const weekdays = WEEKDAYS.map(label => ({ label, orders: 0 }));
  const items = new Map(), cats = new Map(), tables = new Map(), waiters = new Map();
  const toAccept = [], toServe = [], total = [];

  for (const o of cur) {
    const t = ms(o.created_at), p = parts(t);
    const d = days[dayIdx[shiftKey(t)]];
    if (d) { d.revenue += o.total; d.orders++; }
    hours[(p.h - SHIFT_START + 24) % 24].orders++;
    weekdays[parts(shiftStart(t) + 12 * 3600e3).wd].orders++;
    for (const l of o.lines) {
      bump(items, l.id + ':' + (l.variant || ''), { name: l.name + (l.variant ? ' · ' + l.variant : ''), qty: 0, revenue: 0 }, v => { v.qty += l.qty; v.revenue += l.total || 0; });
      const c = catOf[l.id] || 'other';
      bump(cats, c, { name: catName(c), revenue: 0, qty: 0 }, v => { v.revenue += l.total || 0; v.qty += l.qty; });
    }
    bump(tables, o.table_label || o.table_number, { name: tableName(o), orders: 0, revenue: 0 }, v => { v.orders++; v.revenue += o.total; });
    const acc = ms(o.accepted_at), srv = ms(o.served_at);
    if (acc) toAccept.push((acc - t) / 60e3);
    if (acc && srv) toServe.push((srv - acc) / 60e3);
    if (srv) total.push((srv - t) / 60e3);
    // by waiter account (Telegram); orders from before accounts existed — by the typed name
    if (o.accepted_by) bump(waiters, o.accepted_by_id ? 'id' + o.accepted_by_id : 'n' + o.accepted_by, { id: o.accepted_by_id || null, name: o.accepted_by, orders: 0, revenue: 0, waits: [] }, v => { v.orders++; v.revenue += o.total; if (acc) v.waits.push((acc - t) / 60e3); });
  }

  const k = kpis(cur), catTotal = sum([...cats.values()], c => c.revenue) || 1;
  const open = await S.listOrders();
  return {
    period: custom ? 'custom' : period, n, from: shiftKey(start + 12 * 3600e3), to: shiftKey(end - 12 * 3600e3), now: k, prev: kpis(prev),
    days, hours, weekdays,
    items: top(items, 10, 'qty'),
    cats: top(cats, 20, 'revenue').map(c => ({ ...c, share: c.revenue / catTotal })),
    tables: top(tables, 10, 'revenue'),
    speed: { accept: median(toAccept), serve: median(toServe), total: median(total), late: toAccept.length ? toAccept.filter(m => m > 5).length / toAccept.length : null },
    waiters: top(waiters, 20, 'orders').map(({ waits, ...w }) => {
      // hours on shift inside the period
      const h = w.id ? sum(shifts.filter(x => x.staff_id === w.id), x => Math.max(0, Math.min(upTo, ms(x.ended_at) ?? now) - Math.max(start, ms(x.started_at))) / 3600e3) : null;
      return { ...w, accept: median(waits), hours: h, perHour: h ? w.orders / h : null };
    }),
    onShift: nowOn.map(x => ({ name: x.name, since: x.started_at })),
    pay: {
      cashShare: cur.length ? cur.filter(o => o.cash).length / cur.length : 0, discount: sum(cur, o => o.discount),
      editedShare: cur.length ? cur.filter(o => o.edited_at).length / cur.length : 0, noteShare: cur.length ? cur.filter(o => o.note).length / cur.length : 0,
    },
    open: { fresh: open.filter(o => o.status === 'new').length, accepted: open.filter(o => o.status === 'accepted').length },
  };
}
