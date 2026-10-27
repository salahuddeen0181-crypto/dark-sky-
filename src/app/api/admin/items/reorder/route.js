import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuChanged } from '@/lib/menu-cache';

// { ids: [...] } — the new order of the items of one category.
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length > 500) return NextResponse.json({ error: 'bad ids' }, { status: 400 });
  const sql = db();
  await sql.begin(async tx => { for (const [i, id] of ids.entries()) await tx`update menu_items set sort = ${(i + 1) * 10} where id = ${String(id)}`; });
  menuChanged();
  return NextResponse.json({ ok: true });
}
