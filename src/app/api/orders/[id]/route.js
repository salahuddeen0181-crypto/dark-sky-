import { NextResponse } from 'next/server';
import { getOrderForGuest } from '@/lib/orders';

// Guest polls this after sending: new → accepted → served, plus the order as staff may have edited it.
// Needs the table token, so orders can't be enumerated.
export async function GET(req, { params }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get('t');
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const o = await getOrderForGuest(n, token);
  if (!o) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(o, { headers: { 'cache-control': 'no-store' } });
}
