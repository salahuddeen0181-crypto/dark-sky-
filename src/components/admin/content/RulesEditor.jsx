'use client';
import { L3, asML, input, label } from '../L3';

// List of texts (rules points) with add / remove
function List({ title, items, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>{title}</span>
      {items.map((x, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1"><L3 area value={x} onChange={v => onChange(items.map((y, k) => (k === i ? v : y)))} /></div>
          <button onClick={() => onChange(items.filter((_, k) => k !== i))} className="h-11 rounded-xl border border-white/15 px-3 text-sm text-white/55 hover:text-[#f2a676]" aria-label="Удалить пункт">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, asML('')])} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Пункт</button>
    </div>
  );
}

// House rules: hookahs per table, information, what is not allowed, liability
export default function RulesEditor({ c, set }) {
  const r = c.rules, setR = patch => set({ rules: { ...r, ...patch } });
  const setPeople = (i, k, v) => setR({ people: r.people.map((row, j) => (j === i ? (k ? [row[0], v] : [v, row[1]]) : row)) });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
      <div className="flex flex-col gap-2"><span className={label}>Заголовок таблицы</span><L3 value={r.peopleTitle} onChange={peopleTitle => setR({ peopleTitle })} /></div>
      <div className="flex flex-col gap-2">
        <span className={label}>Гостей → кальянов</span>
        {r.people.map(([g, n], i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <input value={g} onChange={e => setPeople(i, 0, e.target.value)} className={`${input} w-28`} placeholder="1–4" />
            <span className="text-white/50">→</span>
            <input type="number" min="1" max="9" value={n} onChange={e => setPeople(i, 1, +e.target.value)} className={`${input} w-20`} />
            <button onClick={() => setR({ people: r.people.filter((_, k) => k !== i) })} className="h-11 rounded-xl border border-white/15 px-3 text-white/55" aria-label="Удалить строку">✕</button>
          </div>
        ))}
        <button onClick={() => setR({ people: [...r.people, ['', 1]] })} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75">+ Строка</button>
      </div>
      <div className="flex flex-col gap-2"><span className={label}>Слово «гостей»</span><L3 value={r.peopleUnit} onChange={peopleUnit => setR({ peopleUnit })} /></div>
      <List title="Информация" items={r.info} onChange={info => setR({ info })} />
      <div className="flex flex-col gap-2"><span className={label}>Заголовок запретов</span><L3 value={r.noTitle} onChange={noTitle => setR({ noTitle })} /></div>
      <List title="Запрещено" items={r.no} onChange={no => setR({ no })} />
      <div className="flex flex-col gap-2"><span className={label}>Ответственность</span><L3 area value={r.liability} onChange={liability => setR({ liability })} /></div>
    </div>
  );
}
