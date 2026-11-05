'use client';
import { useState } from 'react';
import { L3, label, asML } from '../L3';
import TilePicture from './TilePicture';
import CatRow, { stepBtn, textBtn, mlName } from './CatRow';

const FIXED = ['hookah', 'promos', 'rules'], PINNED = ['promos', 'rules'];
const newId = p => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 900 + 100)}`;
const moved = (list, i, k) => { const out = [...list]; [out[i], out[k]] = [out[k], out[i]]; return out; };
const plural = (n, one, few, many) => { const t = n % 10, h = n % 100; return t === 1 && h !== 11 ? one : t >= 2 && t <= 4 && (h < 12 || h > 14) ? few : many; };

// The menu's structure: sections (home tiles) and the categories inside them, as a list of rows; one section opens
// at a time, its categories first. Hookah, promotions and rules always stay.
export default function SectionsEditor({ c, set, saved = {} }) {
  const [open, setOpen] = useState(null), [openCat, setOpenCat] = useState(null);
  const dishes = id => c.dishes?.[id] || 0;
  const setSection = (i, patch) => set({ sections: c.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const setCat = (id, patch) => set({ cats: { ...c.cats, [id]: { ...c.cats[id], ...patch } } });
  const lastDish = c.sections.findLastIndex(s => !PINNED.includes(s.id));

  // MARK: - Actions
  const addSection = () => {
    const s = { id: newId('s'), n: asML(''), tag: asML(''), hidden: false, img: null, video: null, clip: null, cats: [] };
    set({ sections: [...c.sections.slice(0, lastDish + 1), s, ...c.sections.slice(lastDish + 1)] });
    setOpen(s.id); setOpenCat(null);
  };
  const removeSection = i => {
    if (!confirm(`Удалить раздел «${mlName(c.sections[i].n, 'Без названия')}»?`)) return;
    set({ sections: c.sections.filter((_, k) => k !== i) }); setOpen(null);
  };
  const addCat = i => {
    const id = newId('c');
    set({ cats: { ...c.cats, [id]: { n: asML(''), hidden: false } }, sections: c.sections.map((s, k) => (k === i ? { ...s, cats: [...s.cats, id] } : s)) });
    setOpenCat(id);
  };
  const moveCat = (i, id, to) => {
    set({ sections: c.sections.map((s, k) => (k === i ? { ...s, cats: s.cats.filter(x => x !== id) } : s.id === to ? { ...s, cats: [...s.cats, id] } : s)) });
    setOpenCat(null);
  };
  const toggle = id => { setOpen(o => (o === id ? null : id)); setOpenCat(null); };

  // MARK: - Open section
  const body = (s, i) => {
    const held = s.cats.reduce((n, id) => n + dishes(id), 0);
    const targets = c.sections.filter(x => x.id !== s.id && !FIXED.includes(x.id)).map(x => ({ id: x.id, name: mlName(x.n, 'Без названия') }));
    return (
      <div className="flex flex-col gap-4 border-t border-white/10 p-3">
        {!FIXED.includes(s.id) && (
          <div className="flex flex-col gap-2">
            <span className={label}>Категории <span className="normal-case tracking-normal text-white/35">— вкладки внутри раздела</span></span>
            {s.cats.map((id, j) => (
              <CatRow key={id} id={id} saved={!!saved[id]} cat={c.cats[id]} dishes={dishes(id)} open={openCat === id} onToggle={() => setOpenCat(o => (o === id ? null : id))}
                onChange={patch => setCat(id, patch)} first={!j} last={j === s.cats.length - 1}
                onUp={() => setSection(i, { cats: moved(s.cats, j, j - 1) })} onDown={() => setSection(i, { cats: moved(s.cats, j, j + 1) })}
                targets={targets} onMove={to => moveCat(i, id, to)} onRemove={() => setSection(i, { cats: s.cats.filter(x => x !== id) })} />
            ))}
            <button onClick={() => addCat(i)} className="h-12 rounded-xl border border-dashed border-white/25 text-sm text-white/75 hover:bg-white/5">+ Категория</button>
          </div>
        )}
        <div className="flex flex-col gap-2"><span className={label}>Название раздела</span><L3 value={s.n} onChange={n => setSection(i, { n })} placeholder="Например: Десерты" /></div>
        <div className="flex flex-col gap-2"><span className={label}>Подпись на плитке</span><L3 value={s.tag} onChange={tag => setSection(i, { tag })} /></div>
        {s.id === 'hookah' && <div className="flex flex-col gap-2"><span className={label}>Строка под кальянами</span><L3 value={c.prep} onChange={prep => set({ prep })} placeholder="Приготовление 10–15 мин" /></div>}
        {s.id !== 'rules' && <TilePicture s={s} onChange={patch => setSection(i, patch)} />}
        <div className="flex gap-2">
          {s.id !== 'rules' && <button onClick={() => setSection(i, { hidden: !s.hidden })} className={`${textBtn} flex-1`}>{s.hidden ? 'Показать раздел' : 'Скрыть раздел'}</button>}
          {!FIXED.includes(s.id) && <button onClick={() => removeSection(i)} disabled={held > 0} className={`${textBtn} flex-1`}>Удалить раздел</button>}
        </div>
        {!FIXED.includes(s.id) && held > 0 && <span className="-mt-2 text-xs text-white/40">Удалить можно пустой раздел: в нём {held} поз.</span>}
      </div>
    );
  };

  // MARK: - List
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white/45">Нажмите на раздел, чтобы открыть его категории и настройки. Первый раздел — большая плитка на главной. Пустые разделы и категории гости не видят; позиции в новые категории добавляются на странице «Меню» после сохранения.</p>
      {c.sections.map((s, i) => {
        const pinned = PINNED.includes(s.id), on = open === s.id, held = s.cats.reduce((n, id) => n + dishes(id), 0);
        const info = FIXED.includes(s.id) ? (s.id === 'hookah' ? `${held} поз.` : 'Служебный раздел') : `${s.cats.length} ${plural(s.cats.length, 'категория', 'категории', 'категорий')} · ${held} поз.`;
        return (
          <div key={s.id} className={`rounded-2xl border bg-[#0e0e13] ${on ? 'border-white/25' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 p-2">
              <button onClick={() => toggle(s.id)} className="flex min-h-12 min-w-0 flex-1 flex-col justify-center px-2 text-left">
                <span className={`truncate font-semibold ${s.hidden ? 'text-white/40' : ''}`}>{mlName(s.n, 'Новый раздел')}{s.hidden && <span className="ml-2 rounded-md bg-white/10 px-1.5 py-0.5 align-middle text-[10px] font-normal uppercase text-white/55">Скрыт</span>}</span>
                <span className={`text-xs ${!FIXED.includes(s.id) && !held ? 'text-[#f2a676]' : 'text-white/45'}`}>{info}{!FIXED.includes(s.id) && !held ? ' · гости не видят, пока нет позиций' : ''}</span>
              </button>
              {!pinned && <>
                <button onClick={() => set({ sections: moved(c.sections, i, i - 1) })} disabled={!i} className={stepBtn} aria-label="Раздел выше">↑</button>
                <button onClick={() => set({ sections: moved(c.sections, i, i + 1) })} disabled={i >= lastDish} className={stepBtn} aria-label="Раздел ниже">↓</button>
              </>}
              <button onClick={() => toggle(s.id)} className="h-11 w-8 flex-none text-white/40" aria-label={on ? 'Свернуть' : 'Открыть'}><span className={`inline-block transition ${on ? 'rotate-90' : ''}`}>›</span></button>
            </div>
            {on && body(s, i)}
          </div>
        );
      })}
      <button onClick={addSection} className="h-12 rounded-2xl border border-dashed border-white/25 text-sm text-white/75 hover:bg-white/5">+ Раздел</button>
    </div>
  );
}
