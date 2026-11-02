import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipDir, sourceFile, probe, runClips, MAX_SECONDS } from '@/lib/clip-worker';

const MAX = 90 * 1024 * 1024;
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Raw video body → { id }; the backdrop is cut out in the background, GET /api/admin/clips/<id> tells how it went.
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  if (Number(req.headers.get('content-length')) > MAX) return fail('Файл больше 90 МБ');
  if (!req.body) return fail('Пустой файл');
  const [{ id }] = await db()`insert into clips (status) values ('uploading') returning id`;
  const drop = () => { fs.rmSync(clipDir(id), { recursive: true, force: true }); return db()`delete from clips where id = ${id}`; };
  try {
    fs.mkdirSync(clipDir(id), { recursive: true });
    let size = 0;
    const limited = async function* (src) { for await (const c of src) { size += c.length; if (size > MAX) throw new RangeError('big'); yield c; } };
    await pipeline(Readable.fromWeb(req.body), limited, fs.createWriteStream(sourceFile(id)));
    const info = await probe(sourceFile(id));
    if (!info) { await drop(); return fail('Нужен видеофайл MP4 или MOV'); }
    if (info.seconds > MAX_SECONDS) { await drop(); return fail(`Видео длиннее ${MAX_SECONDS} секунд: обрежьте его`); }
  } catch (e) {
    await drop();
    if (e instanceof RangeError) return fail('Файл больше 90 МБ');
    console.error('clip upload', e);
    return fail('Не получилось загрузить файл', 500);
  }
  await db()`update clips set status = 'queued' where id = ${id}`;
  runClips();
  return NextResponse.json({ id });
}
