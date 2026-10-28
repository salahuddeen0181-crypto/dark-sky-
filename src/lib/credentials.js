import 'server-only';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db';

// Admin password, bar-tablet PIN and the key for waiters' PINs, set from the admin (settings['auth']).
// Until they are set there, ADMIN_PASSWORD / STAFF_PIN from the environment keep working.
// Only scrypt hashes are stored; a waiter's PIN is kept as an HMAC so it can be looked up and kept unique.
const KEY = 'auth', TTL = 10e3;
const scrypt = promisify(crypto.scrypt);
const hasDb = () => !!process.env.DATABASE_URL;
const cache = (globalThis.__darkskyAuth ||= { at: 0, value: null });

export async function getAuth() {
  if (!hasDb()) return {};
  if (cache.value && Date.now() - cache.at < TTL) return cache.value;
  const [r] = await db()`select value from settings where key = ${KEY}`;
  cache.value = r ? r.value : {}; cache.at = Date.now();
  return cache.value;
}
async function patchAuth(patch) {
  const next = { ...(await getAuth()), ...patch };
  await db()`insert into settings (key, value) values (${KEY}, ${db().json(next)}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  cache.value = next; cache.at = Date.now();
}

// MARK: - Hashes
export async function hashSecret(secret) {
  const salt = crypto.randomBytes(16), h = await scrypt(String(secret), salt, 32);
  return `scrypt$${salt.toString('base64url')}$${h.toString('base64url')}`;
}
async function verifySecret(secret, stored) {
  const [kind, salt, h] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !h) return false;
  const got = await scrypt(String(secret), Buffer.from(salt, 'base64url'), 32), want = Buffer.from(h, 'base64url');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const sameText = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a ?? '')).digest(), y = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(x, y);
};

// MARK: - Admin password
// The admin's password wins over ADMIN_PASSWORD, until the developer puts a different ADMIN_PASSWORD on the server
// (a forgotten password with no recovery mail): adminEnv remembers which one was there when the admin set theirs.
const envMark = () => crypto.createHash('sha256').update('env:' + (process.env.ADMIN_PASSWORD || '')).digest('base64url');
async function adminHash() {
  const a = await getAuth();
  if (!a.admin) return null;
  if (a.adminEnv === undefined) { await patchAuth({ adminEnv: envMark() }); return a.admin; } // set before this check
  return a.adminEnv === envMark() ? a.admin : null;
}
export const adminConfigured = async () => !!((await adminHash()) || process.env.ADMIN_PASSWORD);
export async function checkAdminPassword(pw) {
  const h = await adminHash();
  if (h) return verifySecret(pw, h);
  return !!process.env.ADMIN_PASSWORD && sameText(pw, process.env.ADMIN_PASSWORD);
}
// Part of the session-signing key: a new password logs every other device out
export const adminVersion = async () => (await adminHash()) || process.env.ADMIN_PASSWORD || '';
export const adminInDb = async () => !!(await adminHash());
// a new password also voids a reset link that was sent and not used
export async function setAdminPassword(pw) { await patchAuth({ admin: await hashSecret(pw), adminEnv: envMark(), reset: null }); }

// MARK: - Bar tablet PIN
export const tabletConfigured = async () => !!((await getAuth()).tablet || process.env.STAFF_PIN);
export async function checkTabletPin(pin) {
  const a = await getAuth();
  if (a.tablet) return verifySecret(pin, a.tablet);
  return !!process.env.STAFF_PIN && sameText(String(pin || '').trim(), process.env.STAFF_PIN);
}
export const tabletVersion = async () => (await getAuth()).tablet || process.env.STAFF_PIN || '';
export async function setTabletPin(pin) { await patchAuth({ tablet: await hashSecret(pin) }); }

// MARK: - Waiters' PINs and session keys
// A random server secret (created on first use): signs staff sessions and keys the PIN HMACs
export async function serverSecret() {
  if (!hasDb()) return process.env.ADMIN_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.STAFF_PIN || 'darksky-local';
  const a = await getAuth();
  if (a.key) return a.key;
  const key = crypto.randomBytes(32).toString('base64url');
  await patchAuth({ key });
  return key;
}
export async function pinHmac(pin) {
  return crypto.createHmac('sha256', await serverSecret()).update('pin:' + String(pin).trim()).digest('base64url');
}
export const isPin = v => /^\d{4,6}$/.test(String(v || ''));

// MARK: - Recovery mail (the owner's Gmail)
// settings['auth'].mail = { to, user, pass }: the Google app password is AES-256-GCM encrypted with a key from
// ADMIN_SECRET (server env, not in the database) and the server secret; it never leaves the server.
const mailKey = async () => crypto.createHash('sha256').update('darksky-mail:' + (process.env.ADMIN_SECRET || '') + ':' + (await serverSecret())).digest();
async function seal(text) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', await mailKey(), iv);
  const body = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return ['gcm', iv, c.getAuthTag(), body].map(x => typeof x === 'string' ? x : x.toString('base64url')).join('$');
}
async function unseal(stored) {
  try {
    const [kind, iv, tag, body] = String(stored || '').split('$');
    if (kind !== 'gcm') return null;
    const d = crypto.createDecipheriv('aes-256-gcm', await mailKey(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(body, 'base64url')), d.final()]).toString('utf8');
  } catch { return null; } // ADMIN_SECRET changed: the password has to be entered again
}
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')) && String(v).length <= 254;

// For the admin form: addresses and whether the app password is there (never the password itself)
export async function mailStatus() {
  const m = (await getAuth()).mail || {};
  const pass = m.pass ? await unseal(m.pass) : null;
  return { to: m.to || '', user: m.user || '', passSet: !!pass, passBroken: !!m.pass && !pass };
}
// Everything needed to send, or null while recovery mail is not set up
export async function mailConfig() {
  const m = (await getAuth()).mail;
  const pass = m?.pass ? await unseal(m.pass) : null;
  return m?.to && m?.user && pass ? { to: m.to, user: m.user, pass } : null;
}
// pass: a new app password, or empty to keep the saved one; empty to + user turns recovery mail off
export async function setMail({ to, user, pass }) {
  if (!to && !user) return patchAuth({ mail: null, reset: null });
  const old = (await getAuth()).mail || {};
  await patchAuth({ mail: { to, user, pass: pass ? await seal(pass) : old.user === user ? old.pass : null } });
}

// MARK: - Password reset links
// One link at a time: a random token, only its sha256 is kept, valid 30 minutes, used once; 3 letters an hour at most
const RESET_TTL = 30 * 60e3, HOUR = 60 * 60e3, PER_HOUR = 3;
const sha = t => crypto.createHash('sha256').update(String(t)).digest('base64url');
export const resetsLeft = async () => PER_HOUR - ((await getAuth()).resetSent || []).filter(t => Date.now() - t < HOUR).length;
export const newResetToken = () => crypto.randomBytes(32).toString('base64url');
// Called once the letter with the token went out
export async function saveResetToken(token) {
  const sent = ((await getAuth()).resetSent || []).filter(t => Date.now() - t < HOUR);
  await patchAuth({ reset: { h: sha(token), exp: Date.now() + RESET_TTL }, resetSent: [...sent, Date.now()] });
}
export async function resetTokenValid(token) {
  const r = (await getAuth()).reset;
  return !!token && !!r && r.exp > Date.now() && sameText(sha(token), r.h);
}
// Sets the new password if the token is good (setAdminPassword drops the token): true / false
let resetChain = Promise.resolve(); // one at a time, so the same link can't be used twice at once
export function redeemResetToken(token, pw) {
  const run = resetChain.then(async () => {
    if (!(await resetTokenValid(token))) return false;
    await setAdminPassword(pw);
    return true;
  });
  resetChain = run.catch(() => {});
  return run;
}
