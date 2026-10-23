'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export default function TelegramActions({ canHook, canTest, canFind }) {
  const router = useRouter();
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [chats, setChats] = useState(null);
  async function run(action, ok) {
    setBusy(true); setMsg('');
    try {
      const r = await api('/api/admin/telegram', 'POST', { action });
      if (action === 'findChat') { setChats(r.chats); setMsg(r.chats.length ? '' : 'Групп не видно: добавьте бота в группу и напишите там любое сообщение, затем нажмите ещё раз'); }
      else { setMsg(ok); router.refresh(); }
    } catch (e) { setMsg('Ошибка: ' + e.message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={!canFind || busy} onClick={() => run('findChat')} className="h-11 rounded-xl border border-white/20 px-5 text-sm disabled:opacity-40">Найти группу</button>
        <button disabled={!canTest || busy} onClick={() => run('test', 'Тестовое сообщение отправлено ✓')} className="h-11 rounded-xl border border-white/20 px-5 text-sm disabled:opacity-40">Отправить тест в группу</button>
        <button disabled={!canHook || busy} onClick={() => run('webhook', 'Бот подключён к сайту ✓')} className="h-11 rounded-xl bg-[#f2f2f4] px-5 text-sm font-semibold text-[#050507] disabled:opacity-40">Подключить вебхук</button>
        {msg && <span className="text-sm text-white/75">{msg}</span>}
      </div>
      {chats?.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          {chats.map(c => <div key={c.id}>{c.title || 'Группа'}: <code className="select-all text-[#f6c3a3]">{c.id}</code> → впишите в <code>TELEGRAM_CHAT_ID</code></div>)}
        </div>
      )}
    </div>
  );
}
