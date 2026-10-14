// Creates the schema, seeds the menu from src/lib/darksky-data.js (only into an empty menu)
// and creates tables 1..N with random QR tokens (only if there are none).
//
//   DATABASE_URL=... node scripts/setup-db.mjs [--tables 20]
//
// Runs automatically before every `npm run build` (with --if-env: skipped when DATABASE_URL is not set),
// so on Vercel the database is prepared by the first deploy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argTables = process.argv.indexOf('--tables');
const N = argTables > 0 ? +process.argv[argTables + 1] : 20;

const url = process.env.DATABASE_URL;
if (!url) {
  if (process.argv.includes('--if-env')) { console.log('db:setup skipped (no DATABASE_URL)'); process.exit(0); }
  console.error('Set DATABASE_URL first'); process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

// darksky-data.js is an ES module inside a CommonJS package: load a copy as .mjs.
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'darksky-')), 'data.mjs');
fs.copyFileSync(path.join(ROOT, 'src/lib/darksky-data.js'), tmp);
const D = await import(pathToFileURL(tmp).href);

await sql.unsafe(fs.readFileSync(path.join(ROOT, 'db/schema.sql'), 'utf8'));
console.log('schema ok');

const [{ count: items }] = await sql`select count(*)::int as count from menu_items`;
if (items === 0) {
  const rows = D.ITEMS.map((it, i) => {
    const { id, cat, ...data } = it;
    const media = (D.MEDIA || {})[id];
    if (media) data.media = media;
    return { id, cat, sort: i * 10, data };
  });
  for (const r of rows) await sql`insert into menu_items (id, cat, sort, data) values (${r.id}, ${r.cat}, ${r.sort}, ${sql.json(r.data)})`;
  console.log(`menu: ${rows.length} items seeded`);
} else console.log(`menu: ${items} items already there, not touched`);

const [{ count: tables }] = await sql`select count(*)::int as count from tables`;
if (tables === 0) {
  for (let n = 1; n <= N; n++) await sql`insert into tables (number, token) values (${n}, ${crypto.randomBytes(5).toString('base64url')})`;
  console.log(`tables: 1..${N} created`);
} else console.log(`tables: ${tables} already there, not touched`);

await sql.end();
