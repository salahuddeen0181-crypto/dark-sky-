import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanLabel, labelTaken } from '@/lib/table-label';

// { active } — switch a table's QR on/off; { regenerate: true } — new link (old printed QR stops working);
// { label } — the table's own name («VIP 1»), '' to go back to its number. Past orders keep the name they had.
export async function PATCH(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const sql = db();
  if ('active' in b) await sql`update tables set active = ${!!b.active} where id = ${id}`;
  if (b.regenerate) await sql`update tables set token = ${crypto.randomBytes(5).toString('base64url')} where id = ${id}`;
  if ('label' in b) {
    const label = cleanLabel(b.label);
    if (label && (await labelTaken(sql, label, Number(id)))) return NextResponse.json({ error: `Стол «${label}» уже есть` }, { status: 400 });
    await sql`update tables set label = ${label} where id = ${id}`;
  }
  return NextResponse.json({ ok: true });
}

// Tables with order history are switched off instead of deleted.
export async function DELETE(req, { params }) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { id } = await params;
  const sql = db();
  const [{ n }] = await sql`select count(*)::int as n from orders where table_id = ${id}`;
  if (n) { await sql`update tables set active = false where id = ${id}`; return NextResponse.json({ ok: true, deactivated: true }); }
  await sql`delete from tables where id = ${id}`;
  return NextResponse.json({ ok: true });
}
