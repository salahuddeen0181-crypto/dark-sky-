import { NextResponse } from 'next/server';
import { startSession, pinLocked, pinFailed, clientIp } from '@/lib/auth';
import { mailConfig, resetsLeft, newResetToken, saveResetToken, redeemResetToken } from '@/lib/credentials';
import { sendOwnerMail, maskEmail } from '@/lib/mail';
import { siteUrl } from '@/lib/site';

// Forgotten admin password, no sign-in needed.
// { action: 'send' } — a one-time link to the owner's saved address (nobody can pick another address);
// { action: 'set', token, next } — the new password from that link, then this device is signed in.
const err = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  if (!process.env.DATABASE_URL) return err('Восстановление по почте не настроено', 503);
  const b = await req.json().catch(() => ({}));

  if (b.action === 'send') {
    if (!(await mailConfig())) return err('Восстановление по почте не настроено', 503);
    if ((await resetsLeft()) <= 0) return err('Уже отправлено 3 письма за час — попробуйте позже или найдите последнее письмо', 429);
    const token = newResetToken(), link = `${await siteUrl()}/admin/reset?t=${token}`;
    const r = await sendOwnerMail({
      subject: 'DARKSKY: новый пароль админки',
      text: `Кто-то (надеемся, вы) попросил сменить пароль админки DARKSKY.\n\nОткройте ссылку в течение 30 минут, чтобы задать новый пароль:\n${link}\n\nСсылка работает один раз. Если вы ничего не просили — просто удалите письмо, пароль останется прежним.`,
      html: `<p>Кто-то (надеемся, вы) попросил сменить пароль админки DARKSKY.</p><p><a href="${link}">Задать новый пароль</a> — ссылка работает 30 минут и один раз.</p><p style="color:#888">Если вы ничего не просили — просто удалите письмо, пароль останется прежним.</p>`,
    });
    if (!r.ok) return err(r.error, 502);
    await saveResetToken(token); // an earlier link stops working
    return NextResponse.json({ ok: true, to: maskEmail(r.to) });
  }

  if (b.action === 'set') {
    const ip = 'admin:' + clientIp(req);
    if (pinLocked(ip)) return err('Слишком много попыток, подождите 10 минут', 429);
    const next = String(b.next || '');
    if (next.length < 8) return err('Новый пароль — минимум 8 символов');
    if (next.length > 128) return err('Слишком длинный пароль');
    if (!(await redeemResetToken(String(b.token || ''), next))) {
      pinFailed(ip);
      return err('Ссылка устарела или уже использована — запросите новую', 410);
    }
    await startSession(); // signed with the new password: other devices are out, this one is in
    return NextResponse.json({ ok: true });
  }
  return err('Неизвестное действие');
}
