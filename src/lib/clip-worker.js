import 'server-only';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { sampleBackdrop, keyFrame, keyFlat } from './keying';

// Videos uploaded in the admin: the plain backdrop is cut out here, one clip at a time and at low priority, so the
// menu stays quick on the server's two cores. iPhones don't play VP9 with alpha and HEVC with alpha can't be made on
// Linux, so a clip is an ordinary H.264 MP4 of double height: picture on top, its mask below (AlphaClip.jsx joins them).
// Files: uploads/clips/<id>/{clip|wide}{.mp4,-sm.mp4,.webp,-th.webp,-cover.webp}; wide: filmed landscape, kept whole.
const FF = process.env.FFMPEG || 'ffmpeg', FPS = 24, SIZE = { clip: [480, 854], wide: [854, 480] }, FEATHER = [.04, .03];
export const MAX_SECONDS = 20;
const MAX_MINUTES = 15;
const ROOT = () => path.join(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'), 'clips');
export const clipDir = id => path.join(ROOT(), id);
export const sourceFile = id => path.join(clipDir(id), 'source');

const low = args => (process.platform === 'linux' ? ['nice', ['-n', '15', FF, ...args]] : [FF, args]);
const ff = (args, stdio) => { const [cmd, a] = low(['-hide_banner', '-loglevel', 'error', '-y', ...args]); return spawn(cmd, a, { stdio }); };
const done = p => new Promise((res, rej) => { p.on('error', rej); p.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())); });

