import 'server-only';
import { db } from './db';
import * as D from './darksky-data';
import { cached, menuChanged } from './menu-cache';
import { CLIP_PATH } from './item-schema';

const LANGS = D.LANGS.map(l => l.code);

// Menu texts the admin can change: home tiles, categories, promotions, house rules. The defaults live in
// darksky-data.js; the admin's changes are one JSON in settings['content'] laid over them.
const KEY = 'content';
const hasDb = () => !!process.env.DATABASE_URL;
const PREP = Object.fromEntries(LANGS.map(l => [l, (D.UI[l] || D.UI.en).prep]));

export async function getOverrides() {
  if (!hasDb()) return {};
  return cached('content', async () => { const [r] = await db()`select value from settings where key = ${KEY}`; return r ? r.value : {}; });
}

// Dish card background: plain black (default), the grey glow with drifting smoke, or frosted glass like the home tiles.
// (Saved before as cardSmoke: true.)
export const STAGES = ['black', 'smoke', 'glass'];
const stageOf = o => (STAGES.includes(o.cardStage) ? o.cardStage : o.cardSmoke ? 'smoke' : 'black');

// MARK: - The menu's structure
// tree: [{ id, n, tag, hidden, img, cats: [{ id, n, hidden }] }] in menu order, built in the admin. Until the first
// save it comes from darksky-data.js with the older overrides (sections / cats / order) laid over it.
// Hookah has its own screen, promotions and rules are not dish lists: they stay, and hold no other categories.
const PINNED = ['promos', 'rules'], FIXED = ['hookah', ...PINNED];
const NOT_DISHES = new Set(D.CATS.filter(c => c.kind === 'promos' || c.kind === 'rules').map(c => c.id));
function baseTree(o) {
  return D.SECTIONS.map(s => {
    const order = (o.order?.[s.id] || []).filter(id => s.cats.includes(id));
    return {
      id: s.id, n: o.sections?.[s.id]?.n || s.n, tag: o.sections?.[s.id]?.tag || s.tag, hidden: false, img: null,
      cats: [...order, ...s.cats.filter(id => !order.includes(id))].map(id => ({ id, n: o.cats?.[id]?.n || D.CATS.find(c => c.id === id).n, hidden: !!o.cats?.[id]?.hidden })),
    };
  });
}
const treeOf = o => o.tree || baseTree(o);

// The shapes DarkskyMenu reads: { SECTIONS, CATS, PROMOS, PROMO_NOTE, RULES, PREP }. A hidden section hides its dishes too.
export async function getContent() {
  const o = await getOverrides().catch(e => { console.error('content', e); return {}; });
  const tree = treeOf(o);
  const CATS = [
    ...tree.flatMap(s => s.cats.map(c => ({ ...D.CATS.find(x => x.id === c.id), id: c.id, n: c.n, hidden: !!(c.hidden || s.hidden) }))),
    ...D.CATS.filter(c => NOT_DISHES.has(c.id)).map(c => ({ ...c, hidden: false })),
  ];
  const SECTIONS = tree.filter(s => !s.hidden).map(s => {
    const b = D.SECTIONS.find(x => x.id === s.id);
    return { ...b, id: s.id, n: s.n, tag: s.tag, img: s.img ? '/api/img/' + s.img : null, clip: s.img ? null : s.video || b?.clip || null, cats: s.cats.filter(c => !c.hidden).map(c => c.id) };
  });
  // rules2: the house rules in their 2026-10 shape (tabs «Prohibited» / «General»); older saved rules are ignored
  const r = o.rules2 || {};
  return {
    BADGES: o.badges || D.BADGES, // [{ k, n, bg, color }] in the order they are shown
    TASTE: o.tastes || D.TASTE, // taste tags { key: { es, en, … } }, edited in the admin as a whole list
    CARD_STAGE: stageOf(o), // what is behind the dishes on their cards: 'black' | 'smoke' | 'glass'
    NAV_SMOKE: o.navSmoke !== false, // a little smoke when moving between menu sections (off: just a fade)
    SECTIONS, CATS, PROMOS: o.promos || D.PROMOS, PROMO_NOTE: o.promoNote || D.PROMO_NOTE, PREP: o.prep || PREP,
    RULES: { ...D.RULES, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) },
  };
}

