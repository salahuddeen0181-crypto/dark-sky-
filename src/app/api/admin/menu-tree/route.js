import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { saveTree, ContentError } from '@/lib/content';

// The menu's structure from the «Меню» page: { sections: [{ id, n, hidden, cats }], cats: { id: { n, hidden } } }
export async function PUT(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  try { await saveTree(body); }
  catch (e) { if (e instanceof ContentError) return NextResponse.json({ error: e.message }, { status: 400 }); throw e; }
  return NextResponse.json({ ok: true });
}
