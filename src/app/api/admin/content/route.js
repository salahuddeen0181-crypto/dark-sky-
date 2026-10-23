import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { saveContent } from '@/lib/content';

// The whole content editor in one save: { sections, cats, order, prep, promos, promoNote, rules }
export async function PUT(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  await saveContent(body);
  return NextResponse.json({ ok: true });
}
