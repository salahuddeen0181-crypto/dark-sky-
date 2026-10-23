import { NextResponse } from 'next/server';
import { verifyInitData } from '@/lib/telegram-auth';
import { registerTg, staffReady } from '@/lib/staff';
import { startStaffSession } from '@/lib/auth';

// The staff Mini App sends Telegram's signed launch data: a known, approved waiter gets a session under its own name;
// someone new is registered and waits for the admin.
export async function POST(req) {
  const { initData } = await req.json().catch(() => ({}));
  const tg = verifyInitData(initData);
  if (!tg) return NextResponse.json({ error: 'Telegram не подтвердил вход — откройте приложение заново из бота' }, { status: 401 });
  if (!staffReady()) return NextResponse.json({ error: 'Нет базы данных: вход через Telegram недоступен' }, { status: 503 });
  const s = await registerTg(tg.user);
  if (s.status === 'blocked') return NextResponse.json({ error: 'Доступ закрыт администратором' }, { status: 403 });
  if (s.status !== 'active') return NextResponse.json({ pending: true, name: s.name });
  const session = await startStaffSession(String(s.id));
  return NextResponse.json({ ok: true, session, name: s.name, startParam: tg.startParam });
}
