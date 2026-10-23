// Cuts the green screen out of the product videos and encodes them for the menu.
//
//   FFMPEG=/path/to/ffmpeg node scripts/key-videos.mjs ~/Desktop/darksky [slug ...]
//
// For every source in CLIPS it writes to public/media/:
//   <slug>.webm / <slug>.mov        480×854 — VP9 + alpha (Chrome, Firefox, Android) / HEVC + alpha (Safari, iOS)
//   <slug>-sm.webm / <slug>-sm.mov  240×426 for the small cards
//   <slug>.webp                     still of the fullest frame, shown until the video plays
// and prints the MEDIA entry: '/media/<slug>.webm#t=<still time>' — the video starts on that frame, so the swap
// from still to video does not jump (most clips begin empty and assemble the dish).
// The ffmpeg build needs libvpx-vp9, libwebp and hevc_videotoolbox (macOS), e.g. the one in ffmpeg-static.
//
// Keying is by hue rather than ffmpeg's chromakey: the screens are a bluish green, while the food greens
// (lettuce, pistachio, mint, wasabi) lean yellow — a plain chroma key cuts those out and despills them brown.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FF = process.env.FFMPEG || 'ffmpeg';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'media');
const W = 480, H = 854, FPS = 24;

// source file name prefix → output slug
// Per-clip tweaks: sat lowers the saturation a colour needs to count as screen (greenish smoke), smoke also drops
// bright colourless patches (dense smoke), shadow scales the soft shadow kept in the dark parts of the screen,
// feather fades everything out towards the frame edges (share of width / height) so nothing ends on a hard cut,
// shadow: 'black' keeps only near-black pixels instead of every shaded patch of the screen; lift brightens what is
// left of the screen colour (the shaded folds of smoke) to at least this grey, so they read as haze, not dirt.
const OPTS = { hookah: { feather: [.2, .14] }, 'tea-tropic': { feather: [.12, .12], sat: 1.7 }, cash: { feather: [.14, .1] } };
const CLIPS = {
  'Chicken_teriyaki_sushi_roll': 'roll-horno',
  'Chocolate_brownie': 'brownie',
  'Cinnamon_roll_with_pistachios': 'cinnabon',
  'Cocktail_in_glass_with_ice': 'cocktail-amber',
  'Noodles_and_chicken': 'udon',
  'Pistachio_mousse_cakes': 'pistachio-mousse',
  'Rice_and_chicken': 'wok-rice',
  'Salad_ingredients_assembling': 'salad-cesar',
  'Sushi_roll_deconstruction': 'roll-tempura',
  'Sushi_roll_parts_assembling': 'roll-phila-ebi',
  'Sushi_roll_product_video_animation': 'roll-phila',
  'Sushi_rolls_exploding': 'roll-aburi',
  'Whiskey_glass_rotating': 'whiskey',
  '431395703_': 'langostinos',
  '672352061_': 'jerky',
  '70146107_': 'falafel',
  '727426802_': 'hookah',
  '911567715_': 'salad-greek',
  '99967788_': 'roll-maki',
  '454906225_': 'panqueques',
  'Glass_french_press_brewing': 'tea-tropic',
  'Passion_fruit_lemonade_in_pitcher': 'passion-lemonade',
  'Kanikama_sushi_roll': 'roll-kanikama',
  'Sushi_roll_assembling_on_plate': 'roll-newyork',
  'Unagi_sushi_roll': 'roll-unagi',
  'US_dollar_bills_fluttering': 'cash',
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return [0, 0, mx / 255];
  let h = mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d;
  h *= 60; if (h < 0) h += 360;
  return [h, d / mx, mx / 255];
}

