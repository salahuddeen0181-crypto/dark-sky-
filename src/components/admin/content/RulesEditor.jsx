'use client';
import { L3, asML, label } from '../L3';

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

// House rules, as the guest sees them in the «Правила» sheet: a title, two tabs (Запрещено / Общие) and the button
export default function RulesEditor({ c, set }) {
  const r = c.rules, setR = patch => set({ rules: { ...r, ...patch } });
  const one = (title, k, area) => <div className="flex flex-col gap-2"><span className={label}>{title}</span><L3 area={area} value={r[k]} onChange={v => setR({ [k]: v })} /></div>;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
      {one('Заголовок окна', 'title')}
      {one('Вкладка запретов', 'noTitle')}
      <List title="Запрещено" items={r.no} onChange={no => setR({ no })} />
      {one('Вкладка общих правил', 'generalTitle')}
      <List title="Общие" items={r.general} onChange={general => setR({ general })} />
      {one('Кнопка внизу', 'ok')}
    </div>
  );
}
