import 'server-only';
import { db } from './db';
import * as D from './darksky-data';
import { findTable } from './order-store';
import { cached } from './menu-cache';

const hasDb = () => !!process.env.DATABASE_URL;

// Item as the menu component expects it: { id, cat, name, nm, d, m, p, v, t, str, hit, new, pair, img, media, hidden }
const toItem = r => localize({ ...r.data, id: r.id, cat: r.cat, hidden: r.hidden, sort: r.sort });

// Texts still matching the bundled menu (same Spanish) are filled with its translations for any language the
// admin left empty; whatever the admin typed always wins.
const BASE = Object.fromEntries(D.ITEMS.map(i => [i.id, i]));
const same = (x, y) => !!x && !!y && typeof x === 'object' && typeof y === 'object' && x.es === y.es;
function localize(it) {
  const b = BASE[it.id];
  if (!b) return it;
  const out = { ...it };
  if (b.nm && it.name === b.name) out.nm = { ...b.nm, ...it.nm }; // what the admin typed wins over the bundled text
  if (same(it.d, b.d)) out.d = { ...b.d, ...it.d };
  if (same(it.m, b.m)) out.m = { ...b.m, ...it.m };
  if (it.v && b.v) out.v = it.v.map((x, i) => (same(x.n, b.v[i]?.n) ? { ...x, n: { ...b.v[i].n, ...x.n } } : x));
  return out;
}

export async function getMenuItems({ includeHidden = false } = {}) {
  if (!hasDb()) return D.ITEMS.map(it => (D.MEDIA[it.id] ? { ...it, media: D.MEDIA[it.id] } : it)); // preview without a database: the bundled menu, read-only
  const sql = db();
  return cached(includeHidden ? 'items:all' : 'items', async () => (includeHidden
    ? await sql`select id, cat, sort, hidden, data from menu_items order by sort, id`
    : await sql`select id, cat, sort, hidden, data from menu_items where not hidden order by sort, id`).map(toItem));
}

export async function getMenuItem(id) {
  const [r] = await db()`select id, cat, sort, hidden, data from menu_items where id = ${id}`;
  return r ? toItem(r) : null;
}

// Without a database the demo tables /t/demo-1 … /t/demo-20 take orders into server memory (see order-store).
export async function getTableByToken(token) {
  return token ? findTable(token) : null;
}
