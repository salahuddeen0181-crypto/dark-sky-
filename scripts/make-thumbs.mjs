// Small copies of the product pictures for the places that show them small (menu rows, mini cards, small tiles):
// public/media/<clip>.webp → <clip>-th.webp and public/media/cut/<name>.webp → <name>-th.webp, 320 px tall, alpha kept.
// Run after scripts/key-videos.mjs or after adding cut-out photos.
//
//   FFMPEG=/path/to/ffmpeg node scripts/make-thumbs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FF = process.env.FFMPEG || 'ffmpeg';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const H = 320;
let made = 0, before = 0, after = 0;
for (const dir of ['public/media', 'public/media/cut']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith('.webp') || f.endsWith('-th.webp') || f === 'smoke.webp') continue;
    const src = path.join(ROOT, dir, f), out = src.replace(/\.webp$/, '-th.webp');
    const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', `scale=-2:'min(${H},ih)':flags=lanczos`,
      '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '80', '-alpha_quality', '85', out]);
    if (r.status) { console.error(f, String(r.stderr)); continue; }
    made++; before += fs.statSync(src).size; after += fs.statSync(out).size;
  }
}
console.log(`${made} thumbnails · ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
