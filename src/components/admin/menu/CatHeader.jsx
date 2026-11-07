'use client';
import { useState } from 'react';

const btn = 'h-11 rounded-xl border border-white/15 px-3 text-sm text-white/80 hover:bg-white/5 disabled:opacity-30';
const step = 'h-11 w-11 flex-none rounded-xl border border-white/15 text-lg disabled:opacity-25';
const empty = 'гости не видят, пока нет позиций';

// The title of a category (a home tile) or of a subcategory (a tab inside it), with its actions behind «⋯».
// sub: a subcategory; fixed: hookah, which stays as it is apart from its name
export default function CatHeader({ sub, name, count, hidden, fixed, first, last, targets = [], onRename, onUp, onDown, onHide, onRemove, onMove }) {
  const [open, setOpen] = useState(false);
  const act = f => () => { setOpen(false); f(); };
  return (
    <div className={sub ? 'border-b border-white/10' : ''}>
      <div className={`flex items-center gap-2 ${sub ? 'px-4 py-2' : 'py-1'}`}>
        <div className="min-w-0 flex-1">
          <div className={`truncate ${sub ? 'text-sm font-semibold uppercase tracking-[.12em]' : 'font-display text-base uppercase tracking-[.08em]'} ${hidden ? 'text-white/40' : ''}`}>
            {name}
            {hidden && <span className="ml-2 rounded-md bg-white/10 px-1.5 py-0.5 align-middle text-[10px] font-normal uppercase tracking-normal text-white/55">скрыта</span>}
          </div>
          <div className={`text-xs ${count ? 'text-white/40' : 'text-[#f2a676]'}`}>{count ? `${count} поз.` : `пусто · ${empty}`}</div>
        </div>
        <button onClick={onRename} className="h-10 w-10 flex-none rounded-xl border border-white/15 text-white/70" aria-label="Переименовать">✎</button>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} className={`h-10 w-10 flex-none rounded-xl border text-white/70 ${open ? 'border-[#e8793c] bg-[#e8793c]/15' : 'border-white/15'}`} aria-label="Действия">⋯</button>
      </div>
      {open && (
        <div className={`flex flex-col gap-2 pb-3 ${sub ? 'px-4' : ''}`}>
          <div className="flex gap-2">
            <button onClick={onUp} disabled={first} className={step} aria-label="Выше">↑</button>
            <button onClick={onDown} disabled={last} className={step} aria-label="Ниже">↓</button>
            {!fixed && <button onClick={act(onHide)} className={`${btn} flex-1`}>{hidden ? 'Показать гостям' : 'Скрыть от гостей'}</button>}
          </div>
          {sub && !fixed && targets.length > 0 && (
            <select value="" onChange={e => { const to = e.target.value; if (to) { setOpen(false); onMove(to); } }} aria-label="Перенести в категорию" className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/80">
              <option value="" className="bg-[#111]">Перенести в категорию…</option>
              {targets.map(t => <option key={t.id} value={t.id} className="bg-[#111]">{t.name}</option>)}
            </select>
          )}
          {!fixed && <button onClick={act(onRemove)} disabled={count > 0} className={btn}>{sub ? 'Удалить подкатегорию' : 'Удалить категорию'}</button>}
          {!fixed && count > 0 && <span className="text-xs text-white/40">Удалить можно пустую: сначала перенесите блюда кнопкой ⇄ у каждого.</span>}
        </div>
      )}
    </div>
  );
}
