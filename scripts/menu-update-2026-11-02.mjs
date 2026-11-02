// One-off, as in src/lib/darksky-data.js: Dark Roll joins the hot rolls, with its own clip (roll-dark). Skipped if a
// dish with this id is already there. --dry prints what would change.
//
//   DATABASE_URL=... node scripts/menu-update-2026-11-02.mjs [--dry]
import postgres from 'postgres';
import { ITEMS, MEDIA } from '../src/lib/darksky-data.js';

const DRY = process.argv.includes('--dry');
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /[?&]sslmode=disable\b/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

const { id, cat, ...data } = ITEMS.find(i => i.id === 'dark-roll');
const [had] = await sql`select id from menu_items where id = ${id}`;
if (had) console.log(`${id}: already there, left as it is`);
else {
  const [{ next }] = await sql`select coalesce(max(sort), 0) + 10 as next from menu_items where cat = ${cat}`;
  console.log(`${id}: added to ${cat}${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`insert into menu_items (id, cat, sort, hidden, data) values (${id}, ${cat}, ${next}, false, ${sql.json({ ...data, media: MEDIA[id] })})`;
}
await sql.end();
