import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { progress } from '@/lib/clip-worker';

// How an uploaded video is getting on: { status, media, error, progress } (progress 0–1 while it is being cut)
export async function GET(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [c] = await db()`select status, media, error from clips where id = ${id}`;
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ...c, progress: progress.get(id) ?? (c.status === 'ready' ? 1 : 0) }, { headers: { 'cache-control': 'no-store' } });
}
