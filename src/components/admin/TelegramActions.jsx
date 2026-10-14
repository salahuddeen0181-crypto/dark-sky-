'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export default function TelegramActions({ canHook, canTest }) {
  const router = useRouter();
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  async function run(action, ok) {
    setBusy(true); setMsg('');
    try { await api('/api/admin/telegram', 'POST', { action }); setMsg(ok); router.refresh(); } catch (e) { setMsg('Ошибка: ' + e.message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={!canHook || busy} onClick={() => run('webhook', 'Бот подключён к сайту ✓')} className="h-11 rounded-xl bg-[#f2f2f4] px-5 text-sm font-semibold text-[#050507] disabled:opacity-40">Подключить бота</button>
      <button disabled={!canTest || busy} onClick={() => run('test', 'Тестовое сообщение отправлено ✓')} className="h-11 rounded-xl border border-white/20 px-5 text-sm disabled:opacity-40">Отправить тест в группу</button>
      {msg && <span className="text-sm text-white/75">{msg}</span>}
    </div>
  );
}
