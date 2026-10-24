import { NextResponse } from 'next/server';
import { checkPassword, passwordConfigured, startSession, pinLocked, pinFailed } from '@/lib/auth';

export async function POST(req) {
  if (!(await passwordConfigured())) return NextResponse.json({ error: 'ADMIN_PASSWORD не задан' }, { status: 500 });
  const ip = 'admin:' + ((req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local');
  if (pinLocked(ip)) return NextResponse.json({ error: 'Слишком много попыток, подождите 10 минут' }, { status: 429 });
  const { password } = await req.json().catch(() => ({}));
  if (!(await checkPassword(password))) {
    pinFailed(ip);
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }
  await startSession();
  return NextResponse.json({ ok: true });
}
