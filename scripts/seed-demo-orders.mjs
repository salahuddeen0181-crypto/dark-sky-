// Fills a LOCAL database with realistic test orders so the admin statistics have something to show.
// Prices and names come from menu_items; every order is marked lang = 'demo'.
//
//   node --env-file=.env.local scripts/seed-demo-orders.mjs [--days 60] [--count 400]
//   node --env-file=.env.local scripts/seed-demo-orders.mjs --clear     # remove the test orders only
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) { console.error('Only for a local database (DATABASE_URL on localhost)'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const DAYS = arg('--days', 60), COUNT = arg('--count', 400);
const sql = postgres(url, { ssl: false, max: 1, onnotice: () => {} });

if (process.argv.includes('--clear')) {
  const r = await sql`delete from orders where lang = 'demo'`;
  console.log(`removed ${r.count} test orders`); await sql.end(); process.exit(0);
}

// MARK: - Weighted picks
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list, w = () => 1) => { const ws = list.map(w), sum = ws.reduce((a, b) => a + b, 0); let r = Math.random() * sum; for (let i = 0; i < list.length; i++) if ((r -= ws[i]) < 0) return list[i]; return list.at(-1); };
// Lounge rhythm: evenings and nights, busier at the weekend (hours in Buenos Aires time, UTC−3)
const HOUR_W = [3, 2, 1, .3, 0, 0, 0, 0, 0, 0, 0, 0, .2, .4, .8, 1, 1.2, 1.6, 2.4, 3.2, 4, 4.4, 4.6, 4];
const DAY_W = [1.3, .6, .7, .8, 1, 1.6, 1.8]; // Sun … Sat
const CAT_W = { hookah: 9, classics: 3, signature: 2.5, tea: 2.5, authortea: 1.5, soft: 2, beer: 1.5, shots: 1.5, wine: .8, sparkling: .4, rolls: 1.6, hotrolls: .6, starters: 1.2, salads: .5, wok: .6, desserts: 1 };
const WAITERS = [['Ана', 1.3], ['Лукас', 1], ['Мартина', 1.1], ['Диего', .7]];
const NOTES = ['Без льда, пожалуйста', 'Кальян полегче', 'Принесите после кальяна', 'Две трубки к кальяну', 'Острый соус отдельно', 'Без лука', 'Счёт сразу, пожалуйста'];
const staffName = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');

const items = (await sql`select id, cat, data from menu_items where not hidden`).filter(r => r.data.p != null || r.data.v);
const byCat = Object.groupBy(items, r => r.cat);
const tables = await sql`select id, number from tables where active order by number`;
if (!tables.length || !items.length) { console.error('Run npm run db:setup first'); process.exit(1); }

function line(r) {
  const vi = r.data.v ? Math.floor(Math.random() * r.data.v.length) : null;
  const price = vi == null ? r.data.p : r.data.v[vi].p;
  const qty = r.cat === 'hookah' ? 1 : pick([1, 2, 3, 4], q => [6, 3, 1, .4][q - 1]);
  return { id: r.id, vi, name: r.data.name, variant: vi == null ? '' : staffName(r.data.v[vi].n), qty, price, total: price * qty };
}

// MARK: - Orders
const now = Date.now(), rows = [];
for (let n = 0; n < COUNT; n++) {
  // a random venue-local day/hour, then back to UTC
  let at;
  do {
    const day = new Date(now - Math.floor(rnd(0, DAYS)) * 864e5);
    const hour = pick([...HOUR_W.keys()], h => HOUR_W[h]);
    at = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour + 3, Math.floor(rnd(0, 60)));
  } while (at > now - 5 * 60e3 || Math.random() > DAY_W[new Date(at - 3 * 3600e3).getUTCDay()] / 1.8);

  const cats = Object.keys(CAT_W).filter(c => byCat[c]);
  const lines = Array.from({ length: pick([1, 2, 3, 4, 5], k => [3, 4, 3, 1.5, .6][k - 1]) }, () => line(pick(byCat[pick(cats, c => CAT_W[c])])));
  let edited = null;
  if (Math.random() < .05 && lines.length > 1) { lines.pop(); edited = at + rnd(2, 10) * 60e3; }
  const cash = Math.random() < .35, subtotal = lines.reduce((a, l) => a + l.total, 0), discount = cash ? Math.round(subtotal * .15) : 0;
  const accepted = at + rnd(.5, 1) * rnd(1, 8) * 60e3, served = accepted + rnd(8, 30) * 60e3;
  const t = pick(tables, x => (x.number <= 8 ? 1.6 : 1));
  rows.push({
    table_id: t.id, table_number: t.number, lines: sql.json(lines), subtotal, discount, total: subtotal - discount, cash, on_request: false, lang: 'demo',
    note: Math.random() < .1 ? pick(NOTES) : null, status: 'served', accepted_by: pick(WAITERS, w => w[1])[0],
    created_at: new Date(at), accepted_at: new Date(accepted), served_at: new Date(served), edited_at: edited && new Date(edited),
  });
}
// A few still open right now, so the "now" block and /staff are not empty
for (const [k, [mins, status]] of [[2, 'new'], [6, 'new'], [14, 'accepted']].entries()) {
  const r = rows[k], at = now - mins * 60e3;
  Object.assign(r, { status, created_at: new Date(at), accepted_at: status === 'accepted' ? new Date(at + 3 * 60e3) : null, served_at: null, accepted_by: status === 'accepted' ? r.accepted_by : null, edited_at: null });
}

for (let i = 0; i < rows.length; i += 100) await sql`insert into orders ${sql(rows.slice(i, i + 100))}`;
const [{ n, rev }] = await sql`select count(*)::int as n, sum(total)::bigint as rev from orders where lang = 'demo'`;
console.log(`${rows.length} test orders added · ${n} in total · revenue $${Number(rev).toLocaleString('es-AR')}`);
await sql.end();
