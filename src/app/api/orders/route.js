import { NextResponse } from 'next/server';
import { placeOrder, OrderError } from '@/lib/orders';
import { siteUrl } from '@/lib/site';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  try {
    const o = await placeOrder({ token: body.token, lines: body.lines, cash: !!body.cash, lang: body.lang, note: body.note, site: await siteUrl() });
    return NextResponse.json(o);
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error('order', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
