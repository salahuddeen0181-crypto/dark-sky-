import 'server-only';
import crypto from 'node:crypto';

// Telegram Mini App launch data (window.Telegram.WebApp.initData) → the Telegram user, if Telegram signed it.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const MAX_AGE_S = 24 * 3600;

export function verifyInitData(initData, token = process.env.TELEGRAM_BOT_TOKEN) {
  if (!token || typeof initData !== 'string' || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const want = crypto.createHmac('sha256', secret).update(check).digest();
  if (!crypto.timingSafeEqual(want, Buffer.from(hash, 'hex'))) return null;
  const age = Date.now() / 1000 - Number(params.get('auth_date'));
  if (!(age >= -60 && age <= MAX_AGE_S)) return null;
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isInteger(user.id) ? { user, startParam: params.get('start_param') || '' } : null;
  } catch { return null; }
}
