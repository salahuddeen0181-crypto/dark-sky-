'use client';
import { useState } from 'react';
import { api, thumb } from '../api';
import { shrink } from '../PhotoPanel';
import { L3, label, asML } from '../L3';

const FIXED = ['hookah', 'promos', 'rules'], PINNED = ['promos', 'rules'];
const newId = p => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 900 + 100)}`;
const stepBtn = 'h-9 w-9 flex-none rounded-lg border border-white/15 disabled:opacity-30';
const textBtn = 'h-9 rounded-lg border border-white/15 px-3 text-sm text-white/75 hover:bg-white/5 disabled:opacity-40';

// The tile's picture: uploaded here, or the built-in clip's still until one is
function TilePicture({ s, onChange }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const src = s.img ? thumb(s.img) : s.clip ? s.clip.split('#')[0].replace(/\.webm$/i, '-th.webp') : null;
  async function upload(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try { onChange((await api('/api/admin/images', 'POST', await shrink(file))).id); }
    catch (x) { setErr(x.message || 'Не получилось'); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>Картинка плитки</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-20 w-28 flex-none overflow-hidden rounded-xl border border-white/10 bg-black">
          {src && <img src={src} alt="" className="h-full w-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */}
        </div>
        <label className={`${textBtn} flex cursor-pointer items-center`}>
          {busy ? 'Загрузка…' : s.img || s.clip ? 'Заменить' : 'Загрузить'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={e => { upload(e.target.files[0]); e.target.value = ''; }} />
        </label>
        {s.img && <button onClick={() => onChange(null)} className={textBtn}>{s.clip ? 'Вернуть видео' : 'Убрать'}</button>}
        {err && <span className="text-xs text-[#f2a676]">{err}</span>}
      </div>
    </div>
  );
}

// The menu's structure: sections (home tiles) and the categories inside them.
// Add, remove, reorder, hide, move a category to another section; hookah, promotions and rules always stay.
export default function SectionsEditor({ c, set }) {
  const dishes = id => c.dishes?.[id] || 0;
  const name = s => s.n.ru || s.n.es || s.n.en || Object.values(s.n).find(Boolean) || 'Без названия';
  const setSection = (i, patch) => set({ sections: c.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const setCat = (id, patch) => set({ cats: { ...c.cats, [id]: { ...c.cats[id], ...patch } } });
  const moved = (list, i, k) => { const out = [...list]; [out[i], out[k]] = [out[k], out[i]]; return out; };

  const lastDish = c.sections.findLastIndex(s => !PINNED.includes(s.id));
  const addSection = () => {
    const s = { id: newId('s'), n: asML(''), tag: asML(''), hidden: false, img: null, clip: null, cats: [] };
    set({ sections: [...c.sections.slice(0, lastDish + 1), s, ...c.sections.slice(lastDish + 1)] });
  };
  const removeSection = (i) => {
    if (confirm(`Удалить раздел «${name(c.sections[i])}»?`)) set({ sections: c.sections.filter((_, k) => k !== i) });
  };
  const addCat = i => {
    const id = newId('c');
    set({ cats: { ...c.cats, [id]: { n: asML(''), hidden: false } }, sections: c.sections.map((s, k) => (k === i ? { ...s, cats: [...s.cats, id] } : s)) });
  };
  const removeCat = (i, id) => setSection(i, { cats: c.sections[i].cats.filter(x => x !== id) });
  const moveCat = (i, id, to) => set({ sections: c.sections.map((s, k) => (k === i ? { ...s, cats: s.cats.filter(x => x !== id) } : s.id === to ? { ...s, cats: [...s.cats, id] } : s)) });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
        <span className={label}>Строка под кальянами</span>
        <L3 value={c.prep} onChange={prep => set({ prep })} placeholder="Приготовление 10–15 мин" />
      </div>
      <p className="text-xs text-white/45">Первый раздел становится большой плиткой на главной. Раздел или категория без блюд не видны гостям, пока их не наполнят. После сохранения новые категории появятся на странице «Меню»: там в них добавляются позиции.</p>

      {c.sections.map((s, i) => {
        const pinned = PINNED.includes(s.id), held = s.cats.reduce((n, id) => n + dishes(id), 0);
        return (
          <div key={s.id} className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4 ${s.hidden ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              {!pinned && <>
                <button onClick={() => set({ sections: moved(c.sections, i, i - 1) })} disabled={!i} className={stepBtn} aria-label="Раздел выше">↑</button>
                <button onClick={() => set({ sections: moved(c.sections, i, i + 1) })} disabled={i >= lastDish} className={stepBtn} aria-label="Раздел ниже">↓</button>
              </>}
              <span className="min-w-0 flex-1 truncate font-semibold">{name(s)}</span>
              {s.id !== 'rules' && <label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={!!s.hidden} onChange={e => setSection(i, { hidden: e.target.checked })} /> Скрыть</label>}
              {!FIXED.includes(s.id) && <button onClick={() => removeSection(i)} disabled={held > 0} title={held ? `Сначала перенесите ${held} поз. в другие категории` : ''} className={textBtn}>Удалить</button>}
            </div>
            <div className="flex flex-col gap-2"><span className={label}>Название</span><L3 value={s.n} onChange={n => setSection(i, { n })} /></div>
            <div className="flex flex-col gap-2"><span className={label}>Подпись</span><L3 value={s.tag} onChange={tag => setSection(i, { tag })} /></div>
            {s.id !== 'rules' && <TilePicture s={s} onChange={img => setSection(i, { img })} />}

            {!FIXED.includes(s.id) && (
              <div className="flex flex-col gap-2">
                <span className={label}>Категории <span className="normal-case tracking-normal text-white/35">— вкладки внутри раздела</span></span>
                {s.cats.map((id, j) => (
                  <div key={id} className={`flex flex-col gap-2 rounded-xl border border-white/10 p-2 ${c.cats[id].hidden ? 'opacity-50' : ''}`}>
                    <L3 value={c.cats[id].n} onChange={n => setCat(id, { n })} />
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setSection(i, { cats: moved(s.cats, j, j - 1) })} disabled={!j} className={stepBtn} aria-label="Выше">↑</button>
                      <button onClick={() => setSection(i, { cats: moved(s.cats, j, j + 1) })} disabled={j === s.cats.length - 1} className={stepBtn} aria-label="Ниже">↓</button>
                      <span className="text-xs text-white/45">{dishes(id)} поз.</span>
                      <select value="" onChange={e => e.target.value && moveCat(i, id, e.target.value)} aria-label="Перенести в раздел" className="h-9 max-w-44 rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white/75">
                        <option value="" className="bg-[#111]">Перенести в…</option>
                        {c.sections.filter(x => x.id !== s.id && !FIXED.includes(x.id)).map(x => <option key={x.id} value={x.id} className="bg-[#111]">{name(x)}</option>)}
                      </select>
                      <label className="ml-auto flex items-center gap-2 px-1 text-sm text-white/75"><input type="checkbox" checked={c.cats[id].hidden} onChange={e => setCat(id, { hidden: e.target.checked })} /> Скрыть</label>
                      <button onClick={() => removeCat(i, id)} disabled={dishes(id) > 0} title={dishes(id) ? 'Сначала перенесите позиции в другую категорию' : ''} className={textBtn}>Удалить</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addCat(i)} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Категория</button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addSection} className="h-11 rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Раздел</button>
    </div>
  );
}
