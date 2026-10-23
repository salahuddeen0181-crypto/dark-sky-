import { NextResponse } from 'next/server';
import { checkPin, pinConfigured, pinFailed, pinLocked, startStaffSession } from '@/lib/auth';

export async function POST(req) {
  if (!pinConfigured()) return NextResponse.json({ error: 'STAFF_PIN не задан' }, { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (pinLocked(ip)) return NextResponse.json({ error: 'Слишком много попыток, подождите 10 минут' }, { status: 429 });
  const { pin } = await req.json().catch(() => ({}));
  if (!checkPin(pin)) {
    pinFailed(ip);
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });
  }
  await startStaffSession();
  return NextResponse.json({ ok: true });
}
