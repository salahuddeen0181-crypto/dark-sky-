import { NextResponse } from 'next/server';
import { checkPassword, passwordConfigured, startSession } from '@/lib/auth';

export async function POST(req) {
  if (!passwordConfigured()) return NextResponse.json({ error: 'ADMIN_PASSWORD не задан' }, { status: 500 });
  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }
  await startSession();
  return NextResponse.json({ ok: true });
}
