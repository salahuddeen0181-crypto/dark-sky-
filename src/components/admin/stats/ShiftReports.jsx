'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmt } from '../api';
import { Card } from './Charts';

const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const dayLabel = day => `${day.slice(8, 10)}.${day.slice(5, 7)} ${WD[new Date(day + 'T12:00:00Z').getUTCDay()]}`;
// the report as Telegram shows it: its HTML is only <b> and <i> around escaped text
const html = t => ({ __html: t.replace(/\n/g, '<br>') });

// Reports of the working days (06:00 → 06:00): made when the last waiter ends the shift (or at 06:00) and sent to
// the owners' Telegram group; the same text here. «Сформировать» makes today's report now.
export default function ShiftReports({ reports, group }) {
  const router = useRouter();
  const [open, setOpen] = useState(reports[0]?.day || null), [send, setSend] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  async function make() {
    setBusy(true); setMsg('');
    try { await api('/api/admin/reports', 'POST', { send }); setMsg(send ? 'Отчёт сформирован и отправлен в группу' : 'Отчёт сформирован'); router.refresh(); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  return (
    <Card title="Отчёты по сменам" sub={`Приходят в группу владельцев в Telegram, когда последний официант заканчивает смену (или в 06:00).${group ? '' : ' Группа не подключена — отчёты сохраняются только здесь.'}`}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button onClick={make} disabled={busy} className="h-10 rounded-xl bg-[#f2f2f4] px-4 font-semibold text-[#050507] disabled:opacity-50">Сформировать за сегодня</button>
        {group && <label className="flex items-center gap-2 text-white/70"><input type="checkbox" checked={send} onChange={e => setSend(e.target.checked)} /> отправить в группу</label>}
        {msg && <span className="text-xs text-white/60">{msg}</span>}
      </div>
      {!reports.length && <p className="text-sm text-white/45">Отчётов пока нет.</p>}
      <ul className="flex flex-col divide-y divide-white/5">
        {reports.map(r => (
          <li key={r.day}>
            <button onClick={() => setOpen(open === r.day ? null : r.day)} className="flex w-full flex-wrap items-center gap-3 py-2.5 text-left text-sm">
              <b className="w-24">{dayLabel(r.day)}</b>
              <span>{fmt(r.data.revenue)}</span>
              <span className="text-white/50">{r.data.orders} зак. · ср. чек {fmt(r.data.avg)}</span>
              <span className="ml-auto text-xs text-white/40">{r.sent_at ? 'отправлен в Telegram' : 'не отправлялся'} {open === r.day ? '▴' : '▾'}</span>
            </button>
            {open === r.day && <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/85" dangerouslySetInnerHTML={html(r.text)} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
