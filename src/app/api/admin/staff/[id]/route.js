import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { updateStaff, endShift, setStaffPin, PinError } from '@/lib/staff';
import { tg } from '@/lib/telegram';

// { status: 'active' | 'blocked' | 'pending', name } — approve, rename, block a waiter; { endShift: true };
// { pin: '1234' | 'auto' | null } — set, generate or remove the personal PIN (the new one is returned once)
export async function PATCH(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  if (b.endShift) { await endShift(id); return NextResponse.json({ ok: true }); }
  if ('pin' in b) {
    try { return NextResponse.json({ ok: true, pin: await setStaffPin(id, b.pin) }); }
    catch (e) { return NextResponse.json({ error: e instanceof PinError ? e.message : 'Не получилось' }, { status: 400 }); }
  }
  try {
    const s = await updateStaff(id, { status: b.status, name: b.name });
    if (!s) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    // tell the waiter they are in (best effort: they may have never written to the bot)
    if (b.status === 'active') await tg('sendMessage', { chat_id: s.tg_id, text: `✅ ${s.name}, администратор добавил вас в команду DARKSKY. Откройте приложение из меню бота; смена — /smena.` }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