// The screen colour: the most common saturated green hue along the frame border.
function sampleKey(px) {
  const bins = new Float64Array(360), sats = [];
  const take = (x, y) => {
    const i = (y * W + x) * 3, [h, s, v] = hsv(px[i], px[i + 1], px[i + 2]);
    if (s > .25 && v > .12 && h > 70 && h < 190) { bins[Math.round(h) % 360]++; sats.push([h, s, v, (.3 * px[i] + .59 * px[i + 1] + .11 * px[i + 2]) / 255]); }
  };
  const m = Math.round(W * .05);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < m; x += 2) { take(x, y); take(W - 1 - x, y); }
  for (let x = 0; x < W; x += 2) for (let y = 0; y < m; y += 2) { take(x, y); take(x, H - 1 - y); }
  let best = 0, hk = 0;
  for (let h = 0; h < 360; h++) { let s = 0; for (let k = -4; k <= 4; k++) s += bins[(h + k + 360) % 360]; if (s > best) { best = s; hk = h; } }
  const near = sats.filter(([h]) => Math.abs(h - hk) < 10), mid = (k, i) => near.map(x => x[i]).sort((a, b) => a - b)[near.length >> 1] ?? k;
  return { hk, sk: mid(.6, 1), vk: mid(.5, 2), lk: mid(.4, 3) };
}

function keyFrame(px, out, alpha, tmp, key, { sat = 1, smoke = false, shadow = 1, feather = null, lift = 0 } = {}) {
  const { hk, sk, vk, lk } = key, n = W * H;
  for (let p = 0; p < n; p++) {
    const i = p * 3, r = px[i], g = px[i + 1], b = px[i + 2];
    const [h, s, v] = hsv(r, g, b);
    let dh = Math.abs(h - hk); if (dh > 180) dh = 360 - dh;
    // in the dark (shadows on the screen, a glossy black plate reflecting it) hue is noisy: widen the tolerance
    const dark = smooth(.15, .65, 1 - v / vk), tol = 1 + dark;
    const st = sat + (1 - sat) * dark; // per-clip saturation tweak applies to the lit screen only, not to dark objects
    let k = (1 - smooth(18 * tol, 34 * tol, dh)) * smooth(.22 * st * sk / tol, .5 * st * sk / tol, s); // screen-like → background
    if (smoke) k = Math.max(k, smooth(.45, .65, v) * (1 - smooth(.12, .3, s)));
    // ...but whatever is darker than the screen stays as a soft black shadow instead of a ragged cut-out
    const sh = shadow === 'black' ? (1 - smooth(.06, .17, v)) * .95 : dark * .8 * shadow;
    tmp[p] = k * (1 - sh);                                    // transparency
    // despill, only for colours close to the screen hue: pull green down, then neutralise what is left
    // (smoke and glass over the screen would otherwise stay cyan)
    const spill = (1 - smooth(25, 50, dh)) * .85, lim = Math.max(r, b), g2 = g > lim ? g - (g - lim) * spill : g;
    const lum = lift && k > .15 ? Math.max(.3 * r + .59 * g2 + .11 * b, lift) : .3 * r + .59 * g2 + .11 * b, ks = lift && k > .15 ? 1 : spill * .8;
    // the shadow part of a pixel is black: straight colour = foreground share / total opacity
    const fg = 1 - k, keep = fg / Math.max(1e-3, fg + k * sh);
    const o = p * 4;
    out[o] = (r + (lum - r) * ks) * keep; out[o + 1] = (g2 + (lum - g2) * ks) * keep; out[o + 2] = (b + (lum - b) * ks) * keep;
  }
  // soften the matte a little (3×3 box) and snap near-solid values, which also helps compression
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += tmp[yy * W + xx]; c++; } }
    let a = 1 - s / c;
    if (feather) a *= smooth(0, feather[0] * W, Math.min(x, W - 1 - x)) * smooth(0, feather[1] * H, Math.min(y, H - 1 - y));
    a = a < .04 ? 0 : a > .96 ? 1 : a;
    alpha[y * W + x] = a;
    const o = (y * W + x) * 4;
    if (!a) out[o] = out[o + 1] = out[o + 2] = 0; // nothing to encode where it is fully transparent
    out[o + 3] = Math.round(a * 255);
  }
}

function run(args, input) {
  return new Promise((res, rej) => {
    const p = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'inherit'] });
    p.on('error', rej); p.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res()));
    if (input) input(p);
  });
}

