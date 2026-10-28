import Link from 'next/link';
import { report, PERIODS, isDay } from '@/lib/stats';
import { fmtPrice } from '@/lib/money';
import { Card, Kpi, Columns, BarList, Stat } from '@/components/admin/stats/Charts';
import ShiftReports from '@/components/admin/stats/ShiftReports';
import ArchivePanel from '@/components/admin/stats/ArchivePanel';
import { listReports } from '@/lib/shift-report';
import { staffChatId } from '@/lib/telegram';

const LABELS = { today: 'Сегодня', '7d': '7 дней', '30d': '30 дней', '90d': '90 дней' };
const pct = v => (v == null ? '—' : Math.round(v * 100) + '%');
const mins = v => (v == null ? '—' : v < 1 ? '<1 мин' : Math.round(v) + ' мин');
const ddmm = key => key.slice(8, 10) + '.' + key.slice(5, 7);

export default async function StatsPage({ searchParams }) {
  const q = await searchParams, p = q.p;
  const [r, reports] = await Promise.all([report(isDay(q.from) && isDay(q.to) ? { from: q.from, to: q.to } : PERIODS[p] ? p : '7d'), listReports()]);
  const { now, prev } = r;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg uppercase tracking-[.08em]">Статистика</h1>
        <nav className="flex gap-1 rounded-xl border border-white/10 p-1 text-sm">
          {Object.keys(PERIODS).map(k => (
            <Link key={k} href={`/admin/stats?p=${k}`} className={`rounded-lg px-3 py-1.5 ${k === r.period ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}>{LABELS[k]}</Link>
          ))}
        </nav>
        {/* any period by hand: a plain GET form, so the link can be refreshed or shared */}
        <form action="/admin/stats" className={`flex flex-wrap items-center gap-2 rounded-xl border p-1 pl-3 text-sm ${r.period === 'custom' ? 'border-[#e8793c]/60' : 'border-white/10'}`}>
          <span className="text-white/55">с</span>
          <input type="date" name="from" defaultValue={r.from} required className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-white [color-scheme:dark]" />
          <span className="text-white/55">по</span>
          <input type="date" name="to" defaultValue={r.to} required className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-white [color-scheme:dark]" />
          <button className="h-8 rounded-lg bg-white/15 px-3 text-white hover:bg-white/25">Показать</button>
        </form>
        <Link href="/staff" target="_blank" className="ml-auto rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 hover:text-white">
          Сейчас: <b className={r.open.fresh ? 'text-[#f2a676]' : ''}>{r.open.fresh} новых</b> · {r.open.accepted} в работе{r.onShift.length ? ` · на смене: ${r.onShift.map(x => x.name).join(', ')}` : ''} ↗
        </Link>
      </div>
      <p className="-mt-2 text-xs text-white/40">{ddmm(r.from)}{r.from !== r.to ? ` – ${ddmm(r.to)}` : ''} · день считается сменой 06:00–06:00 · сравнение с предыдущими {r.n === 1 ? 'сутками' : `${r.n} днями`}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Выручка" value={fmtPrice(now.revenue)} now={now.revenue} prev={prev.revenue} />
        <Kpi label="Заказов" value={now.orders} now={now.orders} prev={prev.orders} />
        <Kpi label="Средний чек" value={fmtPrice(now.avg)} now={now.avg} prev={prev.avg} />
        <Kpi label="Позиций" value={now.items} now={now.items} prev={prev.items} />
      </div>

      {r.n > 1 && (
        <Card title="Выручка по дням">
          <Columns every={r.n > 120 ? 30 : r.n > 30 ? 14 : r.n > 7 ? 5 : 1} data={r.days.map(d => ({ label: ddmm(d.key), value: d.revenue, tip: `${ddmm(d.key)}: ${fmtPrice(d.revenue)} · заказов ${d.orders}` }))} />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Заказы по часам" sub="Когда больше всего гостей">
          <Columns every={3} fmt={String} data={r.hours.map(h => ({ label: String(h.h).padStart(2, '0'), value: h.orders, tip: `${String(h.h).padStart(2, '0')}:00–${String((h.h + 1) % 24).padStart(2, '0')}:00 — ${h.orders} заказов` }))} />
        </Card>
        <Card title="По дням недели">
          <Columns fmt={String} data={r.weekdays.map(w => ({ label: w.label, value: w.orders, tip: `${w.label}: ${w.orders} заказов` }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Топ-10 блюд" sub="По количеству">
          <BarList rows={r.items.map(i => ({ name: i.name, value: i.qty, label: `${i.qty} шт`, sub: fmtPrice(i.revenue) }))} />
        </Card>
        <Card title="Категории" sub="Доля выручки">
          <BarList rows={r.cats.map(c => ({ name: c.name, value: c.revenue, label: pct(c.share), sub: fmtPrice(c.revenue) }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Скорость обслуживания" sub="Медиана">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="До «Одобрено»" value={mins(r.speed.accept)} />
            <Stat label="От «Одобрено» до «Подано»" value={mins(r.speed.serve)} />
            <Stat label="Весь заказ" value={mins(r.speed.total)} />
            <Stat label="Одобрены позже 5 мин" value={pct(r.speed.late)} />
          </div>
        </Card>
        <Card title="Оплата и заказы">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Наличные / крипто" value={pct(r.pay.cashShare)} />
            <Stat label="Скидки −15%" value={fmtPrice(r.pay.discount)} />
            <Stat label="С комментарием" value={pct(r.pay.noteShare)} />
            <Stat label="Изменены персоналом" value={pct(r.pay.editedShare)} hint="Чего-то не было в наличии" />
          </div>
        </Card>
        <Card title="Официанты">
          <BarList rows={r.waiters.map(w => ({ name: w.name, value: w.orders, label: `${w.orders} зак.`, sub: `одобряет за ${mins(w.accept)}${w.hours ? ` · ${w.hours.toFixed(1)} ч смен · ${w.perHour.toFixed(1)} зак./ч` : ''}` }))} />
        </Card>
      </div>

      <Card title="Столы" sub="Топ-10 по выручке">
        <BarList rows={r.tables.map(t => ({ name: t.name, value: t.revenue, label: fmtPrice(t.revenue), sub: `${t.orders} зак.` }))} />
      </Card>

      <ShiftReports reports={JSON.parse(JSON.stringify(reports))} group={!!staffChatId()} />
      <ArchivePanel />
    </div>
  );
}
