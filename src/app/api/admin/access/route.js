import { NextResponse } from 'next/server';
import { denyUnlessAdmin, startSession, pinLocked, pinFailed } from '@/lib/auth';
import { checkAdminPassword, setAdminPassword, setTabletPin, isPin } from '@/lib/credentials';
import { staffReady, findStaffByPin } from '@/lib/staff';

// { action: 'password', current, next } — new admin password (this device stays signed in, others are logged out);
// { action: 'tablet', pin } — the bar tablet's PIN ('auto' = a random free one, returned once)
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Без базы данных пароли задаются только в .env' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (b.action === 'password') {
    const ip = 'admin:' + ((req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local');
    if (pinLocked(ip)) return NextResponse.json({ error: 'Слишком много попыток, подождите 10 минут' }, { status: 429 });
    if (!(await checkAdminPassword(b.current))) { pinFailed(ip); return NextResponse.json({ error: 'Текущий пароль неверный' }, { status: 400 }); }
    const next = String(b.next || '');
    if (next.length < 8) return NextResponse.json({ error: 'Новый пароль — минимум 8 символов' }, { status: 400 });
    if (next.length > 128) return NextResponse.json({ error: 'Слишком длинный пароль' }, { status: 400 });
    await setAdminPassword(next);
    await startSession(); // re-signed with the new password: this device stays in
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'tablet') {
    let pin = String(b.pin || '').trim();
    if (pin === 'auto') { const { randomInt } = await import('node:crypto'); for (let k = 0; k < 50; k++) { const p = String(randomInt(100000, 1000000)); if (!(staffReady() && (await findStaffByPin(p)))) { pin = p; break; } } }
    if (!isPin(pin)) return NextResponse.json({ error: 'PIN — от 4 до 6 цифр' }, { status: 400 });
    if (staffReady() && (await findStaffByPin(pin))) return NextResponse.json({ error: 'Этот PIN уже у сотрудника — выберите другой' }, { status: 400 });
    await setTabletPin(pin);
    return NextResponse.json({ ok: true, pin });
  }
  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
