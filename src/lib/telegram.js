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

// Bot profile (username, whether the Mini App is set up in @BotFather), cached for 10 minutes
let me = null;
export async function botInfo() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (!me || Date.now() - me.at > 10 * 60e3) me = { at: Date.now(), info: await tg('getMe').catch(() => null) };
  return me.info;
}

// Where "Open order" leads: the staff Mini App inside Telegram (t.me/<bot>?startapp=o<id>) when it is set up,
// else the order page on the site. Telegram accepts link buttons only for public https addresses.
async function orderLink(o, site) {
  const bot = await botInfo();
  if (bot?.has_main_web_app) return { url: `https://t.me/${bot.username}?startapp=o${o.id}`, button: true };
  const url = `${site || process.env.SITE_URL || ''}/staff/o/${o.id}`;
  return { url, button: url.startsWith('https://') };
}

export function orderText(o, link) {
  const head = { new: '🔔 <b>НОВЫЙ ЗАКАЗ</b>', accepted: '✅ <b>ОДОБРЕНО</b>', served: '🍽 <b>ПОДАНО</b>' }[o.status] || '';
  const out = [`${head}  ·  <b>СТОЛ ${o.table_number}</b>`, `#${o.id} · ${hhmm(o.created_at)}`, ''];
  for (const l of o.lines) {
    out.push(`• ${esc(l.name)}${l.variant ? ' — ' + esc(l.variant) : ''} × <b>${l.qty}</b>   ${l.total == null ? 'уточнить' : fmtPrice(l.total)}`);
  }
  if (o.note) out.push('', `💬 ${esc(o.note)}`);
  if (o.edited_at) out.push('', '✏️ Заказ изменён персоналом');
  out.push('');
  if (o.discount) out.push(`Сумма: ${fmtPrice(o.subtotal)}`, `Скидка −15% (наличные / крипто): −${fmtPrice(o.discount)}`);
  out.push(`<b>Итого: ${fmtPrice(o.total)}</b>${o.on_request ? ' + позиции по запросу' : ''}`);
  out.push(o.cash ? '💵 Оплата: наличные или крипто (USDT)' : '💳 Оплата: обычная');
  if (o.status === 'accepted') out.push('', `✋ Одобрил(а): <b>${esc(o.accepted_by)}</b> в ${hhmm(o.accepted_at)}`);
  if (o.status === 'served') out.push('', `✋ ${esc(o.accepted_by)} · подано в ${hhmm(o.served_at)}`);
  if (link && !link.button) out.push('', `<a href="${esc(link.url)}">Открыть заказ</a>`);
  return out.join('\n');
}

// "Approve" / "Served" are pressed right in the group: the bot knows who pressed (see /api/telegram)
export function orderKeyboard(o, link) {
  const rows = [];
  if (o.status === 'new') rows.push([{ text: '✋ Одобрено', callback_data: `acc:${o.id}` }]);
  if (o.status === 'accepted') rows.push([{ text: '🍽 Подано', callback_data: `srv:${o.id}` }]);
  if (link?.button) rows.push([{ text: o.status === 'served' ? 'Открыть заказ' : '📋 Открыть заказ · править', url: link.url }]);
  return { inline_keyboard: rows };
}

export async function notifyNewOrder(o, site) {
  const link = await orderLink(o, site);
  const m = await tg('sendMessage', { chat_id: staffChatId(), text: orderText(o, link), parse_mode: 'HTML', reply_markup: orderKeyboard(o, link), link_preview_options: { is_disabled: true } });
  return m.message_id;
}

export async function refreshOrderMessage(o, site) {
  if (!o.tg_message_id) return;
  const link = await orderLink(o, site);
  await tg('editMessageText', { chat_id: staffChatId(), message_id: Number(o.tg_message_id), text: orderText(o, link), parse_mode: 'HTML', reply_markup: orderKeyboard(o, link), link_preview_options: { is_disabled: true } });
}
