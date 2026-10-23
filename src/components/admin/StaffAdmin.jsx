'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

const STATUS = { pending: ['Ждёт одобрения', 'bg-[#e8793c] text-black'], active: ['В команде', 'bg-white/15'], blocked: ['Заблокирован', 'bg-white/5 text-white/50'] };
const dt = d => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const hours = sh => ((new Date(sh.ended_at || Date.now()) - new Date(sh.started_at)) / 3600e3);

// Waiters signed up through the Telegram bot: approve, rename, block; who is on shift; shift history
export default function StaffAdmin({ staff, shifts }) {
  const router = useRouter();
  const [names, setNames] = useState({}), [err, setErr] = useState('');
  async function patch(id, body) {
    setErr('');
    try { await api(`/api/admin/staff/${id}`, 'PATCH', body); router.refresh(); } catch (e) { setErr(e.message); }
  }
  const onShift = staff.filter(s => s.shift_started && s.status === 'active');
  const total = Object.values(shifts.reduce((m, sh) => { (m[sh.staff_id] ||= { name: sh.name, h: 0, n: 0 }); m[sh.staff_id].h += hours(sh); m[sh.staff_id].n++; return m; }, {}));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-lg uppercase tracking-[.08em]">Персонал</h1>
        <p className="text-xs leading-relaxed text-white/45">Официант пишет боту /start или открывает приложение из бота — появляется здесь «Ждёт одобрения». После одобрения он входит под своим именем, отмечает смену и одобряет заказы.</p>
      </div>
      {err && <div className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0e0e13] p-4 text-sm">
        <span className="text-white/55">Сейчас на смене:</span>
        {onShift.length ? onShift.map(s => <span key={s.id} className="rounded-md bg-white/10 px-2 py-1">{s.name} <span className="text-white/45">с {dt(s.shift_started)}</span></span>) : <span className="text-white/45">никого</span>}
      </section>

      <section className="flex flex-col gap-2">
        {!staff.length && <div className="py-10 text-center text-white/45">Пока никто не писал боту</div>}
        {staff.map(s => {
          const [label, cls] = STATUS[s.status];
          const name = names[s.id] ?? s.name;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-3">
              <input value={name} onChange={e => setNames({ ...names, [s.id]: e.target.value })} className="h-10 w-48 rounded-lg border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
              {name !== s.name && <button onClick={() => patch(s.id, { name })} className="h-10 rounded-lg border border-white/15 px-3 text-sm">Сохранить имя</button>}
              <span className="text-xs text-white/45">{s.username ? '@' + s.username : `tg ${s.tg_id}`}</span>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>
              {s.shift_started && <span className="text-xs text-[#9fd8a8]">на смене с {dt(s.shift_started)}</span>}
              <div className="ml-auto flex gap-2">
                {s.status !== 'active' && <button onClick={() => patch(s.id, { status: 'active', name })} className="h-10 rounded-lg bg-[#f2f2f4] px-3 text-sm font-semibold text-[#050507]">Одобрить</button>}
                {s.shift_started && <button onClick={() => patch(s.id, { endShift: true })} className="h-10 rounded-lg border border-white/15 px-3 text-sm text-white/75">Закрыть смену</button>}
                {s.status !== 'blocked' && <button onClick={() => confirm(`Заблокировать ${s.name}?`) && patch(s.id, { status: 'blocked' })} className="h-10 rounded-lg border border-white/15 px-3 text-sm text-white/55 hover:text-[#f2a676]">Заблокировать</button>}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-4">
        <h2 className="text-sm font-semibold">Смены за 30 дней</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {total.map(t => <span key={t.name} className="rounded-md bg-white/10 px-2 py-1">{t.name}: <b>{t.h.toFixed(1)} ч</b> · {t.n} смен</span>)}
        </div>
        <div className="flex flex-col divide-y divide-white/5 text-sm">
          {shifts.slice(0, 60).map(sh => (
            <div key={sh.id} className="flex flex-wrap gap-x-4 py-2">
              <span className="w-32 font-semibold">{sh.name}</span>
              <span className="text-white/70">{dt(sh.started_at)} → {sh.ended_at ? dt(sh.ended_at) : 'сейчас'}</span>
              <span className="tabular-nums text-white/55">{hours(sh).toFixed(1)} ч</span>
              {sh.auto_closed && <span className="text-xs text-[#f2a676]">закрыта автоматически</span>}
            </div>
          ))}
          {!shifts.length && <div className="py-4 text-white/45">Смен пока не было</div>}
        </div>
      </section>
    </div>
  );
}
