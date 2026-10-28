'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/components/admin/api';

export default function Login() {
  const [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/admin/login', 'POST', { password: pw }); location.href = '/admin'; }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <div className="mb-4">
        <div className="font-display text-xl tracking-[.14em]">DARKSKY</div>
        <div className="text-sm text-white/50">Вход в админку</div>
      </div>
      <input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} placeholder="Пароль"
        className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-[#e8793c]" />
      {err && <div className="text-sm text-[#f2a676]">{err}</div>}
      <button disabled={busy} className="h-12 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60">{busy ? 'Входим…' : 'Войти'}</button>
      <Link href="/admin/reset" className="self-center text-sm text-white/50 underline-offset-4 hover:underline">Забыли пароль?</Link>
    </form>
  );
}
