// One-off, as in src/lib/darksky-data.js: Roll al horno moves from Rolls to Hot rolls (last in its new list);
// Philadelphia and Ebi Ponzu swap media — the roll-phila clip is really Ebi Ponzu, Philadelphia gets the plate photo.
// Each only if the dish still has the old bundled value — a later choice made in the admin stays.
// --dry prints what would change.
//
//   DATABASE_URL=... node scripts/menu-update-2026-10-28.mjs [--dry]
import postgres from 'postgres';

const DRY = process.argv.includes('--dry');
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /[?&]sslmode=disable\b/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

const [r] = await sql`select id, cat from menu_items where id = 'horno'`;
if (!r || r.cat !== 'rolls') console.log(`horno: ${r ? 'already in ' + r.cat : 'not found'}, nothing to do`);
else if (DRY) console.log('horno: rolls → hotrolls (dry run)');
else {
  await sql`update menu_items set cat = 'hotrolls', updated_at = now(),
    sort = (select coalesce(max(sort), 0) + 10 from menu_items where cat = 'hotrolls') where id = 'horno'`;
  console.log('horno: rolls → hotrolls');
}
// media: [dish, old bundled value, new]
const SWAP = [['phila-ebi', '/media/cut/phila-ebi.webp', '/media/roll-phila.webm#t=1.08'], ['phila', '/media/roll-phila.webm#t=1.08', '/media/cut/phila.webp']];
for (const [id, from, to] of SWAP) {
  const [m] = await sql`select data->>'media' as media from menu_items where id = ${id}`;
  if (!m || m.media !== from) { console.log(`${id}: media is ${m ? m.media : 'missing'}, left as it is`); continue; }
  console.log(`${id}: ${from} → ${to}${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`update menu_items set data = data || ${sql.json({ media: to })}, updated_at = now() where id = ${id}`;
}
await sql.end();
