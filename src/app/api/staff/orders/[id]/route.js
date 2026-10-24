import { NextResponse } from 'next/server';
import { getStaff } from '@/lib/auth';
import { acceptOrder, serveOrder, editOrder, getOrder, OrderError } from '@/lib/orders';
import { staffReady, getStaffById, startShift } from '@/lib/staff';
import { siteUrl } from '@/lib/site';

const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });

export async function GET(req, { params }) {
  if (!(await getStaff())) return unauthorized();
  const o = await getOrder(Number((await params).id));
  return o ? NextResponse.json({ order: o }, { headers: { 'cache-control': 'no-store' } }) : NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
}

// Who is acting: a waiter signed in as themselves (Telegram or a personal PIN) is themselves; the shared tablet (PIN) or an admin
// picks a waiter who is on shift (body.staffId). Without a database there are no accounts — a typed name (body.by).
async function actor(me, body) {
  if (me.kind === 'waiter') return { id: me.id, name: me.name };
  if (!staffReady()) return { id: 0, name: String(body.by || '').trim() };
  const s = body.staffId ? await getStaffById(Number(body.staffId)) : null;
  if (!s || s.status !== 'active') throw new OrderError('who', 400);
  return { id: s.id, name: s.name };
}

// { action: 'accept' | 'serve', staffId? } · { action: 'edit', edits: [{ i, qty }], add: [{ id, vi, qty }] }
export async function POST(req, { params }) {
  const me = await getStaff();
  if (!me) return unauthorized();
  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));
  const site = await siteUrl();
  try {
    let o = null;
    if (body.action === 'accept' || body.action === 'serve') {
      const who = await actor(me, body);
      if (body.action === 'accept') { o = await acceptOrder(id, who, site); if (o && who.id) await startShift(who.id); }
      else o = await serveOrder(id, who, site);
    } else if (body.action === 'edit') o = await editOrder(id, body.edits || [], body.add || [], site);
    if (o) return NextResponse.json({ order: o });
    // Lost a race (someone else already took it) or the order is gone
    const cur = await getOrder(id);
    const error = !cur ? 'Заказ не найден' : cur.status === 'accepted' ? `Уже одобрил(а) ${cur.accepted_by}` : cur.status === 'served' ? 'Уже подано' : 'Не получилось';
    return NextResponse.json({ error, order: cur }, { status: 409 });
  } catch (e) {
    if (e instanceof OrderError) {
      const error = { who: 'Выберите официанта на смене', empty: 'Нельзя убрать все позиции', closed: 'Заказ уже подан', not_found: 'Заказ не найден', unavailable: 'Такого блюда нет в меню' }[e.code] || 'Неверные данные';
      return NextResponse.json({ error }, { status: e.status });
    }
    console.error('staff order', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
