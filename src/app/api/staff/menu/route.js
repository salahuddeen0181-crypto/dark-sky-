import { NextResponse } from 'next/server';
import { denyUnlessStaff } from '@/lib/auth';
import { getMenuItems } from '@/lib/menu-server';
import * as D from '@/lib/darksky-data';

const ru = o => (o && typeof o === 'object' ? o.ru || o.es || o.en || '' : o || '');

// Dishes for "Add a dish" when staff edit an order (prices are only for display: the server prices the order itself)
export async function GET() {
  const deny = await denyUnlessStaff(); if (deny) return deny;
  const items = await getMenuItems({ includeHidden: true });
  const cats = Object.fromEntries(D.CATS.map(c => [c.id, ru(c.n)]));
  return NextResponse.json({
    items: items.filter(i => i.p != null || i.v).map(i => ({
      id: i.id, name: i.name, ru: ru(i.nm) || i.name, cat: cats[i.cat] || i.cat, hidden: !!i.hidden,
      p: i.p ?? null, v: i.v ? i.v.map(v => ({ n: ru(v.n), p: v.p ?? null })) : null,
    })),
  });
}
