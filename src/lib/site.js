import 'server-only';
import { headers } from 'next/headers';

// Public address of the site, for QR links and the Telegram webhook. SITE_URL wins (set it to your final domain).
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  // local network addresses (dev server, phone on the same Wi-Fi) are plain http
  const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host || '');
  const proto = h.get('x-forwarded-proto') || (local ? 'http' : 'https');
  return `${proto}://${host}`;
}
