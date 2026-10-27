import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { menuChanged } from '@/lib/menu-cache';
import { cleanItem, newItemId } from '@/lib/item-schema';

export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  let it;
  try { it = cleanItem(await req.json()); } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
  const sql = db();
  const id = newItemId(it.data.name);
  const [{ next }] = await sql`select coalesce(max(sort), 0) + 10 as next from menu_items where cat = ${it.cat}`;
  await sql`insert into menu_items (id, cat, sort, hidden, data) values (${id}, ${it.cat}, ${next}, ${it.hidden}, ${sql.json(it.data)})`;
  menuChanged();
  return NextResponse.json({ id });
}
