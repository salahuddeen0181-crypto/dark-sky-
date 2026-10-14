import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

// Admin session: a signed, expiring cookie. The key is derived from ADMIN_PASSWORD,
// so changing the password logs everyone out.
const COOKIE = 'ds_admin', DAYS = 30;
const key = () => crypto.createHash('sha256').update('darksky-admin:' + (process.env.ADMIN_SECRET || '') + ':' + (process.env.ADMIN_PASSWORD || '')).digest();
const mac = v => crypto.createHmac('sha256', key()).update(v).digest('base64url');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const passwordConfigured = () => !!process.env.ADMIN_PASSWORD;
export function checkPassword(pw) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want) return false;
  const a = crypto.createHash('sha256').update(String(pw || '')).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function startSession() {
  const exp = String(Date.now() + DAYS * 864e5);
  (await cookies()).set(COOKIE, `${exp}.${mac(exp)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DAYS * 86400 });
}
export async function endSession() { (await cookies()).delete(COOKIE); }

export async function isAdmin() {
  if (!passwordConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value || '';
  const [exp, sig] = v.split('.');
  return !!exp && !!sig && Number(exp) > Date.now() && same(sig, mac(exp));
}

export async function requireAdmin() { if (!(await isAdmin())) redirect('/admin/login'); }

// For API routes: returns a 401 response when not logged in, otherwise null.
export async function denyUnlessAdmin() {
  return (await isAdmin()) ? null : NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
