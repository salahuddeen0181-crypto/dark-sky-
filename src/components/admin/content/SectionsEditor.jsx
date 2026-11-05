'use client';
import { useState } from 'react';
import Link from 'next/link';
import { L3, label } from '../L3';
import TilePicture from './TilePicture';

const nameOf = n => n?.ru || n?.es || n?.en || Object.values(n || {}).find(Boolean) || 'Без названия';

// How the home tiles look: a category's subtitle and picture or video (and hookah's line under the list).
// Which categories and subcategories there are, their order, names and hiding: the «Меню» page.
export default function SectionsEditor({ c, set }) {
  const [open, setOpen] = useState(null);
  const setSection = (i, patch) => set({ sections: c.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-[#e8793c]/40 bg-[#e8793c]/10 px-4 py-3 text-sm text-white/80">
        Добавить, переименовать, переставить или скрыть категории и подкатегории, перенести блюда — на странице <Link href="/admin" className="font-semibold text-[#f2a676] underline">«Меню»</Link>. Здесь — только вид плиток на главной.
      </div>
      {c.sections.map((s, i) => {
        if (s.id === 'rules') return null;
        const on = open === s.id;
        return (
          <div key={s.id} className={`rounded-2xl border bg-[#0e0e13] ${on ? 'border-white/25' : 'border-white/10'}`}>
            <button onClick={() => setOpen(on ? null : s.id)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
              <span className={`min-w-0 flex-1 truncate font-semibold ${s.hidden ? 'text-white/40' : ''}`}>{nameOf(s.n)}</span>
              {s.hidden && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/55">Скрыта</span>}
              <span className={`inline-block text-white/40 transition ${on ? 'rotate-90' : ''}`}>›</span>
            </button>
            {on && (
              <div className="flex flex-col gap-4 border-t border-white/10 p-3">
                <div className="flex flex-col gap-2"><span className={label}>Подпись на плитке</span><L3 value={s.tag} onChange={tag => setSection(i, { tag })} /></div>
                {s.id === 'hookah' && <div className="flex flex-col gap-2"><span className={label}>Строка под кальянами</span><L3 value={c.prep} onChange={prep => set({ prep })} placeholder="Приготовление 10–15 мин" /></div>}
                <TilePicture s={s} onChange={patch => setSection(i, patch)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
