import 'server-only';
import crypto from 'node:crypto';
import * as D from './darksky-data';

const LANGS = D.LANGS.map(l => l.code);

// Admin item form → the item shape the menu renders. Unknown fields are dropped.
export const EDITABLE_CATS = D.CATS.filter(c => c.kind !== 'promos').map(c => c.id);

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// { es, en, ru, … } with empty languages removed — the admin types every language by hand.
function l3(o, max) {
  if (typeof o === 'string') return str(o, max) || undefined;
  const out = {};
  for (const k of LANGS) { const v = str(o?.[k], max); if (v) out[k] = v; }
  const vals = Object.values(out);
  if (!vals.length) return undefined;
  return out;
}
const price = v => (v === null || v === '' || v === undefined ? null : Math.max(0, Math.round(Number(v)) || 0));

export function cleanItem(b, existing) {
  const name = str(b.name, 80);
  if (!name) throw new Error('Укажите название');
  const cat = String(b.cat || '');
  if (!EDITABLE_CATS.includes(cat)) throw new Error('Неизвестная категория');
  const data = { name };
  const nm = l3(b.nm, 80); if (nm && typeof nm === 'object') data.nm = nm; // guest-facing name per language
  const d = l3(b.d, 600); if (d) data.d = d;
  const m = l3(b.m, 40); if (m) data.m = typeof m === 'object' && Object.keys(m).length === 1 ? Object.values(m)[0] : m;
  const variants = Array.isArray(b.v) ? b.v.map(v => ({ n: l3(v?.n, 60), p: price(v?.p) })).filter(v => v.n) : [];
  if (variants.length) { data.v = variants.slice(0, 12); data.p = data.v[0].p; } else data.p = price(b.p);
  const tags = Array.isArray(b.t) ? b.t.filter(k => k in D.TASTE) : [];
  if (tags.length) data.t = [...new Set(tags)].slice(0, 4);
  if (Array.isArray(b.str) && b.str.length === 2) {
    const a = Math.max(0, Math.min(10, Math.round(+b.str[0]))), z = Math.max(a, Math.min(10, Math.round(+b.str[1])));
    if (z > 0) data.str = [a, z];
  }
  if (b.hit) data.hit = true;
  if (b.new) data.new = true;
  if (Array.isArray(b.pair)) { const p = b.pair.map(x => str(x, 60)).filter(Boolean).slice(0, 6); if (p.length) data.pair = p; }
  if (typeof b.img === 'string' && /^[0-9a-f-]{36}$/.test(b.img)) data.img = b.img;
  else if (existing?.media && b.keepMedia !== false) data.media = existing.media;
  if (b.cut && data.img) data.cut = true; // photo with the background removed in the admin: shown on the smoky stage
  return { cat, hidden: !!b.hidden, data };
}

export function newItemId(name) {
  const slug = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'item';
  return `${slug}-${crypto.randomBytes(2).toString('hex')}`;
}

