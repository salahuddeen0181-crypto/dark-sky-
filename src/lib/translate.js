import 'server-only';

// NOT USED at the moment: the admin types every language by hand. Kept to switch automatic translation back on
// (wire fillLanguages() into item-schema.js / content.js and set DEEPSEEK_API_KEY).

// Menu texts into all guest languages via DeepSeek (OpenAI-compatible chat API, JSON mode).
// The admin writes es / en / ru (any of them); the rest is filled in here. Without DEEPSEEK_API_KEY nothing is
// translated and the caller shows a warning.
export const LANGS = ['en', 'es', 'ru', 'zh', 'hi', 'ar', 'fr', 'pt', 'de', 'ja'];
const SOURCE = ['es', 'en', 'ru'];
// A plain string (a dish name) has no language attached
const asSource = v => (typeof v === 'string' ? { text: v } : Object.fromEntries(SOURCE.filter(l => v[l]).map(l => [l, v[l]])));
export const translateReady = () => !!process.env.DEEPSEEK_API_KEY;

const SYSTEM = `You translate the digital menu of DARKSKY, a hookah lounge in Buenos Aires.
Input: json {"items": [{"key": "...", "es": "...", "en": "...", "ru": "..."}]} — some languages may be missing; "text" instead means a source in an unknown language (e.g. a dish name).
Output: json {"items": {"<key>": {"en": "", "es": "", "ru": "", "zh": "", "hi": "", "ar": "", "fr": "", "pt": "", "de": "", "ja": ""}}} with every key and all 10 languages.
Rules: keep the languages given in the input exactly as written; translate the missing ones from them (prefer Spanish, then English, then Russian as the source).
For "text": fill all 10 languages; a proper name (brand, product line, cocktail) stays the same in Latin-script languages and is transliterated only where Latin letters would be unreadable.
Short natural menu style, same length and punctuation as the source. Do not translate brand names, hookah lines, cocktail names, tobacco flavours used as names, or words like "Philadelphia", "Business Hookah".
Keep numbers, prices, "$", "%", times and units (g, ml, cl) unchanged. Use "hookah" in the local word guests understand (es: hookah, ru: кальян, ar: شيشة).`;

// fields: [{ key, value: { es?, en?, ru?, ... } }] → { key: { en, es, …, ja } }
export async function translate(fields) {
  if (!fields.length) return {};
  if (!translateReady()) throw new Error('not_configured');
  const items = fields.map(f => ({ key: f.key, ...asSource(f.value) }));
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({ items }) }],
      response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(45e3),
  });
  if (!r.ok) throw new Error(`deepseek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const out = JSON.parse(j.choices?.[0]?.message?.content || '{}').items || {};
  // the admin's own words always win over the model's
  return Object.fromEntries(fields.map(f => {
    const t = out[f.key] || {};
    const own = asSource(f.value), fallback = own.text || own.en || own.es || own.ru || '';
    return [f.key, Object.fromEntries(LANGS.map(l => [l, own[l] || String(t[l] || '').trim() || fallback]))];
  }));
}

// When the admin rewrites a text in one language, that language is the source: the languages left as they were
// still hold the old wording and get translated again from the new one.
const edited = (was, v) => {
  if (!was || typeof was !== 'object' || typeof v !== 'object') return v;
  const changed = Object.fromEntries(SOURCE.filter(l => v[l] && v[l] !== was[l]).map(l => [l, v[l]]));
  return Object.keys(changed).length ? changed : v;
};
const same = (a, b) => JSON.stringify(asSource(a ?? '')) === JSON.stringify(asSource(b ?? ''));

// Translate only new or edited texts. next: { key: source } (a string, or { es, en, ru }); prev: { key: { source, full } } —
// what was written last time and its stored translations. Unchanged texts keep what they have,
// so editing a price never costs a request and existing dishes keep their translations. Returns { values: { key: 10-language object }, translated, warning }.
export async function fillLanguages(next, prev = {}) {
  const values = {}, todo = [];
  for (const [key, v] of Object.entries(next)) {
    if (v == null || v === '' || (typeof v === 'object' && !Object.keys(asSource(v)).length)) continue;
    const old = prev[key];
    // unchanged text keeps whatever translations it already has — existing dishes are never re-translated
    if (old && old.source != null && same(old.source, v)) {
      if (old.full && typeof old.full === 'object') values[key] = typeof v === 'string' ? old.full : { ...old.full, ...asSource(v) };
      else if (typeof v !== 'string') values[key] = v;
      continue;
    }
    values[key] = typeof v === 'string' ? null : v;
    todo.push({ key, value: edited(old?.source, v) });
  }
  const keepSource = () => { for (const k of Object.keys(values)) if (values[k] == null) delete values[k]; };
  if (!todo.length) return { values, translated: 0 };
  if (!translateReady()) { keepSource(); return { values, translated: 0, warning: 'Автоперевод не настроен (нет DEEPSEEK_API_KEY): другие языки покажут английский или испанский текст' }; }
  try {
    const done = await translate(todo);
    for (const { key } of todo) values[key] = done[key];
    return { values, translated: todo.length };
  } catch (e) {
    console.error('translate', e);
    keepSource();
    return { values, translated: 0, warning: 'Не удалось перевести (DeepSeek недоступен) — сохранено без перевода' };
  }
}
