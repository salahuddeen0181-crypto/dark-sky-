// One-off, as in src/lib/darksky-data.js: Philadelphia gets its own clip (roll-philadelphia) instead of the plate photo.
// Only if the dish still has the old bundled value — a photo chosen in the admin stays. --dry prints what would change.
//
//   DATABASE_URL=... node scripts/menu-update-2026-10-28b.mjs [--dry]
import postgres from 'postgres';

const DRY = process.argv.includes('--dry');
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /[?&]sslmode=disable\b/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

const [id, from, to] = ['phila', '/media/cut/phila.webp', '/media/roll-philadelphia.webm#t=0.04'];
const [m] = await sql`select data->>'media' as media, data->>'img' as img from menu_items where id = ${id}`;
if (!m || m.media !== from || m.img) console.log(`${id}: media is ${m ? m.media || m.img : 'missing'}, left as it is`);
else {
  console.log(`${id}: ${from} → ${to}${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`update menu_items set data = data || ${sql.json({ media: to })}, updated_at = now() where id = ${id}`;
}
await sql.end();
