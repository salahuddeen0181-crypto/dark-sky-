import { NextResponse } from 'next/server';
import { denyUnlessStaff } from '@/lib/auth';
import { listOrders } from '@/lib/orders';

// The staff board polls this every few seconds.
export async function GET() {
  const deny = await denyUnlessStaff();
  if (deny) return deny;
  return NextResponse.json({ orders: await listOrders() }, { headers: { 'cache-control': 'no-store' } });
}
