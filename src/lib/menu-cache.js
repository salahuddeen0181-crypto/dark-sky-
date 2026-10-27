import 'server-only';

// The guest menu is read on every page open but changes only from the admin: the dishes and the content settings
// stay in server memory, dropped on every admin edit (menuChanged) and in any case after a minute (scripts that
// write to the database directly).
const C = (globalThis.__darkskyMenuCache ||= new Map());
const TTL = 60e3;

export async function cached(key, load) {
  const c = C.get(key);
  if (c && Date.now() - c.at < TTL) return c.v;
  const v = load();
  C.set(key, { v, at: Date.now() });
  try { return await v; } catch (e) { C.delete(key); throw e; } // a failed read is not kept
}
export const menuChanged = () => C.clear();
