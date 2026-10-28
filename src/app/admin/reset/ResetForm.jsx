'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/components/admin/api';

const field = 'h-12 rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-[#e8793c]';
const button = 'h-12 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60';
const back = <Link href="/admin/login" className="text-sm text-white/50 underline-offset-4 hover:underline">← Ко входу</Link>;

export default function ResetForm({ token, ready, valid }) {
  const [pw, setPw] = useState({ next: '', again: '' }), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true); setMsg(null);
    try { const r = await api('/api/admin/reset', 'POST', { action: 'send' }); setMsg([true, `Ссылка отправлена на ${r.to}. Она работает 30 минут. Если письма нет — проверьте «Спам».`]); }
    catch (x) { setMsg([false, x.message]); }
    setBusy(false);
  }
  async function save(e) {
    e.preventDefault();
    if (pw.next !== pw.again) return setMsg([false, 'Пароли не совпадают']);
    setBusy(true); setMsg(null);
    try { await api('/api/admin/reset', 'POST', { action: 'set', token, next: pw.next }); location.href = '/admin'; }
    catch (x) { setMsg([false, x.message]); setBusy(false); }
  }
  const Msg = () => msg && <div className={`text-sm ${msg[0] ? 'text-[#9fd8a8]' : 'text-[#f2a676]'}`}>{msg[1]}</div>;

  let body;
  if (token && valid) body = (
    <form onSubmit={save} className="flex flex-col gap-4">
      <input type="password" autoFocus autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Новый пароль" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} className={field} />
      <input type="password" autoComplete="new-password" required placeholder="Повторите новый пароль" value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} className={field} />
      <p className="text-xs text-white/45">Минимум 8 символов, лучше 12 и больше. Все остальные устройства выйдут из админки.</p>
      <Msg />
      <button disabled={busy} className={button}>{busy ? 'Сохраняем…' : 'Сохранить и войти'}</button>
    </form>
  );
  else if (!ready) body = (
    <p className="text-sm leading-relaxed text-white/70">Восстановление по почте не настроено. Его включают в админке, в разделе «Доступ» → «Почта для восстановления». Пока его нет, пароль может сбросить разработчик: задать новый <code className="text-white/90">ADMIN_PASSWORD</code> в настройках сервера и перезапустить сайт — после этого действует он.</p>
  );
  else body = (
    <div className="flex flex-col gap-4">
      {token && <div className="text-sm text-[#f2a676]">Эта ссылка устарела или уже использована. Запросите новую.</div>}
      <p className="text-sm leading-relaxed text-white/70">Пришлём ссылку для нового пароля на почту владельца, указанную в настройках админки.</p>
      <Msg />
      <button type="button" disabled={busy} onClick={send} className={button}>{busy ? 'Отправляем…' : 'Отправить ссылку'}</button>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <div className="mb-4">
        <div className="font-display text-xl tracking-[.14em]">DARKSKY</div>
        <div className="text-sm text-white/50">{token && valid ? 'Новый пароль админки' : 'Восстановление пароля'}</div>
      </div>
      {body}
      {back}
    </div>
  );
}
