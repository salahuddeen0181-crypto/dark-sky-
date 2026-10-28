'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
import { input, label } from './L3';

const box = 'flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-5';
// Long, mixed, not a known weak one — a hint only, the server needs 8+ characters
const weak = p => p.length < 12 || /^\d+$/.test(p) || /^(.)\1+$/.test(p) || /password|qwerty|12345|darksky/i.test(p);

export default function AccessForm({ db, adminInDb: inDb, tabletSet }) {
  const [pw, setPw] = useState({ current: '', next: '', again: '' }), [pin, setPin] = useState('');
  const [msg, setMsg] = useState({}), [busy, setBusy] = useState('');
  const say = (k, ok, text) => setMsg(m => ({ ...m, [k]: [ok, text] }));
  // recovery mail: what is saved (status) and the form (the app password is never sent back)
  const [mail, setMail] = useState(null), [mf, setMf] = useState({ to: '', user: '', pass: '' }), [adminInDb, setAdminInDb] = useState(inDb);
  const loadMail = m => { setMail(m); setMf({ to: m.to, user: m.user, pass: '' }); };
  useEffect(() => { if (db) api('/api/admin/access', 'GET').then(r => { loadMail(r.mail); setAdminInDb(r.adminInDb); }).catch(() => {}); }, [db]);

  async function savePassword(e) {
    e.preventDefault();
    if (pw.next !== pw.again) return say('pw', false, 'Новый пароль и повтор не совпадают');
    setBusy('pw');
    try { await api('/api/admin/access', 'POST', { action: 'password', current: pw.current, next: pw.next }); setPw({ current: '', next: '', again: '' }); setAdminInDb(true); say('pw', true, 'Пароль сменён. Другие устройства вышли из админки, это устройство осталось.'); }
    catch (x) { say('pw', false, x.message); }
    setBusy('');
  }
  async function saveTablet(value) {
    setBusy('pin');
    try { const r = await api('/api/admin/access', 'POST', { action: 'tablet', pin: value }); setPin(''); say('pin', true, `PIN планшета: ${r.pin} — запишите его, больше он не показывается. Планшеты с прежним PIN вышли.`); }
    catch (x) { say('pin', false, x.message); }
    setBusy('');
  }
  async function saveMail(e) {
    e.preventDefault(); setBusy('mail');
    try { const r = await api('/api/admin/access', 'POST', { action: 'mail', ...mf }); loadMail(r.mail); say('mail', true, r.mail.to ? 'Сохранено. Проверьте отправкой тестового письма.' : 'Восстановление по почте выключено.'); }
    catch (x) { say('mail', false, x.message); }
    setBusy('');
  }
  async function testMail() {
    setBusy('test');
    try { const r = await api('/api/admin/access', 'POST', { action: 'mail-test' }); say('mail', true, `Письмо отправлено на ${r.to}. Если его нет — посмотрите «Спам».`); }
    catch (x) { say('mail', false, x.message); }
    setBusy('');
  }
  const mailReady = mail?.to && mail?.user && mail?.passSet;
  const Msg = ({ k }) => msg[k] ? <div className={`text-sm ${msg[k][0] ? 'text-[#9fd8a8]' : 'text-[#f2a676]'}`}>{msg[k][1]}</div> : null;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-lg uppercase tracking-[.08em]">Доступ</h1>
      {!db && <div className="text-sm text-[#f2a676]">Без базы данных пароли задаются только в .env</div>}

      <form onSubmit={savePassword} className={box}>
        <span className={label}>Пароль админки</span>
        <p className="text-xs text-white/45">Минимум 8 символов, лучше 12 и больше. После смены все остальные устройства выйдут из админки.</p>
        {!adminInDb && <p className="text-xs text-white/45">Сейчас действует пароль из настроек сервера. После смены здесь он перестанет работать.</p>}
        <input type="password" autoComplete="current-password" required placeholder="Текущий пароль" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} className={input} />
        <input type="password" autoComplete="new-password" required minLength={8} placeholder="Новый пароль (от 8 символов)" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} className={input} />
        <input type="password" autoComplete="new-password" required placeholder="Повторите новый пароль" value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} className={input} />
        {pw.next && weak(pw.next) && <p className="text-xs text-[#f2a676]">Простой пароль: лучше 12+ символов, буквы и цифры вперемешку.</p>}
        <Msg k="pw" />
        <button disabled={!db || busy === 'pw'} className="h-11 self-start rounded-xl bg-[#f2f2f4] px-5 font-semibold text-[#050507] disabled:opacity-50">{busy === 'pw' ? 'Сохраняем…' : 'Сменить пароль'}</button>
      </form>

      <form onSubmit={saveMail} className={box}>
        <span className={label}>Почта для восстановления</span>
        <p className="text-xs text-white/45">Если пароль забыт, на входе есть «Забыли пароль?»: ссылка для нового пароля придёт на адрес владельца. Письмо уходит с вашего Gmail. {mail && (mailReady ? 'Сейчас настроено.' : 'Сейчас не настроено.')}</p>
        <input type="email" autoComplete="email" placeholder="Адрес владельца — сюда придёт ссылка" value={mf.to} onChange={e => setMf({ ...mf, to: e.target.value })} className={input} />
        <input type="email" autoComplete="off" placeholder="Gmail, с которого отправлять (name@gmail.com)" value={mf.user} onChange={e => setMf({ ...mf, user: e.target.value })} className={input} />
        <input type="password" autoComplete="new-password" placeholder={mail?.passSet && mf.user === mail.user ? 'Пароль приложения сохранён — введите, чтобы заменить' : 'Пароль приложения Google (16 букв)'} value={mf.pass} onChange={e => setMf({ ...mf, pass: e.target.value })} className={input} />
        {mail?.passBroken && <p className="text-xs text-[#f2a676]">Сохранённый пароль приложения больше не читается (сменился ключ сервера) — введите его заново.</p>}
        <details className="text-xs text-white/55">
          <summary className="cursor-pointer text-white/70">Где взять пароль приложения</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Войдите в Google-аккаунт этого Gmail → «Безопасность».</li>
            <li>Включите «Двухэтапную аутентификацию» (без неё пункта нет).</li>
            <li>Там же откройте «Пароли приложений» (или сразу myaccount.google.com/apppasswords).</li>
            <li>Назовите его, например, «DARKSKY» и нажмите «Создать».</li>
            <li>Скопируйте 16 букв сюда. Это не пароль от почты: его можно удалить там же в любой момент.</li>
          </ol>
        </details>
        <Msg k="mail" />
        <div className="flex flex-wrap gap-2">
          <button disabled={!db || !mail || busy === 'mail'} className="h-11 rounded-xl bg-[#f2f2f4] px-5 font-semibold text-[#050507] disabled:opacity-50">{busy === 'mail' ? 'Сохраняем…' : 'Сохранить'}</button>
          <button type="button" disabled={!mailReady || busy === 'test'} onClick={testMail} className="h-11 rounded-xl border border-white/20 px-4 text-sm disabled:opacity-40">{busy === 'test' ? 'Отправляем…' : 'Отправить тестовое письмо'}</button>
        </div>
      </form>

      <div className={box}>
        <span className={label}>PIN планшета у бара</span>
        <p className="text-xs text-white/45">Общий вход для планшета: при «Одобрено» выбирается официант на смене. {tabletSet ? 'Сейчас PIN задан.' : 'Сейчас PIN не задан.'} Личные PIN сотрудников — в разделе «Персонал».</p>
        <div className="flex flex-wrap gap-2">
          <input inputMode="numeric" pattern="\d{4,6}" placeholder="4–6 цифр" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${input} w-40 tracking-[.2em]`} />
          <button disabled={!db || busy === 'pin' || pin.length < 4} onClick={() => saveTablet(pin)} className="h-11 rounded-xl border border-white/20 px-4 text-sm disabled:opacity-40">Сохранить</button>
          <button disabled={!db || busy === 'pin'} onClick={() => saveTablet('auto')} className="h-11 rounded-xl bg-[#f2f2f4] px-4 text-sm font-semibold text-[#050507] disabled:opacity-40">Сгенерировать</button>
        </div>
        <Msg k="pin" />
      </div>
    </div>
  );
}
