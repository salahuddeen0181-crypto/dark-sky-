import { NextResponse } from 'next/server';
import { getOrderStatusForTable } from '@/lib/orders';

// Guest polls this after sending: new → accepted → served. Needs the table token, so orders can't be enumerated.
export async function GET(req, { params }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get('t');
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const status = await getOrderStatusForTable(n, token);
  if (!status) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ status }, { headers: { 'cache-control': 'no-store' } });
}
