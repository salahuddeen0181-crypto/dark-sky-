import 'server-only';
import crypto from 'node:crypto';
import { fmtPrice } from './money';

// Telegram Bot API. TELEGRAM_API_BASE is only for tests (points at a mock server).
const base = () => `${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
export const tgReady = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
export const staffChatId = () => String(process.env.TELEGRAM_CHAT_ID || '');

// Secret Telegram sends back with every webhook call; derived from the bot token so there is nothing extra to configure.
export const webhookSecret = () => crypto.createHash('sha256').update('darksky-webhook:' + (process.env.TELEGRAM_BOT_TOKEN || '')).digest('base64url').slice(0, 48);

export async function tg(method, body = {}) {
  const r = await fetch(`${base()}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description || r.status}`);
  return j.result;
}

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const tz = () => process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires';
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz() });

export function orderText(o) {
  const head = { new: '🔔 <b>НОВЫЙ ЗАКАЗ</b>', accepted: '✅ <b>ПРИНЯТ</b>', served: '🍽 <b>ПОДАНО</b>' }[o.status] || '';
  const out = [`${head}  ·  <b>СТОЛ ${o.table_number}</b>`, `#${o.id} · ${hhmm(o.created_at)}`, ''];
  for (const l of o.lines) {
    out.push(`• ${esc(l.name)}${l.variant ? ' — ' + esc(l.variant) : ''} × <b>${l.qty}</b>   ${l.total == null ? 'уточнить' : fmtPrice(l.total)}`);
  }
  out.push('');
  if (o.discount) out.push(`Сумма: ${fmtPrice(o.subtotal)}`, `Скидка −15% (наличные / крипто): −${fmtPrice(o.discount)}`);
  out.push(`<b>Итого: ${fmtPrice(o.total)}</b>${o.on_request ? ' + позиции по запросу' : ''}`);
  out.push(o.cash ? '💵 Оплата: наличные или крипто (USDT)' : '💳 Оплата: обычная');
  if (o.status === 'accepted') out.push('', `✋ Принял: <b>${esc(o.accepted_by)}</b> в ${hhmm(o.accepted_at)}`);
  if (o.status === 'served') out.push('', `✋ ${esc(o.accepted_by)} · подано в ${hhmm(o.served_at)}`);
  return out.join('\n');
}

export function orderKeyboard(o) {
  if (o.status === 'new') return { inline_keyboard: [[{ text: '✋ Принял', callback_data: `acc:${o.id}` }]] };
  if (o.status === 'accepted') return { inline_keyboard: [[{ text: '🍽 Подано', callback_data: `srv:${o.id}` }]] };
  return { inline_keyboard: [] };
}

export async function notifyNewOrder(o) {
  const m = await tg('sendMessage', { chat_id: staffChatId(), text: orderText(o), parse_mode: 'HTML', reply_markup: orderKeyboard(o) });
  return m.message_id;
}

export async function refreshOrderMessage(o) {
  if (!o.tg_message_id) return;
  await tg('editMessageText', { chat_id: staffChatId(), message_id: Number(o.tg_message_id), text: orderText(o), parse_mode: 'HTML', reply_markup: orderKeyboard(o) });
}