// { width, height, seconds } as the video plays (a phone's rotation applied), or null when it isn't a video
export function probe(file) {
  return new Promise(res => {
    const p = spawn(FF, ['-hide_banner', '-i', file, '-frames:v', '1', '-vf', 'showinfo', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let log = ''; p.stderr.on('data', d => { log += d; });
    p.on('error', () => res(null));
    p.on('close', () => {
      const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(log), s = /\bs:(\d+)x(\d+)/.exec(log);
      res(d && s ? { width: +s[1], height: +s[2], seconds: +d[1] * 3600 + +d[2] * 60 + +d[3] } : null);
    });
  });
}

class Unusable extends Error {}

// The box around the dish plus 4% (as scripts/make-covers.mjs): a thumbnail is always the dish, not the empty frame
function dishBox(frame, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (frame[(y * W + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < x0) return null;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * .04), l = Math.max(0, x0 - m), t = Math.max(0, y0 - m);
  return { x: l, y: t, w: Math.min(W, x1 + m + 1) - l, h: Math.min(H, y1 + m + 1) - t };
}

// frame: the fullest one, as the poster; cover: what the list row and the small cards show, trimmed to the dish
async function stills(dir, stem, frame, cover, W, H) {
  const write = (src, vf, name) => new Promise((res, rej) => {
    const p = ff(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', ...(vf ? ['-vf', vf] : []), '-frames:v', '1', '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '82', path.join(dir, name)], ['pipe', 'ignore', 'inherit']);
    p.stdin.on('error', () => {}); p.stdin.end(src); done(p).then(res, rej);
  });
  const box = dishBox(cover, W, H), trim = box ? `crop=${box.w}:${box.h}:${box.x}:${box.y},` : '';
  await write(frame, null, stem + '.webp');
  await write(frame, `scale=${W > H ? 427 : 320}:-2`, stem + '-th.webp');
  await write(cover, `${trim}scale=-2:'min(320,ih)':flags=lanczos`, stem + '-cover.webp');
}

async function keyClip(id, info) {
  const dir = clipDir(id), stem = info.width > info.height ? 'wide' : 'clip', [W, H] = SIZE[stem], frame = W * H * 3;
  const crop = stem === 'wide' ? "crop='min(iw,ih*16/9)':'min(ih,iw*9/16)'" : "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'";
  const dec = ff(['-threads', '1', '-i', sourceFile(id), '-vf', `${crop},scale=${W}:${H}:flags=lanczos,fps=${FPS},format=rgb24`, '-f', 'rawvideo', '-'], ['ignore', 'pipe', 'inherit']);
  const enc = ff(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H * 2}`, '-r', String(FPS), '-i', '-', '-threads', '1', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-g', String(FPS), '-movflags', '+faststart', '-an', path.join(dir, stem + '.mp4')], ['pipe', 'ignore', 'inherit']);
  const decoded = done(dec), encoded = done(enc);
  enc.stdin.on('error', () => {});
  // SIGKILL: on a polite signal ffmpeg waits for the pipe nobody reads any more
  const stop = () => { dec.kill('SIGKILL'); enc.kill('SIGKILL'); dec.stdout.destroy(); };
  const guard = setTimeout(stop, MAX_MINUTES * 60e3); // a clip that hangs must not hold up the queue
  const out = Buffer.alloc(W * H * 4), alpha = new Float32Array(W * H), tmp = new Float32Array(W * H), both = Buffer.alloc(W * H * 2 * 3);
  let buf = Buffer.alloc(0), back, frames = 0, best = 0, bestCover = -1, still = null, first = null, firstCover = 0;
  for await (const chunk of dec.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= frame) {
      const px = buf.subarray(0, frame);
      if (back === undefined) {
        back = sampleBackdrop(px, W, H);
        if (!back) { clearTimeout(guard); stop(); await decoded.catch(() => {}); await encoded.catch(() => {}); throw new Unusable('Не удалось определить фон: края кадра должны быть одного цвета. Нужно видео на зелёном или однотонном фоне.'); }
      }
      if (back.hue) keyFrame(px, out, alpha, tmp, back.hue, { feather: FEATHER, shadow: 1.25 }, W, H); else keyFlat(px, out, alpha, tmp, back.flat, FEATHER, W, H);
      for (let p = 0; p < W * H; p++) {
        const o = p * 4, i = p * 3, m = (W * H + p) * 3, a = out[o + 3];
        both[i] = out[o]; both[i + 1] = out[o + 1]; both[i + 2] = out[o + 2];
        both[m] = both[m + 1] = both[m + 2] = a;
      }
      if (!enc.stdin.write(Buffer.from(both))) await new Promise(r => enc.stdin.once('drain', r));
      let cover = 0; for (let i = 0; i < alpha.length; i += 7) cover += alpha[i];
      if (!frames) { first = Buffer.from(out); firstCover = cover; }
      if (cover > bestCover * 1.002) { bestCover = cover; best = frames; still = Buffer.from(out); } // earliest frame of (nearly) full coverage
      buf = buf.subarray(frame); frames++;
    }
  }
  enc.stdin.end();
  await decoded; await encoded;
  clearTimeout(guard);
  if (!frames) throw new Unusable('В файле не нашлось кадров видео');
  if (bestCover < alpha.length / 7 * .01) throw new Unusable('После вырезки фона в кадре ничего не осталось: объект слишком похож на фон.');
  await done(ff(['-threads', '1', '-i', path.join(dir, stem + '.mp4'), '-vf', 'scale=trunc(iw/4)*2:trunc(ih/4)*2:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-pix_fmt', 'yuv420p', '-g', String(FPS), '-movflags', '+faststart', '-an', path.join(dir, stem + '-sm.mp4')], ['ignore', 'ignore', 'inherit']));
  // a clip that opens on the finished dish shows that on its thumbnail; one that assembles it, its fullest frame
  await stills(dir, stem, still, firstCover > bestCover * .4 ? first : still, W, H);
  return `/api/clip/${id}/${stem}.mp4#t=${(best / FPS).toFixed(2)}`;
}

// MARK: - The queue
let running = false;
export async function runClips() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const [c] = await db()`update clips set status = 'working' where id = (select id from clips where status in ('queued', 'working') order by created_at limit 1) returning id`;
      if (!c) break;
      try {
        const info = await probe(sourceFile(c.id));
        if (!info) throw new Unusable('Файл не читается как видео');
        const media = await keyClip(c.id, info);
        await db()`update clips set status = 'ready', media = ${media}, error = null where id = ${c.id}`;
      } catch (e) {
        if (!(e instanceof Unusable)) console.error('clip', c.id, e);
        await db()`update clips set status = 'failed', error = ${e instanceof Unusable ? e.message : 'Не получилось обработать видео'} where id = ${c.id}`;
      }
      fs.rmSync(sourceFile(c.id), { force: true }); // only the finished clip stays on the disk
    }
  } catch (e) { console.error('clips', e); } finally { running = false; }
}
