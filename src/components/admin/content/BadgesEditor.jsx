'use client';
import { L3, asML, label } from '../L3';

const PINNED = ['hit', 'new'];
const name = n => n.ru || n.es || n.en || Object.values(n).find(Boolean) || 'Шильдик';

// Badges on the dishes (Хит, Новинка, your own): name in every language, background and text colours, add, remove.
// Which dish has which is set in the dish editor. «Хит» also fills the home block, so these two stay.
export default function BadgesEditor({ c, set }) {
  const list = c.badges || [], put = badges => set({ badges });
  const change = (i, patch) => put(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const swatch = (i, key, title) => (
    <label className="flex items-center gap-2 text-sm text-white/75">
      <input type="color" value={list[i][key]} onChange={e => change(i, { [key]: e.target.value })} aria-label={title} className="h-9 w-11 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1" />
      {title}
    </label>
  );
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
      <span className={label}>Шильдики на блюдах</span>
      <p className="-mt-1 text-xs text-white/45">Отметить шильдик у блюда можно в редакторе блюда. «Хит» и «Новинку» можно переименовать и перекрасить, но не удалить: «Хит» ещё и наполняет блок «Хиты заведения» на главной. Удалённый шильдик пропадёт у всех блюд.</p>
      {list.map((b, i) => (
        <div key={b.k} className="flex flex-col gap-2 rounded-xl border border-white/10 p-3">
          <L3 value={b.n} onChange={n => change(i, { n })} placeholder="Например: Острое" />
          <div className="flex flex-wrap items-center gap-4">
            {swatch(i, 'bg', 'Фон')}
            {swatch(i, 'color', 'Текст')}
            <span style={{ background: b.bg, color: b.color }} className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em]">{name(b.n)}</span>
            {!PINNED.includes(b.k) && <button onClick={() => confirm('Удалить этот шильдик у всех блюд?') && put(list.filter((_, j) => j !== i))} className="ml-auto h-9 rounded-lg border border-white/15 px-3 text-sm text-white/75 hover:bg-white/5">Удалить</button>}
          </div>
        </div>
      ))}
      {list.length < 20 && <button onClick={() => put([...list, { k: 'b' + Date.now().toString(36), n: asML(''), bg: '#e8793c', color: '#050507' }])} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Шильдик</button>}
    </div>
  );
}
