import 'server-only';
import nodemailer from 'nodemailer';
import { mailConfig } from './credentials';

// Letters from the owner's Gmail (an app password, set in «Доступ»), to the owner's address only.
// MAIL_DEV_SMTP=host:port sends to a local test SMTP server instead (development only, ignored in production).
function transport({ user, pass }) {
  const dev = process.env.NODE_ENV !== 'production' && process.env.MAIL_DEV_SMTP;
  const timeouts = { connectionTimeout: 15e3, greetingTimeout: 10e3, socketTimeout: 20e3 };
  if (dev) {
    const [host, port] = dev.split(':');
    return nodemailer.createTransport({ host, port: Number(port) || 2525, secure: false, ignoreTLS: true, ...timeouts });
  }
  return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }, ...timeouts });
}

// A readable reason for the admin, in Russian
function reason(e) {
  if (e?.code === 'EAUTH' || e?.responseCode === 535) return 'Gmail не принял адрес или пароль приложения — проверьте их';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(e?.code)) return 'Не удалось связаться с почтой Gmail, попробуйте позже';
  return 'Письмо не отправилось: ' + (e?.message || 'неизвестная ошибка');
}

// Sends to the saved owner address; returns { ok: true, to } or { ok: false, error }
export async function sendOwnerMail({ subject, text, html }) {
  const cfg = await mailConfig();
  if (!cfg) return { ok: false, error: 'Почта для восстановления не настроена' };
  try {
    await transport(cfg).sendMail({ from: { name: 'DARKSKY', address: cfg.user }, to: cfg.to, subject, text, html });
    return { ok: true, to: cfg.to };
  } catch (e) {
    console.error('mail', e.code || '', e.message);
    return { ok: false, error: reason(e) };
  }
}

// a@b.com → a***@b.com, for messages shown to someone not signed in
export const maskEmail = a => String(a).replace(/^(.)[^@]*(@.*)$/, (_, c, d) => c + '***' + d);
