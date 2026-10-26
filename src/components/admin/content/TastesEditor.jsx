'use client';
import { L3, asML, label } from '../L3';

// Taste tags shown on the dishes (Мягкий, Сливочный, Дымный…): rename in every language, add, remove.
// A removed tag disappears from every dish that had it; which dish has which tag is set in the dish editor.
// A new tag gets its key here, so the dishes that pick it keep it whatever its name becomes.
export default function TastesEditor({ c, set }) {
  const list = c.tastes || [], put = tastes => set({ tastes });
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
      <span className={label}>Вкусы на карточках блюд</span>
      <p className="-mt-1 text-xs text-white/45">Отметить вкусы у блюда — в редакторе блюда (до 4). Удалённый вкус пропадёт у всех блюд.</p>
      {list.map((t, i) => (
        <div key={t.k || i} className="flex items-start gap-2">
          <div className="flex-1"><L3 value={t.n} onChange={n => put(list.map((x, j) => (j === i ? { ...x, n } : x)))} /></div>
          <button onClick={() => confirm('Удалить этот вкус у всех блюд?') && put(list.filter((_, j) => j !== i))} className="h-11 rounded-xl border border-white/15 px-3 text-sm text-white/55 hover:text-[#f2a676]" aria-label="Удалить вкус">✕</button>
        </div>
      ))}
      <button onClick={() => put([...list, { k: 't' + Date.now().toString(36), n: asML('') }])} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Вкус</button>
    </div>
  );
}
