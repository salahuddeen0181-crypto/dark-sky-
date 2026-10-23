'use client';
// Texts in all guest languages, typed by the admin. One language bar per form switches every field at once,
// shows how complete each language is and jumps to the next one with gaps (Alt+← / Alt+→ also switch).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANGS = [
  ['es', 'Español'], ['en', 'English'], ['ru', 'Русский'], ['pt', 'Português'], ['fr', 'Français'],
  ['de', 'Deutsch'], ['zh', '中文'], ['ja', '日本語'], ['hi', 'हिन्दी'], ['ar', 'العربية'],
];
const CODES = LANGS.map(([k]) => k);
const REF = ['es', 'en', 'ru'];

// Stored text (plain string or { es, en, … }) → form value with every language
export const asML = v => Object.fromEntries(CODES.map(k => [k, v && typeof v === 'object' ? v[k] || '' : k === 'es' ? v || '' : '']));
export const input = 'h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]';
export const label = 'text-xs font-semibold uppercase tracking-[.12em] text-white/55';

const isML = v => v && typeof v === 'object' && !Array.isArray(v) && CODES.every(k => typeof v[k] === 'string');
// Every multi-language field in the form (any depth) that has text in at least one language
function fields(o, out = []) {
  if (isML(o)) { if (CODES.some(k => o[k].trim())) out.push(o); }
  else if (o && typeof o === 'object') for (const v of Object.values(o)) fields(v, out);
  return out;
}
const refOf = (v, lang) => { const k = REF.find(x => x !== lang && v[x]?.trim()) || CODES.find(x => x !== lang && v[x]?.trim()); return k ? [k, v[k]] : null; };

// MARK: - Language bar
const Ctx = createContext({ lang: 'es' });

export function LangProvider({ data, children }) {
  const [lang, setLang] = useState('es');
  const all = useMemo(() => fields(data), [data]);
  const filled = useMemo(() => Object.fromEntries(CODES.map(k => [k, all.filter(v => v[k].trim()).length])), [all]);
  useEffect(() => {
    const key = e => {
      if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      setLang(l => CODES[(CODES.indexOf(l) + (e.key === 'ArrowRight' ? 1 : CODES.length - 1)) % CODES.length]);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return <Ctx.Provider value={{ lang, setLang, filled, total: all.length }}>{children}</Ctx.Provider>;
}

export function LangBar() {
  const { lang, setLang, filled, total } = useContext(Ctx);
  const gaps = CODES.filter(k => filled[k] < total);
  const next = () => { const i = CODES.indexOf(lang); const k = [...CODES.slice(i + 1), ...CODES.slice(0, i + 1)].find(x => gaps.includes(x)); if (k) setLang(k); };
  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b border-white/10 bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur">
      <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {LANGS.map(([k, name]) => {
          const done = filled[k] >= total, on = k === lang;
          return (
            <button key={k} onClick={() => setLang(k)} title={name}
              className={`flex shrink-0 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left ${on ? 'border-[#e8793c] bg-[#e8793c]/15' : 'border-white/10 hover:bg-white/5'}`}>
              <span className="text-xs font-bold uppercase">{k} <span className="font-normal normal-case text-white/60">{name}</span></span>
              <span className={`text-[11px] tabular-nums ${done ? 'text-[#9fd8a8]' : 'text-[#f2a676]'}`}>{done ? '✓ ' : ''}{filled[k]}/{total}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/45">
        <span>Язык для всех полей формы · Alt+← / Alt+→</span>
        {gaps.length > 0 && <button onClick={next} className="rounded-md border border-white/15 px-2 py-1 text-white/75 hover:text-white">Следующий незаполненный →</button>}
      </div>
    </div>
  );
}

// MARK: - Field
// One text in the language chosen on the bar; below it the Spanish (or another filled) version to translate from.
export function L3({ value, onChange, area, placeholder }) {
  const { lang } = useContext(Ctx);
  const ref = refOf(value, lang), missing = !value[lang]?.trim() && !!ref;
  const props = {
    value: value[lang] || '', dir: lang === 'ar' ? 'rtl' : 'ltr', placeholder: ref ? '' : placeholder,
    onChange: e => onChange({ ...value, [lang]: e.target.value }),
  };
  const cls = `${input} pr-10 ${missing ? 'border-[#e8793c]/60' : ''}`;
  return (
    <div className="flex flex-col gap-1">
      <label className="relative block">
        <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] font-bold uppercase text-white/35">{lang}</span>
        {area ? <textarea rows={3} {...props} className={`${cls} h-auto py-2`} /> : <input {...props} className={cls} />}
      </label>
      {ref && <span className="truncate px-1 text-xs text-white/40" title={ref[1]}><b className="uppercase">{ref[0]}</b> · {ref[1]}</span>}
    </div>
  );
}
