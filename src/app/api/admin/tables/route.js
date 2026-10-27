import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanLabel, labelTaken } from '@/lib/table-label';

const newToken = () => crypto.randomBytes(5).toString('base64url');

// { count } — add tables numbered after the current last one; { label } — one table with its own name («VIP 1»).
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { count, label: raw } = await req.json().catch(() => ({}));
  const sql = db();
  const label = cleanLabel(raw);
  if (label && (await labelTaken(sql, label))) return NextResponse.json({ error: `Стол «${label}» уже есть` }, { status: 400 });
  const n = label ? 1 : Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
  const [{ last }] = await sql`select coalesce(max(number), 0) as last from tables`;
  for (let i = 1; i <= n; i++) await sql`insert into tables (number, token, label) values (${last + i}, ${newToken()}, ${label})`;
  return NextResponse.json({ ok: true });
}
