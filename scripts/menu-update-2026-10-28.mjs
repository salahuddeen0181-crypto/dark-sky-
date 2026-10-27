// One-off: Roll al horno moves from Rolls to Hot rolls (last in its new list), as in src/lib/darksky-data.js.
// Only if it is still in Rolls — a later choice made in the admin stays. --dry prints what would change.
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
await sql.end();
