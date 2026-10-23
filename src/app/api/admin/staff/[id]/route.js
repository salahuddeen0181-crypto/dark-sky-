import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { updateStaff, endShift } from '@/lib/staff';
import { tg } from '@/lib/telegram';

// { status: 'active' | 'blocked' | 'pending', name } — approve, rename, block a waiter; { endShift: true }
export async function PATCH(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  if (b.endShift) { await endShift(id); return NextResponse.json({ ok: true }); }
  try {
    const s = await updateStaff(id, { status: b.status, name: b.name });
    if (!s) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    // tell the waiter they are in (best effort: they may have never written to the bot)
    if (b.status === 'active') await tg('sendMessage', { chat_id: s.tg_id, text: `✅ ${s.name}, администратор добавил вас в команду DARKSKY. Откройте приложение из меню бота; смена — /smena.` }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
