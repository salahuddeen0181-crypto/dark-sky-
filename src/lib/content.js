import 'server-only';
import { db } from './db';
import * as D from './darksky-data';

const LANGS = D.LANGS.map(l => l.code);

// Menu texts the admin can change: home tiles, categories, promotions, house rules. The defaults live in
// darksky-data.js; the admin's changes are one JSON in settings['content'] laid over them.
const KEY = 'content';
const hasDb = () => !!process.env.DATABASE_URL;
const PREP = Object.fromEntries(LANGS.map(l => [l, (D.UI[l] || D.UI.en).prep]));

export async function getOverrides() {
  if (!hasDb()) return {};
  const [r] = await db()`select value from settings where key = ${KEY}`;
  return r ? r.value : {};
}

// The shapes DarkskyMenu reads: { SECTIONS, CATS, PROMOS, PROMO_NOTE, RULES, PREP }
export async function getContent() {
  const o = await getOverrides().catch(e => { console.error('content', e); return {}; });
  const CATS = D.CATS.map(c => ({ ...c, n: o.cats?.[c.id]?.n || c.n, hidden: !!o.cats?.[c.id]?.hidden }));
  const hidden = new Set(CATS.filter(c => c.hidden).map(c => c.id));
  const SECTIONS = D.SECTIONS.map(s => {
    const order = (o.order?.[s.id] || []).filter(id => s.cats.includes(id));
    const cats = [...order, ...s.cats.filter(id => !order.includes(id))].filter(id => !hidden.has(id));
    return { ...s, n: o.sections?.[s.id]?.n || s.n, tag: o.sections?.[s.id]?.tag || s.tag, cats };
  });
  const r = o.rules || {};
  return {
    CARD_SMOKE: !!o.cardSmoke, // smoke behind the dishes on their cards (off: plain black)
    SECTIONS, CATS, PROMOS: o.promos || D.PROMOS, PROMO_NOTE: o.promoNote || D.PROMO_NOTE, PREP: o.prep || PREP,
    RULES: { ...D.RULES, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) },
  };
}

// Dishes of hidden categories are left out of the guest menu entirely (search and "house favourites" too).
export const visibleItems = (items, content) => {
  const hidden = new Set(content.CATS.filter(c => c.hidden).map(c => c.id));
  return hidden.size ? items.filter(i => !hidden.has(i.cat)) : items;
};

// MARK: - Saving
// Form value (every language) ↔ stored text. Only Spanish filled → a plain string: the same for every guest,
// which is how language-neutral texts like "Business Hookah" or "14:00 – 17:00" are kept.
export const asForm = v => Object.fromEntries(LANGS.map(l => [l, v && typeof v === 'object' ? v[l] || '' : l === 'es' ? v || '' : '']));
const clean = (v, max = 300) => {
  if (typeof v === 'string') return v.trim().slice(0, max) || null;
  if (!v || typeof v !== 'object') return null;
  const o = Object.fromEntries(LANGS.map(l => [l, String(v[l] || '').trim().slice(0, max)]).filter(([, x]) => x));
  const keys = Object.keys(o);
  return !keys.length ? null : keys.length === 1 && keys[0] === 'es' ? o.es : o;
};

export async function saveContent(input) {
  // keep only known fields; texts in the languages the admin filled
  const ids = new Set(D.SECTIONS.map(s => s.id)), catIds = new Set(D.CATS.map(c => c.id));
  const c = {
    sections: Object.fromEntries(Object.entries(input.sections || {}).filter(([id]) => ids.has(id)).map(([id, s]) => [id, { n: clean(s.n, 40), tag: clean(s.tag, 120) }])),
    cats: Object.fromEntries(Object.entries(input.cats || {}).filter(([id]) => catIds.has(id)).map(([id, x]) => [id, { n: clean(x.n, 40), hidden: !!x.hidden }])),
    order: Object.fromEntries(Object.entries(input.order || {}).filter(([id]) => ids.has(id)).map(([id, l]) => [id, (Array.isArray(l) ? l : []).filter(x => catIds.has(x))])),
    prep: clean(input.prep, 60), promoNote: clean(input.promoNote, 200), cardSmoke: !!input.cardSmoke,
    promos: Array.isArray(input.promos) ? input.promos.slice(0, 12).map(p => ({
      tag: clean(p.tag, 60), title: clean(p.title, 60), big: String(p.big || '').trim().slice(0, 20), d: clean(p.d, 200),
      window: Array.isArray(p.window) && p.window.length === 2 ? p.window.map(h => Math.max(0, Math.min(24, Math.round(+h) || 0))) : null,
    })).filter(p => p.title) : undefined,
    rules: input.rules ? {
      peopleTitle: clean(input.rules.peopleTitle, 60), peopleUnit: clean(input.rules.peopleUnit, 30), noTitle: clean(input.rules.noTitle, 40), liability: clean(input.rules.liability, 400),
      people: (input.rules.people || []).slice(0, 8).map(([g, n]) => [String(g).slice(0, 10), Math.max(1, Math.min(9, Math.round(+n) || 1))]),
      info: (input.rules.info || []).map(x => clean(x)).filter(Boolean).slice(0, 12),
      no: (input.rules.no || []).map(x => clean(x)).filter(Boolean).slice(0, 12),
    } : undefined,
  };

  await db()`insert into settings (key, value) values (${KEY}, ${db().json(c)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

// MARK: - Editor
// Everything the content editor shows, texts in every language; categories in their current order, hidden ones too.
export async function getContentForm() {
  const o = await getOverrides(), cur = await getContent(), f = asForm;
  const catsOf = s => { const order = (o.order?.[s.id] || []).filter(id => s.cats.includes(id)); return [...order, ...s.cats.filter(id => !order.includes(id))]; };
  const R = cur.RULES;
  return {
    sections: D.SECTIONS.map(s => { const c = cur.SECTIONS.find(x => x.id === s.id); return { id: s.id, n: f(c.n), tag: f(c.tag), cats: catsOf(s) }; }),
    cats: Object.fromEntries(cur.CATS.map(c => [c.id, { n: f(c.n), hidden: c.hidden }])),
    prep: f(cur.PREP), promoNote: f(cur.PROMO_NOTE), cardSmoke: cur.CARD_SMOKE,
    promos: cur.PROMOS.map(p => ({ tag: f(p.tag), title: f(p.title), big: p.big || '', d: f(p.d), window: p.window || null })),
    rules: {
      peopleTitle: f(R.peopleTitle), peopleUnit: f(R.peopleUnit), noTitle: f(R.noTitle), liability: f(R.liability),
      people: R.people.map(([g, n]) => [g, n]), info: R.info.map(f), no: R.no.map(f),
    },
  };
}
