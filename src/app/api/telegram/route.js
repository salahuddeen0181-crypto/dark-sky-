import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { tg, staffChatId, webhookSecret, botInfo } from '@/lib/telegram';
import { acceptOrder, serveOrder, getOrder } from '@/lib/orders';
import { staffReady, registerTg, getStaffByTg, openShift, startShift, endShift } from '@/lib/staff';
import { siteUrl } from '@/lib/site';

const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires' });

// Opens the staff Mini App from a private chat (web_app buttons work only there)
async function appButton() {
  const site = process.env.SITE_URL || (await siteUrl());
  return site.startsWith('https://') ? { inline_keyboard: [[{ text: '📋 Открыть приложение', web_app: { url: `${site}/staff` } }]] } : undefined;
}

// «Взять заказ» / «Подано» pressed in a waiter's private chat (or on an old message in the group): done in the name
// of whoever pressed, if they are an approved waiter
async function onButton(cq) {
  const chat = cq.message?.chat;
  const answer = text => tg('answerCallbackQuery', { callback_query_id: cq.id, text, show_alert: text.length > 60 });
  if (chat?.type !== 'private' && String(chat?.id ?? '') !== staffChatId()) return answer('Нет доступа');
  const [act, raw] = String(cq.data || '').split(':');
  const id = Number(raw);
  let who = { id: 0, name: [cq.from?.first_name, cq.from?.last_name].filter(Boolean).join(' ') || cq.from?.username || 'официант' };
  if (staffReady()) {
    const s = await getStaffByTg(cq.from.id);
    const bot = await botInfo();
    if (!s || s.status === 'pending') return answer(`Вы ещё не в списке официантов. Напишите боту @${bot?.username || ''} /start и дождитесь одобрения администратора.`);
    if (s.status !== 'active') return answer('Доступ закрыт администратором');
    who = { id: s.id, name: s.name };
  }
  const site = await siteUrl();
  const done = act === 'acc' ? await acceptOrder(id, who, site) : act === 'srv' ? await serveOrder(id, who, site) : null;
  if (done && act === 'acc' && who.id) await startShift(who.id);
  if (done) return answer(act === 'acc' ? `Заказ ваш, ${who.name}` : 'Подано');
  const cur = await getOrder(id);
  return answer(cur?.status === 'accepted' ? `Заказ уже взял(а) ${cur.accepted_by}` : cur?.status === 'served' ? 'Уже подано' : 'Заказ не найден');
}

// Private chat with the bot: /start registers the waiter, /smena starts or ends the shift
async function onPrivate(msg) {
  const reply = async (text, extra = {}) => tg('sendMessage', { chat_id: msg.chat.id, text, parse_mode: 'HTML', ...extra });
  if (!staffReady()) return reply('Учёт официантов пока не настроен (нет базы данных).');
  const s = await registerTg(msg.from);
  if (s.status === 'blocked') return reply('Доступ закрыт администратором.');
  if (s.status === 'pending') return reply(`Привет, ${s.name}! Заявка отправлена администратору — после одобрения здесь откроется приложение для заказов.`);
  if (/^\/smena\b/.test(msg.text || '')) {
    const open = await openShift(s.id);
    if (open) { await endShift(s.id); return reply(`Смена закончена (с ${hhmm(open.started_at)} до ${hhmm(Date.now())}). Спасибо!`); }
    await startShift(s.id);
    return reply('Смена начата ✅ Закончить — снова /smena или кнопкой в приложении.', { reply_markup: await appButton() });
  }
  const shift = await openShift(s.id);
  return reply(`${s.name}, вы в команде DARKSKY. ${shift ? `На смене с ${hhmm(shift.started_at)}.` : 'Смена не начата — /smena.'}\nЗаказы приходят в группу официантов, одобрять и править — в приложении.`, { reply_markup: await appButton() });
}

// Telegram webhook: group buttons, the waiters' private chats and the /id helper.
export async function POST(req) {
  const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!process.env.TELEGRAM_BOT_TOKEN || !same(got, webhookSecret())) return new NextResponse('forbidden', { status: 403 });
  const upd = await req.json().catch(() => ({}));
  try {
    if (upd.callback_query) await onButton(upd.callback_query);
    const msg = upd.message;
    if (msg && /^\/id(@\w+)?\b/.test(msg.text || '')) {
      const ok = String(msg.chat.id) === staffChatId();
      await tg('sendMessage', {
        chat_id: msg.chat.id, parse_mode: 'HTML',
        text: ok ? '✅ Этот чат подключён: сюда приходят заказы DARKSKY.' : `ID этого чата: <code>${msg.chat.id}</code>\nУкажите его в TELEGRAM_CHAT_ID, чтобы заказы приходили сюда.`,
      });
    } else if (msg?.chat?.type === 'private' && msg.from && /^\/(start|smena|app)\b/.test(msg.text || '')) await onPrivate(msg);
  } catch (e) {
    console.error('telegram webhook', e);
  }
  return NextResponse.json({ ok: true });
}
