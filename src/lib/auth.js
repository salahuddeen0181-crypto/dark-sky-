import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { adminConfigured, checkAdminPassword, adminVersion, tabletConfigured, checkTabletPin, tabletVersion, serverSecret } from './credentials';

// Admin session: a signed, expiring cookie. The key includes the current password (or its hash, once it is set in
// the admin), so changing the password logs every other device out.
const COOKIE = 'ds_admin', DAYS = 30;
const key = async () => crypto.createHash('sha256').update('darksky-admin:' + (process.env.ADMIN_SECRET || '') + ':' + (await adminVersion())).digest();
const mac = async v => crypto.createHmac('sha256', await key()).update(v).digest('base64url');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const passwordConfigured = adminConfigured;
export const checkPassword = checkAdminPassword;

export async function startSession() {
  const exp = String(Date.now() + DAYS * 864e5);
  (await cookies()).set(COOKIE, `${exp}.${await mac(exp)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DAYS * 86400 });
}
export async function endSession() { (await cookies()).delete(COOKIE); }

export async function isAdmin() {
  if (!(await adminConfigured())) return false;
  const v = (await cookies()).get(COOKIE)?.value || '';
  const [exp, sig] = v.split('.');
  return !!exp && !!sig && Number(exp) > Date.now() && same(sig, await mac(exp));
}

export async function requireAdmin() { if (!(await isAdmin())) redirect('/admin/login'); }

// For API routes: returns a 401 response when not logged in, otherwise null.
export async function denyUnlessAdmin() {
  return (await isAdmin()) ? null : NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

// Staff session for /staff: "<expiry>.<who>.<signature>", who = "pin" (the shared bar tablet), a waiter's staff id
// (signed in through Telegram) or "p<id>" (a waiter with a personal PIN). The tablet key includes its PIN: a new PIN
// logs tablets out. The value also travels as the x-staff-session header: inside Telegram Desktop / Web the Mini App
// runs in an iframe where cookies may be blocked. An admin is always staff too.
const STAFF = 'ds_staff', STAFF_DAYS = 30;
const staffKey = async who => crypto.createHash('sha256').update('darksky-staff:' + (process.env.ADMIN_SECRET || '') + ':' + (who === 'pin' ? await tabletVersion() : await serverSecret())).digest();
const staffMac = async (exp, who) => crypto.createHmac('sha256', await staffKey(who)).update(`${exp}.${who}`).digest('base64url');

export const pinConfigured = tabletConfigured;
export const checkPin = checkTabletPin;

// The visitor's address: Caddy sets X-Real-IP from Cloudflare's CF-Connecting-IP (trusted only from Cloudflare's
// ranges) and overwrites whatever the client sent. X-Forwarded-For is not used: its first entry is the client's own.
export const clientIp = req => (req.headers.get('x-real-ip') || '').trim() || 'local';

// A short PIN or password is easy to guess: at most 5 wrong tries per address in 10 minutes (per server instance),
// and at most 30 wrong staff PINs in 10 minutes from everyone together (guessing from many addresses).
// Keys: the address for staff PINs, 'admin:' + address for the admin password.
const WINDOW = 10 * 60e3, ALL = '*pin';
const tries = (globalThis.__darkskyPinTries ||= new Map());
const live = t => !!t && Date.now() - t.at < WINDOW;
export function pinLocked(ip) {
  const t = tries.get(ip), all = tries.get(ALL);
  return (live(t) && t.n >= 5) || (!ip.startsWith('admin:') && live(all) && all.n >= 30);
}
export function pinFailed(ip) {
  const bump = k => { const t = tries.get(k); tries.set(k, live(t) ? { n: t.n + 1, at: t.at } : { n: 1, at: Date.now() }); };
  bump(ip);
  if (!ip.startsWith('admin:')) bump(ALL);
  if (tries.size > 500) for (const [k, t] of tries) if (!live(t)) tries.delete(k); // old entries go
}

// who: 'pin', a staff id, or 'p' + staff id → the session value (also returned to the Mini App for the header)
export async function startStaffSession(who = 'pin') {
  const exp = String(Date.now() + STAFF_DAYS * 864e5), v = `${exp}.${who}.${await staffMac(exp, who)}`;
  const secure = process.env.NODE_ENV === 'production';
  (await cookies()).set(STAFF, v, { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/', maxAge: STAFF_DAYS * 86400 });
  return v;
}
export async function endStaffSession() { (await cookies()).delete(STAFF); }

// Who is using the staff app: { id, name, kind: 'waiter' | 'pin' | 'admin', via: 'tg' | 'pin' } or null.
// A waiter blocked or not yet approved in the admin is out at once.
export async function getStaff() {
  // the cookie counts only for this site's own requests: a form on another site posting here (the cookie is
  // SameSite=None for the Telegram iframe) carries a foreign Origin. Page navigations send no Origin.
  const h = await headers(), origin = h.get('origin'), host = h.get('x-forwarded-host') || h.get('host');
  const own = !origin || (() => { try { return new URL(origin).host === host; } catch { return false; } })();
  const v = h.get('x-staff-session') || (own && (await cookies()).get(STAFF)?.value) || '';
  const [exp, who, sig] = v.split('.');
  if (exp && who && sig && Number(exp) > Date.now() && same(sig, await staffMac(exp, who))) {
    if (who === 'pin' && (await tabletConfigured())) return { id: 0, name: '', kind: 'pin' };
    const m = who.match(/^(p?)(\d+)$/);
    if (m) {
      const { getStaffById } = await import('./staff');
      const s = await getStaffById(Number(m[2]));
      if (s && s.status === 'active') return { id: s.id, name: s.name, kind: 'waiter', via: m[1] ? 'pin' : 'tg' };
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
