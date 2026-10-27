import { NextResponse } from 'next/server';
import { checkPin, pinConfigured, pinFailed, pinLocked, startStaffSession, clientIp } from '@/lib/auth';
import { staffReady, findStaffByPin } from '@/lib/staff';

// One PIN field: the bar tablet's PIN → the shared tablet; a waiter's personal PIN → signed in as that waiter.
export async function POST(req) {
  const personal = staffReady();
  if (!(await pinConfigured()) && !personal) return NextResponse.json({ error: 'PIN не задан' }, { status: 500 });
  const ip = clientIp(req);
  if (pinLocked(ip)) return NextResponse.json({ error: 'Слишком много попыток, подождите 10 минут' }, { status: 429 });
  const pin = String((await req.json().catch(() => ({}))).pin || '').trim();
  if (await checkPin(pin)) { await startStaffSession('pin'); return NextResponse.json({ ok: true, kind: 'pin' }); }
  const s = personal && /^\d{4,6}$/.test(pin) ? await findStaffByPin(pin) : null;
  if (s && s.status === 'active') { await startStaffSession('p' + s.id); return NextResponse.json({ ok: true, kind: 'waiter', name: s.name }); }
  pinFailed(ip);
  await new Promise(r => setTimeout(r, 800)); // slow down guessing
  return NextResponse.json({ error: s ? 'Доступ закрыт администратором' : 'Неверный PIN' }, { status: 401 });
}
