import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { adminEditOrder, getOrder, OrderError } from '@/lib/orders';
import { archiveOrder } from '@/lib/order-store';
import { siteUrl } from '@/lib/site';

const ERR = { empty: 'Нельзя убрать все позиции', not_found: 'Заказ не найден', unavailable: 'Такого блюда нет в меню', bad_price: 'Неверная цена' };

// GET — the order; PUT { lines, add, cash, status, note } — the admin's correction; POST { action: 'archive' } —
// out of the statistics (into «Архив статистики», from where it comes back)
export async function GET(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const o = await getOrder(Number((await params).id));
  return o ? NextResponse.json({ order: o }) : NextResponse.json({ error: ERR.not_found }, { status: 404 });
}
export async function PUT(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ order: await adminEditOrder(Number((await params).id), body, await siteUrl()) });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: ERR[e.code] || 'Неверные данные' }, { status: e.status });
    console.error('admin order', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
export async function POST(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'archive') return NextResponse.json({ error: 'bad action' }, { status: 400 });
  return (await archiveOrder(Number((await params).id))) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: ERR.not_found }, { status: 404 });
}
