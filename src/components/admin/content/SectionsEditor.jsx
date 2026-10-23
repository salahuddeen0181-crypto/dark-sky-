'use client';
import { L3, label } from '../L3';

// Home tiles (title + subtitle) and, inside each, its categories: rename, hide, reorder.
export default function SectionsEditor({ c, set }) {
  const setSection = (i, patch) => set({ sections: c.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const setCat = (id, patch) => set({ cats: { ...c.cats, [id]: { ...c.cats[id], ...patch } } });
  const move = (i, j, d) => {
    const cats = [...c.sections[i].cats], k = j + d;
    if (k < 0 || k >= cats.length) return;
    [cats[j], cats[k]] = [cats[k], cats[j]];
    setSection(i, { cats });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
        <span className={label}>Строка под кальянами</span>
        <L3 value={c.prep} onChange={prep => set({ prep })} placeholder="Приготовление 10–15 мин" />
      </div>
      {c.sections.map((s, i) => (
        <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
          <div className="flex flex-col gap-2"><span className={label}>Плитка «{s.n.ru || s.id}» · название</span><L3 value={s.n} onChange={n => setSection(i, { n })} /></div>
          <div className="flex flex-col gap-2"><span className={label}>Подпись</span><L3 value={s.tag} onChange={tag => setSection(i, { tag })} /></div>
          {s.cats.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className={label}>Категории раздела <span className="normal-case tracking-normal text-white/35">— порядок вкладок, скрытые не видны гостям вместе с блюдами</span></span>
              {s.cats.map((id, j) => (
                <div key={id} className={`grid items-center gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[auto_1fr_auto] ${c.cats[id].hidden ? 'opacity-50' : ''}`}>
                  <div className="flex gap-1">
                    <button onClick={() => move(i, j, -1)} disabled={!j} className="h-9 w-9 rounded-lg border border-white/15 disabled:opacity-30" aria-label="Выше">↑</button>
                    <button onClick={() => move(i, j, 1)} disabled={j === s.cats.length - 1} className="h-9 w-9 rounded-lg border border-white/15 disabled:opacity-30" aria-label="Ниже">↓</button>
                  </div>
                  <L3 value={c.cats[id].n} onChange={n => setCat(id, { n })} />
                  <label className="flex items-center gap-2 px-2 text-sm text-white/75"><input type="checkbox" checked={c.cats[id].hidden} onChange={e => setCat(id, { hidden: e.target.checked })} /> Скрыть</label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
