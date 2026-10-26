// After re-encoding clips (scripts/key-videos.mjs) or changing MEDIA in src/lib/darksky-data.js: points the dishes in
// the database at the new entries. Only dishes still showing a bundled clip change — photos set in the admin stay.
// --dry prints what would change.
//
//   DATABASE_URL=... node scripts/sync-media.mjs [--dry]
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

const isClip = m => typeof m === 'string' && /^\/media\/[^/]+\.webm#t=/.test(m);
let n = 0;
for (const r of await sql`select id, data from menu_items`) {
  const m = D.MEDIA[r.id];
  if (!m || !isClip(r.data.media) || r.data.media === m) continue;
  n++;
  console.log(`${r.id.padEnd(14)} ${r.data.media} → ${m}`);
  if (!DRY) await sql`update menu_items set data = data || ${sql.json({ media: m })}, updated_at = now() where id = ${r.id}`;
}
console.log(`${n} dishes ${DRY ? 'would change (dry run)' : 'updated'}`);
await sql.end();
