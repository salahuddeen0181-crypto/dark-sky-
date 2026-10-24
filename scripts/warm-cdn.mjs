// Warms the Cloudflare cache next to you with every clip and picture of the menu, so the first guests after a deploy
// get them from Buenos Aires instead of the server in Finland. Run from Argentina (it warms the nearest Cloudflare
// location). After re-encoding clips purge the cache first (Cloudflare → Caching → Purge Everything), then run this.
//
//   node scripts/warm-cdn.mjs [https://darkskymenu.com]
import fs from 'node:fs';
import path from 'node:path';

const SITE = (process.argv[2] || 'https://darkskymenu.com').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [];
for (const dir of ['media', 'media/cut']) {
  for (const f of fs.readdirSync(path.join(ROOT, 'public', dir))) if (/\.(webp|webm|mov|png|jpg)$/.test(f)) files.push(`/${dir}/${f}`);
}

const stat = { HIT: 0, MISS: 0, other: 0 }, t0 = Date.now();
let colo = '';
async function one(p) {
  const r = await fetch(SITE + p, { headers: { 'user-agent': 'darksky-warm-cdn' } }).catch(() => null);
  if (!r) { stat.other++; return; }
  await r.arrayBuffer();
  const s = r.headers.get('cf-cache-status') || 'none';
  colo ||= (r.headers.get('cf-ray') || '').split('-')[1] || '';
  stat[s in stat ? s : 'other']++;
}
const queue = [...files];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`${files.length} files via ${colo || '?'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · already cached ${stat.HIT} · now cached ${stat.MISS} · other ${stat.other}`);
