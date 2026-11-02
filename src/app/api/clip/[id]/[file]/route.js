import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { clipDir } from '@/lib/clip-worker';

// The finished files of an uploaded clip. Safari asks for video in byte ranges; only the names the worker writes pass.
const ID = /^[0-9a-f-]{36}$/, FILE = /^(clip|wide)(-sm\.mp4|\.mp4|\.webp|-th\.webp|-cover\.webp)$/;
const HEADERS = { 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' };

export async function GET(req, { params }) {
  const { id, file } = await params;
  if (!ID.test(id) || !FILE.test(file)) return new Response('Not found', { status: 404 });
  const full = path.join(clipDir(id), file);
  let size;
  try { size = fs.statSync(full).size; } catch { return new Response('Not found', { status: 404 }); }
  const type = file.endsWith('.mp4') ? 'video/mp4' : 'image/webp', m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    const start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(full, { start, end })), { status: 206, headers: { ...HEADERS, 'content-type': type, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${size}` } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(full)), { headers: { ...HEADERS, 'content-type': type, 'content-length': String(size) } });
}
