// Cuts the green screen out of the product videos and encodes them for the menu.
//
//   FFMPEG=/path/to/ffmpeg node scripts/key-videos.mjs ~/Desktop/darksky [slug ...]
//
// For every source in CLIPS it writes to public/media/:
//   <slug>.webm / <slug>.mov        480×854 — VP9 + alpha (Chrome, Firefox, Android) / HEVC + alpha (Safari, iOS)
//   <slug>-sm.webm / <slug>-sm.mov  240×426 for the small cards
//   (wide: true in OPTS — a landscape source kept whole at 854×480 / 426×240 instead of cut down to 9:16)
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
import { sampleKey, keyFrame } from '../src/lib/keying.js';

const FF = process.env.FFMPEG || 'ffmpeg';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'media');
const FPS = 24;
const SIZE = { tall: [480, 854], wide: [854, 480] };

// source file name prefix → output slug
// Per-clip tweaks: sat lowers the saturation a colour needs to count as screen (greenish smoke), smoke also drops
// bright colourless patches (dense smoke), shadow scales the soft shadow kept in the dark parts of the screen,
// feather fades everything out towards the frame edges (share of width / height) so nothing ends on a hard cut,
// shadow: 'black' keeps only near-black pixels instead of every shaded patch of the screen; lift brightens what is
// left of the screen colour (the shaded folds of smoke) to at least this grey, so they read as haze, not dirt.
// feather: fade to transparent near the frame edges (dishes that grow past the frame); shadow > 1 keeps dark, glossy
// plates that reflect the green screen solid instead of see-through
const OPTS = {
  hookah: { feather: [.2, .14] }, 'tea-tropic': { feather: [.12, .12], sat: 1.7 }, cash: { feather: [.14, .1] },
  // only a slight softening where the dish meets the card edge (the menu shows clips zoomed 1.2×)
  udon: { feather: [.1, .07], shadow: 1.25 }, 'wok-rice': { feather: [.1, .07], shadow: 1.25 },
  // filmed landscape with the camera following a wide bowl and the croutons falling at its side: keep the whole frame
  'salad-cesar': { wide: true },
  cosmoflower: { grey: [45, 175] }, 'cuba-libre': { shadow: 1.25 }, 'roll-dark': { shadow: 1.25 }, 'roll-midnight': { shadow: 1.25, wide: true }, // dark glossy plates; this one filmed landscape
};
const CLIPS = {
  'Chicken_teriyaki_sushi_roll': 'roll-horno',
  'Chocolate_brownie': 'brownie',
  'Cinnamon_roll_with_pistachios': 'cinnabon',
  'Cocktail_in_glass_with_ice': 'cocktail-amber',
  'Noodles_and_chicken': 'udon',
  'Pistachio_mousse_cakes': 'pistachio-mousse',
  'Rice_and_chicken': 'wok-rice',
  'Salad_ingredients_assembling': 'salad-cesar',
  'Sushi_roll_deconstruction_and_re': 'roll-philadelphia', // salmon, cream cheese, prawn: Philadelphia (2026-10-28)
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
  'Cosmoflower': 'cosmoflower', // 'Martini_glass_rotating_on_green_…', renamed
  'Cuba_libre': 'cuba-libre', // 'Glass_rotating_with_Cuba_Libre_…', renamed
  'Midnight_roll': 'roll-midnight', // 'Sushi_roll_piece_deconstruction_…_9c24999f', renamed
  'Dark_roll': 'roll-dark', // the admin's source name 'Sushi_roll_deconstruction_and_re…_270249b0', renamed: the prefix is taken
};

function run(args, input) {
  return new Promise((res, rej) => {
    const p = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'inherit'] });
    p.on('error', rej); p.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res()));
    if (input) input(p);
  });
}

async function keyClip(src, slug) {
  const tmp = path.join(os.tmpdir(), `key-${slug}-${process.pid}.mkv`);
  const wide = !!OPTS[slug]?.wide, [W, H] = wide ? SIZE.wide : SIZE.tall, frame = W * H * 3;
  // decode → crop to 9:16 (or 16:9 for a wide clip) → W×H RGB frames on stdout
  const crop = wide ? "crop='min(iw,ih*16/9)':'min(ih,iw*9/16)'" : "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'";
  const dec = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-i', src, '-vf',
    `${crop},scale=${W}:${H}:flags=lanczos,fps=${FPS},format=rgb24`, '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const enc = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'ffv1', '-pix_fmt', 'bgra', tmp], { stdio: ['pipe', 'ignore', 'inherit'] });
  const encDone = new Promise((res, rej) => enc.on('close', c => (c ? rej(new Error('ffv1 encode failed')) : res())));
  const out = Buffer.alloc(W * H * 4), alpha = new Float32Array(W * H), m = new Float32Array(W * H);
  let buf = Buffer.alloc(0), key = null, frames = 0, best = 0, bestCover = -1;
  for await (const chunk of dec.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= frame) {
      const px = buf.subarray(0, frame);
      key ||= sampleKey(px, W, H);
      keyFrame(px, out, alpha, m, key, OPTS[slug], W, H);
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
  const small = ['-vf', `scale=${wide ? 426 : 240}:-2:flags=lanczos`];
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
  // a file a longer prefix names belongs to that clip ('Sushi_roll_deconstruction_and_re…' is not roll-tempura)
  const f = files.find(n => n.startsWith(prefix) && !Object.keys(CLIPS).some(p => p.length > prefix.length && p.startsWith(prefix) && n.startsWith(p)));
  if (!f) { console.warn(`missing source for ${slug} (${prefix}…)`); return null; }
  return () => keyClip(path.join(dir, f), slug);
}).filter(Boolean);
// a few at a time: each clip already keeps several encoders busy
const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) await queue.shift()(); }));
