'use client';
import { L3, asML, input, label } from '../L3';

const blank = () => ({ tag: asML(''), title: asML(''), big: '', d: asML(''), window: null });

// Promotion cards: label, title, the big figure, description, optional hours when the card glows "now".
export default function PromosEditor({ c, set }) {
  const setP = (i, patch) => set({ promos: c.promos.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const move = (i, d) => { const l = [...c.promos], k = i + d; if (k < 0 || k >= l.length) return; [l[i], l[k]] = [l[k], l[i]]; set({ promos: l }); };

  return (
    <div className="flex flex-col gap-4">
      {c.promos.map((p, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm">Акция {i + 1}</span>
            <button onClick={() => move(i, -1)} disabled={!i} className="ml-auto h-9 w-9 rounded-lg border border-white/15 disabled:opacity-30" aria-label="Выше">↑</button>
            <button onClick={() => move(i, 1)} disabled={i === c.promos.length - 1} className="h-9 w-9 rounded-lg border border-white/15 disabled:opacity-30" aria-label="Ниже">↓</button>
            <button onClick={() => confirm('Удалить акцию?') && set({ promos: c.promos.filter((_, k) => k !== i) })} className="h-9 rounded-lg border border-white/15 px-3 text-sm text-white/60 hover:text-[#f2a676]">Удалить</button>
          </div>
          <div className="flex flex-col gap-2"><span className={label}>Заголовок</span><L3 value={p.title} onChange={title => setP(i, { title })} placeholder="Business Hookah" /></div>
          <div className="flex flex-col gap-2"><span className={label}>Метка сверху</span><L3 value={p.tag} onChange={tag => setP(i, { tag })} placeholder="14:00 – 17:00" /></div>
          <div className="flex flex-col gap-2"><span className={label}>Описание</span><L3 area value={p.d} onChange={d => setP(i, { d })} /></div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2"><span className={label}>Крупно</span><input value={p.big} onChange={e => setP(i, { big: e.target.value })} placeholder="20% OFF" className={`${input} w-40`} /></label>
            <label className="flex items-center gap-2 pb-3 text-sm text-white/75">
              <input type="checkbox" checked={!!p.window} onChange={e => setP(i, { window: e.target.checked ? [14, 17] : null })} /> Действует по часам
            </label>
            {p.window && (
              <div className="flex items-center gap-2 pb-1 text-sm">
                с <input type="number" min="0" max="24" value={p.window[0]} onChange={e => setP(i, { window: [+e.target.value, p.window[1]] })} className={`${input} w-20`} />
                до <input type="number" min="0" max="24" value={p.window[1]} onChange={e => setP(i, { window: [p.window[0], +e.target.value] })} className={`${input} w-20`} /> ч
              </div>
            )}
          </div>
        </div>
      ))}
      <button onClick={() => set({ promos: [...c.promos, blank()] })} className="h-11 rounded-xl border border-dashed border-white/25 text-sm text-white/75 hover:bg-white/5">+ Добавить акцию</button>
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
        <span className={label}>Примечание под акциями</span>
        <L3 area value={c.promoNote} onChange={promoNote => set({ promoNote })} />
      </div>
    </div>
  );
}
