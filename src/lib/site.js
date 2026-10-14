import 'server-only';
import { headers } from 'next/headers';

// Public address of the site, for QR links and the Telegram webhook. SITE_URL wins (set it to your final domain).
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}
