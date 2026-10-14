import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const newToken = () => crypto.randomBytes(5).toString('base64url');

// { count } — add tables numbered after the current last one.
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { count } = await req.json().catch(() => ({}));
  const n = Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
  const sql = db();
  const [{ last }] = await sql`select coalesce(max(number), 0) as last from tables`;
  for (let i = 1; i <= n; i++) await sql`insert into tables (number, token) values (${last + i}, ${newToken()})`;
  return NextResponse.json({ ok: true });
}
