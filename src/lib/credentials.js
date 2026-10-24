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
export const adminConfigured = async () => !!((await getAuth()).admin || process.env.ADMIN_PASSWORD);
export async function checkAdminPassword(pw) {
  const a = await getAuth();
  if (a.admin) return verifySecret(pw, a.admin);
  return !!process.env.ADMIN_PASSWORD && sameText(pw, process.env.ADMIN_PASSWORD);
}
// Part of the session-signing key: a new password logs every other device out
export const adminVersion = async () => (await getAuth()).admin || process.env.ADMIN_PASSWORD || '';
export async function setAdminPassword(pw) { await patchAuth({ admin: await hashSecret(pw) }); }

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
