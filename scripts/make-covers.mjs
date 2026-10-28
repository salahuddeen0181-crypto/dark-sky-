// Covers for the menu list rows: the frame of each keyed clip where the dish is finished on its plate (most clips
// open on it, a few only end on it), trimmed to the dish → public/media/<slug>-cover.webp, 320 px tall, alpha kept. The open dish card
// keeps playing the clip as before (poster <slug>.webp, start #t= in MEDIA).
//
//   FFMPEG=/path/to/ffmpeg node scripts/make-covers.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FF = process.env.FFMPEG || 'ffmpeg';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MEDIA = path.join(ROOT, 'public/media');

// slug → seconds into the clip
const COVERS = {
  brownie: 0, cinnabon: 0, falafel: 0, jerky: 0, langostinos: 0, panqueques: 0, 'pistachio-mousse': 0,
  'roll-kanikama': 0, 'roll-maki': 0, 'roll-phila': 0, 'roll-philadelphia': 0, 'roll-tempura': 0, 'roll-unagi': 0,
  'salad-greek': 0, udon: 0, 'wok-rice': 0,
  'roll-aburi': 5.9, 'roll-horno': 5.9, 'roll-newyork': 5.9, 'salad-cesar': 9.5,
  // drinks and the hookah: their usual frame already shows them whole
  'cocktail-amber': 5.92, 'tea-tropic': 1.54, 'passion-lemonade': 0.83, hookah: 0.04,
};
// cut/phila: the plate from the clip once named for Ebi Ponzu, Philadelphia's photo until it got its own clip
// (roll-philadelphia, 2026-10-28); kept for an older saved menu that still points at it
const PHOTOS = { 'roll-phila-ebi': [5.9, 'cut/phila'] };

const ff = args => {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
  if (r.status) throw new Error(String(r.stderr));
};
const webp = (png, out, h) => ff(['-i', png, ...(h ? ['-vf', `scale=-2:'min(${h},ih)':flags=lanczos`] : []),
  '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', h ? '80' : '82', '-alpha_quality', h ? '85' : '90', path.join(MEDIA, out)]);
// libvpx-vp9 decodes the alpha plane (the default decoder drops it)
const frame = (slug, t, png) => ff(['-c:v', 'libvpx-vp9', '-ss', String(t), '-i', path.join(MEDIA, slug + '.webm'), '-frames:v', '1', '-pix_fmt', 'rgba', png]);

// the box around the opaque part of a picture (cropdetect on its alpha plane, which needs a few frames), plus a margin
function trim(png) {
  const r = spawnSync(FF, ['-hide_banner', '-loop', '1', '-t', '0.5', '-i', png, '-vf', 'alphaextract,format=gray,cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-']);
  const m = [...String(r.stderr).matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
  if (!m) return;
  const [w, h, x, y] = m.slice(1).map(Number), p = Math.round(Math.max(w, h) * .04), tmp = png + '.png';
  ff(['-i', png, '-vf', `crop=w='min(iw,${w + 2 * p})':h='min(ih,${h + 2 * p})':x='max(0,min(iw-ow,${x - p}))':y='max(0,min(ih-oh,${y - p}))'`, '-pix_fmt', 'rgba', tmp]);
  fs.renameSync(tmp, png);
}

for (const [slug, t] of Object.entries(COVERS)) {
  const png = path.join(MEDIA, slug + '.cover.png');
  frame(slug, t, png); trim(png); webp(png, slug + '-cover.webp', 320); fs.unlinkSync(png);
  console.log(`${slug.padEnd(18)} t=${t} → ${slug}-cover.webp`);
}
for (const [slug, [t, out]] of Object.entries(PHOTOS)) {
  const png = path.join(MEDIA, slug + '.cover.png');
  frame(slug, t, png); trim(png); webp(png, out + '.webp'); webp(png, out + '-th.webp', 320); fs.unlinkSync(png);
  console.log(`${slug.padEnd(18)} t=${t} → ${out}.webp (photo)`);
}
