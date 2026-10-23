'use client';
// Staff app plumbing: requests carry the session also as a header (inside Telegram Desktop / Web the Mini App runs in
// an iframe where the cookie may be dropped), and the Telegram sign-in.

const KEY = 'darksky.staffSession';
const read = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
export const remember = v => { try { sessionStorage.setItem(KEY, v); } catch {} };
export const forget = () => { try { sessionStorage.removeItem(KEY); } catch {} };

// JSON in/out; 401 → the sign-in page (back here afterwards)
export async function staffApi(url, method = 'GET', body) {
  const s = read();
  const r = await fetch(url, {
    method, cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(s ? { 'x-staff-session': s } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 401) { location.href = '/staff/login?next=' + encodeURIComponent(location.pathname); throw new Error('Нужен вход'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `Ошибка ${r.status}`); e.data = j; throw e; }
  return j;
}

// Telegram.WebApp when the page runs as the Mini App, else null (the script is loaded by app/staff/layout.jsx)
export async function telegram() {
  for (let i = 0; i < 20 && typeof window !== 'undefined' && !window.Telegram?.WebApp; i++) await new Promise(r => setTimeout(r, 100));
  const w = typeof window !== 'undefined' && window.Telegram?.WebApp;
  return w && w.initData ? w : null;
}

// Signs the waiter in with Telegram's signed launch data → { ok, name, startParam } | { pending, name } | throws
export async function tgSignIn(w) {
  w.ready(); w.expand?.();
  const r = await fetch('/api/staff/tg-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: w.initData }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Не получилось войти через Telegram');
  if (j.session) remember(j.session);
  return j;
}
