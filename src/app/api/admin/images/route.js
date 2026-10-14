import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const TYPES = ['image/webp', 'image/jpeg', 'image/png'], MAX = 1.5 * 1024 * 1024;

// Raw image body (the admin resizes it in the browser first) → { id }.
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const mime = (req.headers.get('content-type') || '').split(';')[0];
  if (!TYPES.includes(mime)) return NextResponse.json({ error: 'Нужен JPG, PNG или WebP' }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MAX) return NextResponse.json({ error: 'Файл слишком большой' }, { status: 400 });
  const [img] = await db()`insert into images (mime, bytes) values (${mime}, ${buf}) returning id`;
  return NextResponse.json({ id: img.id });
}
