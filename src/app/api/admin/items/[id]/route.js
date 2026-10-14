import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanItem } from '@/lib/item-schema';

// Full save from the item editor.
export async function PUT(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  const sql = db();
  const [cur] = await sql`select cat, data from menu_items where id = ${id}`;
  if (!cur) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  let it;
  try { it = cleanItem(await req.json(), cur.data); } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
  const moved = it.cat !== cur.cat;
  await sql`
    update menu_items set cat = ${it.cat}, hidden = ${it.hidden}, data = ${sql.json(it.data)}, updated_at = now(),
      sort = case when ${moved} then (select coalesce(max(sort), 0) + 10 from menu_items where cat = ${it.cat}) else sort end
    where id = ${id}`;
  return NextResponse.json({ ok: true });
}

// Quick toggles from the list: stop-list (hidden), hit, new.
export async function PATCH(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const sql = db();
  if ('hidden' in b) await sql`update menu_items set hidden = ${!!b.hidden}, updated_at = now() where id = ${id}`;
  for (const flag of ['hit', 'new']) {
    if (flag in b) {
      await (b[flag]
        ? sql`update menu_items set data = jsonb_set(data, ${'{' + flag + '}'}::text[], 'true'::jsonb), updated_at = now() where id = ${id}`
        : sql`update menu_items set data = data - ${flag}, updated_at = now() where id = ${id}`);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  await db()`delete from menu_items where id = ${id}`;
  return NextResponse.json({ ok: true });
}
