// Seamless smoke texture for the product media boxes: public/media/smoke.webp (white wisps on transparent).
//   FFMPEG=/path/to/ffmpeg node scripts/make-smoke.mjs
// Periodic value noise + domain warping, so the tile repeats without seams and can drift endlessly in CSS.
import { spawn } from 'node:child_process';
import path from 'node:path';

const FF = process.env.FFMPEG || 'ffmpeg';
const S = 512, OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'media', 'smoke.webp');

const rnd = new Float32Array(256 * 256);
let seed = 7; for (let i = 0; i < rnd.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; rnd[i] = seed / 4294967296; }
// value noise with a lattice of `p` cells per tile, wrapping at the tile edge
function noise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), w = i => ((i % p) + p) % p;
  const v = (i, j) => rnd[(w(j) * 256 + w(i)) & 65535];
  const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(u, v, base = 4) { // u, v in tile units [0, 1)
  let s = 0, amp = .5, p = base;
  for (let o = 0; o < 5; o++) { s += amp * noise(u * p, v * p, p); p *= 2; amp *= .5; }
  return s;
}

const px = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const u = x / S, v = y / S;
  const qx = fbm(u, v), qy = fbm(u + .31, v + .57);
  const f = fbm(u + .35 * qx, v + .35 * qy + .1 * Math.sin(6.2832 * u));
  const t = Math.min(1, Math.max(0, (f - .42) / .38)), a = t * t * (3 - 2 * t);
  const o = (y * S + x) * 4;
  px[o] = 222; px[o + 1] = 224; px[o + 2] = 232; px[o + 3] = Math.round(a * 200);
}

const p = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${S}x${S}`, '-i', '-',
  '-c:v', 'libwebp', '-quality', '70', '-alpha_quality', '60', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
p.stdin.end(px);
p.on('close', c => { if (c) process.exit(c); console.log('wrote', OUT); });