async function keyClip(src, slug) {
  const tmp = path.join(os.tmpdir(), `key-${slug}-${process.pid}.mkv`);
  const frame = W * H * 3;
  // decode → crop to 9:16 (one clip is landscape) → 540×960 RGB frames on stdout
  const dec = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-i', src, '-vf',
    `crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=${W}:${H}:flags=lanczos,fps=${FPS},format=rgb24`, '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const enc = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'ffv1', '-pix_fmt', 'bgra', tmp], { stdio: ['pipe', 'ignore', 'inherit'] });
  const encDone = new Promise((res, rej) => enc.on('close', c => (c ? rej(new Error('ffv1 encode failed')) : res())));
  const out = Buffer.alloc(W * H * 4), alpha = new Float32Array(W * H), m = new Float32Array(W * H);
  let buf = Buffer.alloc(0), key = null, frames = 0, best = 0, bestCover = -1;
  for await (const chunk of dec.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= frame) {
      const px = buf.subarray(0, frame);
      key ||= sampleKey(px);
      keyFrame(px, out, alpha, m, key, OPTS[slug]);
      let cover = 0; for (let i = 0; i < alpha.length; i += 7) cover += alpha[i];
      if (cover > bestCover * 1.002) { bestCover = cover; best = frames; } // earliest frame of (nearly) full coverage
      if (!enc.stdin.write(Buffer.from(out))) await new Promise(r => enc.stdin.once('drain', r));
      buf = buf.subarray(frame); frames++;
    }
  }
  enc.stdin.end(); await encDone;

  const base = path.join(OUT, slug), t = (best / FPS).toFixed(2);
  const vp9 = (vf, crf, file) => run(['-i', tmp, ...vf, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', crf, '-row-mt', '1',
    '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0', '-g', String(FPS * 2), '-an', file]);
  // Safari and iPhones play only this file: below ~0.75 alpha quality and 1.4 Mbit/s smoke and glass edges turn blocky.
  // Colour is premultiplied by alpha — with straight alpha iOS blends thin smoke into grey, unnatural haze.
  const hevc = (vf, rate, aq, file) => run(['-i', tmp, '-vf', [...vf.slice(1), 'format=rgba', 'premultiply=inplace=1'].join(','), '-c:v', 'hevc_videotoolbox', '-pix_fmt', 'bgra', '-alpha_quality', aq, '-b:v', rate, '-prio_speed', '0',
    '-tag:v', 'hvc1', '-movflags', '+faststart', '-an', file]);
  const small = ['-vf', 'scale=240:-2:flags=lanczos'];
  await Promise.all([
    vp9([], '37', base + '.webm'), hevc([], '1400k', '0.75', base + '.mov'),
    vp9(small, '36', base + '-sm.webm'), hevc(small, '500k', '0.7', base + '-sm.mov'),
    run(['-i', tmp, '-ss', t, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', '-alpha_quality', '90', base + '.webp']),
  ]);
  fs.rmSync(tmp, { force: true });
  const kb = ext => Math.round(fs.statSync(base + ext).size / 1024);
  console.log(`${slug.padEnd(18)} key ${key.hk}° s${key.sk.toFixed(2)}  webm ${kb('.webm')}/${kb('-sm.webm')} KB · mov ${kb('.mov')}/${kb('-sm.mov')} KB · webp ${kb('.webp')} KB  → '/media/${slug}.webm#t=${t}'`);
}

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/key-videos.mjs <folder with the green-screen clips> [slug ...]'); process.exit(1); }
const only = new Set(process.argv.slice(3));
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(dir);
const jobs = Object.entries(CLIPS).filter(([, slug]) => !only.size || only.has(slug)).map(([prefix, slug]) => {
  const f = files.find(n => n.startsWith(prefix));
  if (!f) { console.warn(`missing source for ${slug} (${prefix}…)`); return null; }
  return () => keyClip(path.join(dir, f), slug);
}).filter(Boolean);
// a few at a time: each clip already keeps several encoders busy
const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) await queue.shift()(); }));
