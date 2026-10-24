import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { createStaff, PinError, staffReady } from '@/lib/staff';

// { name, pin? } — a waiter without Telegram, in the team at once; the PIN ('auto' by default) is returned once
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  if (!staffReady()) return NextResponse.json({ error: 'Нужна база данных' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  try { const s = await createStaff({ name: b.name, pin: b.pin || 'auto' }); return NextResponse.json({ ok: true, id: s.id, pin: s.pin }); }
  catch (e) { return NextResponse.json({ error: e instanceof PinError ? e.message : 'Не получилось' }, { status: 400 }); }
}