// Categories a dish can belong to (hidden ones too), for the admin and the staff; name: Russian, else any language
const ruName = v => (v && typeof v === 'object' ? v.ru || v.es || v.en || Object.values(v)[0] || '' : v || '');
export async function editableCats() {
  const { CATS } = await getContent();
  return CATS.filter(c => !NOT_DISHES.has(c.id)).map(c => ({ id: c.id, name: ruName(c.n) }));
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

// [{ k, n }] from the editor → { key: names }; a new tag gets a key from its name, a nameless one is dropped
const TASTE_KEY = /^[a-z0-9-]{1,24}$/;
function cleanTastes(list) {
  const out = {};
  for (const t of list.slice(0, 40)) {
    const n = clean(t?.n, 30);
    if (!n) continue;
    let k = TASTE_KEY.test(t.k) ? t.k : String((typeof n === 'string' ? n : n.en || n.es || Object.values(n)[0]) || 'taste')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'taste';
    while (out[k]) k = k.slice(0, 20) + '-' + Math.floor(Math.random() * 90 + 10);
    out[k] = typeof n === 'string' ? { es: n } : n;
  }
  return out;
}

// A problem the admin can fix: shown to them as it is
export class ContentError extends Error {}

// The editor's sections + category names → the stored tree. The fixed sections always stay; promotions and rules go last.
const NODE_ID = /^[a-z0-9-]{1,40}$/, IMG_ID = /^[0-9a-f-]{36}$/;
function cleanTree(list, names, current) {
  const secs = new Set(), cats = new Set(), out = [];
  for (const s of list.slice(0, 30)) {
    if (!NODE_ID.test(s?.id) || secs.has(s.id)) continue;
    secs.add(s.id);
    const n = clean(s.n, 40);
    if (!n) throw new ContentError('У каждого раздела должно быть название');
    const own = PINNED.includes(s.id) ? [] : s.id === 'hookah' ? ['hookah'] : (Array.isArray(s.cats) ? s.cats : []).filter(id => NODE_ID.test(id) && id !== 'hookah' && !NOT_DISHES.has(id));
    const nodes = own.filter(id => !cats.has(id)).slice(0, 40).map(id => {
      cats.add(id);
      const name = clean(names?.[id]?.n, 40);
      if (!name) throw new ContentError('У каждой категории должно быть название');
      return { id, n: name, hidden: !!names[id].hidden };
    });
    out.push({ id: s.id, n, tag: clean(s.tag, 120), hidden: !!s.hidden && s.id !== 'rules', img: IMG_ID.test(s.img || '') ? s.img : null, video: CLIP_PATH.test(s.video || '') ? s.video : null, cats: nodes });
  }
  for (const id of FIXED) if (!secs.has(id)) out.push(current.find(s => s.id === id));
  return [...out.filter(s => !PINNED.includes(s.id)), ...PINNED.map(id => out.find(s => s.id === id))];
}
// A category can't go away with dishes in it, or they would vanish from the menu
async function dishCounts() {
  const rows = await db()`select cat, count(*)::int as n from menu_items group by cat`;
  return Object.fromEntries(rows.map(r => [r.cat, r.n]));
}
async function keepDishes(tree, current) {
  const kept = new Set(tree.flatMap(s => s.cats.map(c => c.id))), name = id => current.flatMap(s => s.cats).find(c => c.id === id)?.n;
  for (const [cat, n] of Object.entries(await dishCounts())) {
    if (!kept.has(cat) && !NOT_DISHES.has(cat)) throw new ContentError(`В категории «${ruName(name(cat)) || cat}» ${n} поз.: сначала перенесите их в другую категорию`);
  }
}

// The editor's list → what is stored; hit and new always stay, a nameless badge is dropped
const HEX = /^#[0-9a-f]{6}$/i;
function cleanBadges(list) {
  const out = list.slice(0, 20).flatMap(b => {
    const n = clean(b?.n, 24), def = D.BADGES.find(x => x.k === b?.k);
    if (!TASTE_KEY.test(b?.k || '') || (!n && !def)) return [];
    return [{ k: b.k, n: n || def.n, bg: HEX.test(b.bg) ? b.bg : '#e8793c', color: HEX.test(b.color) ? b.color : '#050507' }];
  });
  return [...D.BADGES.filter(d => !out.some(b => b.k === d.k)), ...out];
}

export async function saveContent(input) {
  // keep only known fields; texts in the languages the admin filled
  // the menu's structure (which sections and categories, their order, names and hiding) is edited on the «Меню» page
  // (saveTree); from here only the home tiles' look: a section's subtitle, picture or video
  const current = treeOf(await getOverrides()), given = Array.isArray(input.sections) ? input.sections : [];
  const list = current.map(s => {
    const i = given.find(x => x?.id === s.id);
    return { id: s.id, n: s.n, tag: i ? i.tag : s.tag, hidden: s.hidden, img: i ? i.img : s.img, video: i ? i.video : s.video, cats: s.cats.map(c => c.id) };
  });
  const tree = cleanTree(list, Object.fromEntries(current.flatMap(s => s.cats).map(c => [c.id, c])), current);
  const c = {
    tree,
    tastes: Array.isArray(input.tastes) ? cleanTastes(input.tastes) : undefined,
    badges: Array.isArray(input.badges) ? cleanBadges(input.badges) : undefined,
    prep: clean(input.prep, 60), promoNote: clean(input.promoNote, 200), cardStage: STAGES.includes(input.cardStage) ? input.cardStage : 'black', navSmoke: input.navSmoke !== false,
    promos: Array.isArray(input.promos) ? input.promos.slice(0, 12).map(p => ({
      tag: clean(p.tag, 60), title: clean(p.title, 60), big: String(p.big || '').trim().slice(0, 20), d: clean(p.d, 200),
      window: Array.isArray(p.window) && p.window.length === 2 ? p.window.map(h => Math.max(0, Math.min(24, Math.round(+h) || 0))) : null,
    })).filter(p => p.title) : undefined,
    rules2: input.rules ? {
      title: clean(input.rules.title, 40), noTitle: clean(input.rules.noTitle, 40), generalTitle: clean(input.rules.generalTitle, 40), ok: clean(input.rules.ok, 30),
      no: (input.rules.no || []).map(x => clean(x)).filter(Boolean).slice(0, 15),
      general: (input.rules.general || []).map(x => clean(x)).filter(Boolean).slice(0, 15),
    } : undefined,
  };

  await db()`insert into settings (key, value) values (${KEY}, ${db().json(c)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  menuChanged();
}

// The menu's structure from the «Меню» page: { sections: [{ id, n, hidden, cats: [ids] }], cats: { id: { n, hidden } } }.
// Only the tree changes; a section keeps its subtitle and picture, the rest of the content stays as it is.
export async function saveTree(input) {
  const o = await getOverrides(), current = treeOf(o);
  const list = (Array.isArray(input?.sections) ? input.sections : []).map(s => {
    const c = current.find(x => x.id === s?.id);
    return { ...s, tag: c?.tag ?? null, img: c?.img ?? null, video: c?.video ?? null };
  });
  const tree = cleanTree(list, input?.cats || {}, current);
  await keepDishes(tree, current);
  await db()`insert into settings (key, value) values (${KEY}, ${db().json({ ...o, tree })})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  menuChanged();
}

// MARK: - Editor
// The structure for the «Меню» page, names in every language; hidden sections and categories too
export async function getTreeForm() {
  const tree = treeOf(await getOverrides());
  return {
    sections: tree.map(s => ({ id: s.id, n: asForm(s.n), hidden: !!s.hidden, cats: s.cats.map(c => c.id) })),
    cats: Object.fromEntries(tree.flatMap(s => s.cats).map(c => [c.id, { n: asForm(c.n), hidden: !!c.hidden }])),
  };
}

// Everything the content editor shows, texts in every language; hidden sections and categories too.
export async function getContentForm() {
  const o = await getOverrides(), cur = await getContent(), f = asForm, tree = treeOf(o);
  const R = cur.RULES;
  return {
    sections: tree.map(s => ({ id: s.id, n: f(s.n), tag: f(s.tag), hidden: !!s.hidden, img: s.img || null, video: s.video || null, clip: D.SECTIONS.find(x => x.id === s.id)?.clip || null, cats: s.cats.map(c => c.id) })),
    cats: Object.fromEntries(tree.flatMap(s => s.cats).map(c => [c.id, { n: f(c.n), hidden: !!c.hidden }])),
    dishes: await dishCounts(),
    tastes: Object.entries(cur.TASTE).map(([k, n]) => ({ k, n: f(n) })),
    badges: cur.BADGES.map(b => ({ ...b, n: f(b.n) })),
    prep: f(cur.PREP), promoNote: f(cur.PROMO_NOTE), cardStage: cur.CARD_STAGE, navSmoke: cur.NAV_SMOKE,
    promos: cur.PROMOS.map(p => ({ tag: f(p.tag), title: f(p.title), big: p.big || '', d: f(p.d), window: p.window || null })),
    rules: { title: f(R.title), noTitle: f(R.noTitle), generalTitle: f(R.generalTitle), ok: f(R.ok), no: R.no.map(f), general: R.general.map(f) },
  };
}
