import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
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

// Staff session for /staff: "<expiry>.<who>.<signature>", who = a waiter's staff id (signed in through Telegram)
// or "pin" (the shared bar tablet). The PIN session key includes STAFF_PIN: changing the PIN logs tablets out.
// The value also travels as the x-staff-session header: inside Telegram Desktop / Web the Mini App runs in an
// iframe where cookies may be blocked. An admin is always staff too.
const STAFF = 'ds_staff', STAFF_DAYS = 30;
const staffKey = who => crypto.createHash('sha256').update('darksky-staff:' + (process.env.ADMIN_SECRET || '') + ':' + (who === 'pin' ? process.env.STAFF_PIN || '' : process.env.TELEGRAM_BOT_TOKEN || '')).digest();
const staffMac = (exp, who) => crypto.createHmac('sha256', staffKey(who)).update(`${exp}.${who}`).digest('base64url');

export const pinConfigured = () => !!process.env.STAFF_PIN;
export function checkPin(pin) {
  const want = process.env.STAFF_PIN || '';
  if (!want) return false;
  const a = crypto.createHash('sha256').update(String(pin || '').trim()).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

// A short PIN or password is easy to guess: at most 5 wrong tries per address in 10 minutes (per server instance).
// Keys: the address for the staff PIN, 'admin:' + address for the admin password.
const tries = (globalThis.__darkskyPinTries ||= new Map());
export function pinLocked(ip) {
  const t = tries.get(ip);
  return !!t && t.n >= 5 && Date.now() - t.at < 10 * 60e3;
}
export function pinFailed(ip) {
  const t = tries.get(ip);
  tries.set(ip, t && Date.now() - t.at < 10 * 60e3 ? { n: t.n + 1, at: t.at } : { n: 1, at: Date.now() });
}

// who: staff id or 'pin' → the session value (also returned to the Mini App for the header)
export async function startStaffSession(who = 'pin') {
  const exp = String(Date.now() + STAFF_DAYS * 864e5), v = `${exp}.${who}.${staffMac(exp, who)}`;
  const secure = process.env.NODE_ENV === 'production';
  (await cookies()).set(STAFF, v, { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/', maxAge: STAFF_DAYS * 86400 });
  return v;
}
export async function endStaffSession() { (await cookies()).delete(STAFF); }

// Who is using the staff app: { id, name, kind: 'tg' | 'pin' | 'admin' } or null.
// A waiter blocked or not yet approved in the admin is out at once.
export async function getStaff() {
  const v = (await headers()).get('x-staff-session') || (await cookies()).get(STAFF)?.value || '';
  const [exp, who, sig] = v.split('.');
  if (exp && who && sig && Number(exp) > Date.now() && same(sig, staffMac(exp, who))) {
    if (who === 'pin' && pinConfigured()) return { id: 0, name: '', kind: 'pin' };
    if (/^\d+$/.test(who) && process.env.TELEGRAM_BOT_TOKEN) {
      const { getStaffById } = await import('./staff');
      const s = await getStaffById(Number(who));
      if (s && s.status === 'active') return { id: s.id, name: s.name, kind: 'tg' };
    }
  }
  return (await isAdmin()) ? { id: 0, name: 'Администратор', kind: 'admin' } : null;
}
export const isStaff = async () => !!(await getStaff());

export async function requireStaff(next = '') {
  const s = await getStaff();
  if (!s) redirect('/staff/login' + (next ? '?next=' + encodeURIComponent(next) : ''));
  return s;
}
export async function denyUnlessStaff() {
  return (await isStaff()) ? null : NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
