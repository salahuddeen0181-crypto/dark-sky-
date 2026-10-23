import { NextResponse } from 'next/server';
import { getStaff } from '@/lib/auth';
import { staffReady, openShift, startShift, endShift, onShift } from '@/lib/staff';

// Who is signed in, their shift and who else is on shift (the bar tablet picks the waiter from this list)
async function state(me) {
  const db = staffReady();
  return {
    me, shift: db && me.kind === 'tg' ? await openShift(me.id) : null,
    onShift: db ? await onShift() : [], named: db,
  };
}

export async function GET() {
  const me = await getStaff();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await state(me), { headers: { 'cache-control': 'no-store' } });
}

// { action: 'start' | 'end' } — a waiter's own shift
export async function POST(req) {
  const me = await getStaff();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.kind !== 'tg') return NextResponse.json({ error: 'Смену отмечает сам официант со своего телефона' }, { status: 400 });
  const { action } = await req.json().catch(() => ({}));
  if (action === 'start') await startShift(me.id); else if (action === 'end') await endShift(me.id);
  return NextResponse.json(await state(me));
}
