'use client';
import Link from 'next/link';
import { L3 } from '../L3';

export const stepBtn = 'h-11 w-11 flex-none rounded-xl border border-white/15 text-lg disabled:opacity-25';
export const textBtn = 'h-11 rounded-xl border border-white/15 px-4 text-sm text-white/75 hover:bg-white/5 disabled:opacity-40';
export const mlName = (n, empty) => n?.ru || n?.es || n?.en || Object.values(n || {}).find(Boolean) || empty;

// One category in a section: a compact row; tapped, it opens its name and actions underneath.
// targets: the sections it can move to, [{ id, name }]
export default function CatRow({ id, saved, cat, dishes, open, onToggle, onChange, first, last, onUp, onDown, targets, onMove, onRemove }) {
  return (
    <div className={`rounded-xl border ${open ? 'border-[#e8793c]/50 bg-white/[.03]' : 'border-white/10'}`}>
      <button onClick={onToggle} className="flex min-h-12 w-full items-center gap-3 px-3 text-left">
        <span className={`min-w-0 flex-1 truncate ${cat.hidden ? 'text-white/40 line-through' : ''}`}>{mlName(cat.n, 'Новая категория')}</span>
        {cat.hidden && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/55">Скрыта</span>}
        <span className={`text-xs tabular-nums ${dishes ? 'text-white/45' : 'text-[#f2a676]'}`}>{dishes ? `${dishes} поз.` : 'пусто'}</span>
        <span className={`inline-block text-white/40 transition ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-white/10 p-3">
          {!dishes && <span className="text-xs text-[#f2a676]">Гости не видят пустую категорию. Добавьте в неё позиции — и она появится в меню.</span>}
          {saved
            ? <Link href={`/admin/items/new?cat=${id}`} className="flex h-11 items-center justify-center rounded-xl bg-[#f2f2f4] text-sm font-semibold text-[#050507]">+ Добавить позицию</Link>
            : <span className="text-xs text-white/45">Сохраните, чтобы добавлять в категорию позиции.</span>}
          <L3 value={cat.n} onChange={n => onChange({ n })} placeholder="Название категории" autoFocus={!Object.values(cat.n || {}).some(Boolean)} />
          <div className="flex items-center gap-2">
            <button onClick={onUp} disabled={first} className={stepBtn} aria-label="Выше">↑</button>
            <button onClick={onDown} disabled={last} className={stepBtn} aria-label="Ниже">↓</button>
            <button onClick={() => onChange({ hidden: !cat.hidden })} className={`${textBtn} flex-1`}>{cat.hidden ? 'Показать' : 'Скрыть'}</button>
          </div>
          <div className="flex items-center gap-2">
            {targets.length > 0 && (
              <select value="" onChange={e => e.target.value && onMove(e.target.value)} aria-label="Перенести в раздел" className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/75">
                <option value="" className="bg-[#111]">Перенести в раздел…</option>
                {targets.map(t => <option key={t.id} value={t.id} className="bg-[#111]">{t.name}</option>)}
              </select>
            )}
            <button onClick={() => confirm('Удалить категорию?') && onRemove()} disabled={dishes > 0} className={textBtn}>Удалить</button>
          </div>
          {dishes > 0 && <span className="text-xs text-white/40">Удалить можно пустую категорию: сначала перенесите её {dishes} поз. на странице «Меню».</span>}
        </div>
      )}
    </div>
  );
}
