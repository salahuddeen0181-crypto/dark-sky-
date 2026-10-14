import 'server-only';
import postgres from 'postgres';

// One pooled client per server instance (kept on globalThis so dev hot-reload doesn't leak connections).
// DATABASE_URL: Supabase → Connect → Transaction pooler connection string (port 6543).
export function db() {
  if (!globalThis.__darkskySql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    globalThis.__darkskySql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
  }
  return globalThis.__darkskySql;
}
