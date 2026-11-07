import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { progress, hasSource, cleanOpts, runClips } from '@/lib/clip-worker';

// How an uploaded video is getting on: { status, media, error, progress } (progress 0–1 while it is being cut)
export async function GET(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [c] = await db()`select status, media, error, opts, parent from clips where id = ${id}`;
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ...c, recut: hasSource(c.parent || id), progress: progress.get(id) ?? (c.status === 'ready' ? 1 : 0) }, { headers: { 'cache-control': 'no-store' } });
}

// Cut the same video again with other settings: { opts } → { id } of the new clip (the source is read from the
// first upload, so a re-cut of a re-cut still works)
export async function POST(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [c] = await db()`select coalesce(parent, id) as src from clips where id = ${id}`;
  if (!c || !hasSource(c.src)) return NextResponse.json({ error: 'Исходное видео уже удалено (хранится 3 дня): загрузите его заново' }, { status: 410 });
  const b = await req.json().catch(() => ({}));
  const [n] = await db()`insert into clips (status, opts, parent) values ('queued', ${db().json(cleanOpts(b.opts))}, ${c.src}) returning id`;
  runClips();
  return NextResponse.json({ id: n.id });
}
