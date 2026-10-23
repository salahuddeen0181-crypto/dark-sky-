// Statistics building blocks (server components, no chart library). One series per chart in one hue (MARK),
// thin bars with a rounded data end, hairline grid; hover shows the exact value (title tooltip).

export const MARK = '#d96a30'; // accent stepped to pass contrast/lightness on the dark surface
export const compact = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' млн' : v >= 1e3 ? Math.round(v / 1e3) + ' тыс' : String(Math.round(v)));
const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), r = v / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p; };

export function Card({ title, sub, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0e0e13] p-4 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <div className="text-xs text-white/45">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

// Headline number with the change against the previous period of the same length
export function Kpi({ label, value, now, prev }) {
  const d = prev ? (now - prev) / prev : null;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
      <span className="text-xs text-white/55">{label}</span>
      <span className="font-display text-lg tabular-nums sm:text-2xl">{value}</span>
      <span className={`text-xs tabular-nums ${d == null ? 'text-white/35' : d >= 0 ? 'text-[#9fd8a8]' : 'text-[#f2a676]'}`}>
        {d == null ? 'нет данных за прошлый период' : `${d >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))}% к прошлому периоду`}
      </span>
    </div>
  );
}

// Columns from one baseline: data = [{ label, value, tip }]; every `every`-th label is shown under the axis
export function Columns({ data, fmt = compact, every = 1, height = 150 }) {
  const max = niceMax(Math.max(0, ...data.map(d => d.value)));
  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between text-right text-[10px] tabular-nums text-white/40" style={{ height }}>
        <span>{fmt(max)}</span><span>{fmt(max / 2)}</span><span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative flex items-end gap-[2px] border-b border-white/15" style={{ height }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-white/[.06]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/[.06]" />
          {data.map((d, i) => (
            <div key={i} title={d.tip} className="group flex h-full flex-1 items-end justify-center">
              <div className="w-full max-w-6 rounded-t-[4px] group-hover:opacity-80" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0, background: MARK }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] text-white/45">
          {data.map((d, i) => <span key={i} className="flex-1 overflow-visible whitespace-nowrap text-center">{i % every === 0 ? d.label : ''}</span>)}
        </div>
      </div>
    </div>
  );
}

// Ranked horizontal bars with the value at the tip: rows = [{ name, value, label, sub }]
export function BarList({ rows, empty = 'Нет данных' }) {
  if (!rows.length) return <div className="py-6 text-center text-sm text-white/40">{empty}</div>;
  const max = Math.max(...rows.map(r => r.value)) || 1;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.name}</span>
            <span className="shrink-0 tabular-nums text-white/80">{r.label}{r.sub && <span className="ml-2 text-xs text-white/45">{r.sub}</span>}</span>
          </div>
          <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max(1, (r.value / max) * 100)}%`, background: MARK }} />
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-white/55">{label}</span>
      {hint && <span className="text-[11px] text-white/35">{hint}</span>}
    </div>
  );
}
