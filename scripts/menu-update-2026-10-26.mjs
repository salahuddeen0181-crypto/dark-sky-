// One-off update of a menu already in the database to the 2026-10-26 edits in src/lib/darksky-data.js:
// new descriptions (all languages), the dessert toppings, the clips' covers, three cocktails off the menu.
// Only the listed fields of the listed dishes change; prices, names and photos set in the admin stay.
// Safe to run again. --dry prints what would change and touches nothing.
//
//   DATABASE_URL=... node scripts/menu-update-2026-10-26.mjs [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DRY = process.argv.includes('--dry');
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /[?&]sslmode=disable\b/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

// the bundled menu, loaded the way scripts/setup-db.mjs does
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'darksky-')), 'data.mjs');
fs.copyFileSync(path.join(ROOT, 'src/lib/darksky-data.js'), tmp);
fs.copyFileSync(path.join(ROOT, 'src/lib/darksky-i18n.mjs'), path.join(path.dirname(tmp), 'darksky-i18n.mjs'));
const D = await import(pathToFileURL(tmp).href);
const B = Object.fromEntries(D.ITEMS.map(i => [i.id, i]));

const TEXTS = ['falafel', 'phila-ebi', 'phila', 'newyork', 'maki', 'aburi', 'kanikama', 'unagi', 'horno', 'tempura', 'tempura-teri',
  'wok-rice', 'griega', 'cl0', 'cl1', 'cl10', 'cl13', 'cl14', 'cl15', 'cl17', 'cl22', 'sg1', 'sg3'];
const TOPPINGS = ['trufa', 'brownie', 'noche', 'cinnabon'];
const GONE = ['cl18', 'cl20', 'cl21']; // Mint Julep, Hanky Panky, Gimlet
// jsonb keeps its own key order, so compare with the keys sorted
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));
const isClip = m => typeof m === 'string' && /^\/media\/[^/]+\.webm#t=/.test(m);

const rows = await sql`select id, hidden, data from menu_items`;
let changed = 0;
for (const r of rows) {
  const b = B[r.id], patch = {};
  if (TEXTS.includes(r.id) && canon(r.data.d) !== canon(b.d)) patch.d = b.d;
  if (TOPPINGS.includes(r.id) && canon(r.data.opt) !== canon(b.opt)) patch.opt = b.opt;
  // a bundled clip still in place (not a photo from the admin) → the clip starting on its cover, or the Ebi Ponzu photo
  const m = D.MEDIA[r.id];
  if (m && isClip(r.data.media) && r.data.media !== m) patch.media = m;
  const hide = GONE.includes(r.id) && !r.hidden;
  if (!Object.keys(patch).length && !hide) continue;
  changed++;
  console.log(`${r.id.padEnd(14)} ${[...Object.keys(patch), hide ? 'hidden' : ''].filter(Boolean).join(', ')}${patch.media ? '  ' + r.data.media + ' → ' + patch.media : ''}`);
  if (DRY) continue;
  if (Object.keys(patch).length) await sql`update menu_items set data = data || ${sql.json(patch)}, updated_at = now() where id = ${r.id}`;
  if (hide) await sql`update menu_items set hidden = true, updated_at = now() where id = ${r.id}`;
}
console.log(`${changed} dishes ${DRY ? 'would change (dry run)' : 'updated'}`);
await sql.end();
