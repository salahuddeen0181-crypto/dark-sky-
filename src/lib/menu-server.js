import 'server-only';
import { db } from './db';
import * as D from './darksky-data';

const hasDb = () => !!process.env.DATABASE_URL;

// Item as the menu component expects it: { id, cat, name, d, m, p, v, t, str, hit, new, pair, img, media, hidden }
const toItem = r => ({ ...r.data, id: r.id, cat: r.cat, hidden: r.hidden, sort: r.sort });

export async function getMenuItems({ includeHidden = false } = {}) {
  if (!hasDb()) return D.ITEMS; // preview without a database: the bundled menu, read-only
  const sql = db();
  const rows = includeHidden
    ? await sql`select id, cat, sort, hidden, data from menu_items order by sort, id`
    : await sql`select id, cat, sort, hidden, data from menu_items where not hidden order by sort, id`;
  return rows.map(toItem);
}

export async function getMenuItem(id) {
  const [r] = await db()`select id, cat, sort, hidden, data from menu_items where id = ${id}`;
  return r ? toItem(r) : null;
}

export async function getTableByToken(token) {
  if (!hasDb() || !token) return null;
  const [t] = await db()`select id, number, token from tables where token = ${token} and active`;
  return t || null;
}
