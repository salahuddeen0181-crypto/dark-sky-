import 'server-only';
import crypto from 'node:crypto';
import { fmtPrice } from './money';
import { tableName } from './table-name';

// Telegram Bot API. TELEGRAM_API_BASE is only for tests (points at a mock server).
const base = () => `${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
// The bot sends orders to waiters privately; TELEGRAM_CHAT_ID (the owners' feed group) is optional
export const tgReady = () => !!process.env.TELEGRAM_BOT_TOKEN;
export const staffChatId = () => String(process.env.TELEGRAM_CHAT_ID || '');

// Secret Telegram sends back with every webhook call; derived from the bot token so there is nothing extra to configure.
export const webhookSecret = () => crypto.createHash('sha256').update('darksky-webhook:' + (process.env.TELEGRAM_BOT_TOKEN || '')).digest('base64url').slice(0, 48);

export async function tg(method, body = {}) {
  const r = await fetch(`${base()}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description || r.status}`);
  return j.result;
}

export const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const tz = () => process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires';
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz() });

// Bot profile (username, whether the Mini App is set up in @BotFather), cached for 10 minutes
let me = null;
export async function botInfo() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (!me || Date.now() - me.at > 10 * 60e3) me = { at: Date.now(), info: await tg('getMe').catch(() => null) };
  return me.info;
}

// The bot and its webhook for the admin's Telegram page, kept for a minute (each check is two calls to Telegram);
// the page's actions drop it, so what they changed shows at once
const status = (globalThis.__darkskyTgStatus ||= { at: 0, v: null });
export async function tgStatus() {
  if (!status.v || Date.now() - status.at > 60e3) { status.v = await Promise.all([tg('getMe'), tg('getWebhookInfo')]); status.at = Date.now(); }
  return status.v;
}
export const tgStatusChanged = () => { status.v = null; };

// Where "Open order" leads: the staff Mini App inside Telegram (t.me/<bot>?startapp=o<id>) when it is set up,
// else the order page on the site. Telegram accepts link buttons only for public https addresses.
async function orderLink(o, site) {
  const bot = await botInfo();
  if (bot?.has_main_web_app) return { url: `https://t.me/${bot.username}?startapp=o${o.id}`, button: true };
  const url = `${site || process.env.SITE_URL || ''}/staff/o/${o.id}`;
  return { url, button: url.startsWith('https://') };
}

// One order, three views:
//  offer — to waiters while nobody has taken it (button «Взять заказ»);
//  mine  — to the waiter who took it (button «Подано»), others get a one-line «взял(а) Ана»;
//  feed  — the owners' group: the same order with its status, no buttons that act on it.
export function orderText(o, link, view = 'feed') {
  const head = view === 'mine'
    ? { accepted: '✅ <b>ВАШ ЗАКАЗ</b>', served: '🍽 <b>ПОДАНО</b>' }[o.status] || '🔔 <b>НОВЫЙ ЗАКАЗ</b>'
    : { new: '🔔 <b>НОВЫЙ ЗАКАЗ</b>', accepted: '✅ <b>ВЗЯТ</b>', served: '🍽 <b>ПОДАНО</b>' }[o.status] || '';
  const out = [`${head}  ·  <b>${esc(tableName(o, 'СТОЛ').toUpperCase())}</b>`, `#${o.id} · ${hhmm(o.created_at)}`];
  if (o.extra_of) out.push(`➕ <b>Дозаказ к #${o.extra_of}</b> — те же гости`);
  out.push('');
  for (const l of o.lines) {
    out.push(`• ${esc(l.name)}${l.variant ? ' — ' + esc(l.variant) : ''} × <b>${l.qty}</b>   ${l.total == null ? 'уточнить' : fmtPrice(l.total)}`);
  }
  if (o.note) out.push('', `💬 ${esc(o.note)}`);
  if (o.edited_at) out.push('', '✏️ Заказ изменён персоналом');
  out.push('');
  if (o.discount) out.push(`Сумма: ${fmtPrice(o.subtotal)}`, `Скидка −15% (наличные / крипто): −${fmtPrice(o.discount)}`);
  out.push(`<b>Итого: ${fmtPrice(o.total)}</b>${o.on_request ? ' + позиции по запросу' : ''}`);
  out.push(o.cash ? '💵 Оплата: наличные или крипто (USDT)' : '💳 Оплата: обычная');
  if (view === 'offer' && o.status === 'new') out.push('', 'Кто первым нажмёт «Взять», того и заказ.');
  if (view !== 'mine' && o.status === 'accepted') out.push('', `✋ Взял(а): <b>${esc(o.accepted_by)}</b> в ${hhmm(o.accepted_at)}`);
  if (o.status === 'served') out.push('', `✋ ${esc(o.accepted_by)} · подано в ${hhmm(o.served_at)}`);
  if (link && !link.button) out.push('', `<a href="${esc(link.url)}">Открыть заказ</a>`);
  return out.join('\n');
}

export function orderKeyboard(o, link, view = 'feed') {
  const rows = [];
  if (view !== 'feed' && o.status === 'new') rows.push([{ text: '✋ Взять заказ', callback_data: `acc:${o.id}` }]);
  if (view === 'mine' && o.status === 'accepted') rows.push([{ text: '🍽 Подано', callback_data: `srv:${o.id}` }]);
  if (link?.button) rows.push([{ text: o.status === 'served' || view === 'feed' ? 'Открыть заказ' : '📋 Открыть заказ · править', url: link.url }]);
  return { inline_keyboard: rows };
}

const send = (chat_id, text, reply_markup, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'HTML', reply_markup, link_preview_options: { is_disabled: true }, ...extra });

// A new order: privately to each waiter (recipients: [{ id, tg_id }]) and to the owners' feed group, if set.
// Returns the messages sent, to update them later. A waiter who never wrote to the bot is skipped.
export async function notifyNewOrder(o, site, recipients = []) {
  const link = await orderLink(o, site), out = [];
  await Promise.all(recipients.map(w => send(w.tg_id, orderText(o, link, 'offer'), orderKeyboard(o, link, 'offer'))
    .then(m => out.push({ chat_id: w.tg_id, message_id: m.message_id, staff_id: w.id, role: 'waiter' }))
    .catch(e => console.error('tg offer', w.id, e.message))));
  if (staffChatId()) {
    const m = await send(staffChatId(), orderText(o, link, 'feed'), orderKeyboard(o, link, 'feed')).catch(e => console.error('tg feed', e.message));
    if (m) out.push({ chat_id: staffChatId(), message_id: m.message_id, staff_id: null, role: 'feed' });
  }
  return out;
}

// After taking, serving or editing: every message of the order shows where it stands now
export async function refreshOrderMessages(o, msgs, site) {
  const link = await orderLink(o, site);
  await Promise.all(msgs.map(m => {
    let text, kb;
    if (m.role === 'feed') { text = orderText(o, link, 'feed'); kb = orderKeyboard(o, link, 'feed'); }
    else if (o.status === 'new') { text = orderText(o, link, 'offer'); kb = orderKeyboard(o, link, 'offer'); }
    else if (o.accepted_by_id && Number(m.staff_id) === Number(o.accepted_by_id)) { text = orderText(o, link, 'mine'); kb = orderKeyboard(o, link, 'mine'); }
    else { text = `Заказ #${o.id} · ${esc(tableName(o))} взял(а) <b>${esc(o.accepted_by)}</b>`; kb = { inline_keyboard: [] }; }
    return tg('editMessageText', { chat_id: m.chat_id, message_id: Number(m.message_id), text, parse_mode: 'HTML', reply_markup: kb, link_preview_options: { is_disabled: true } })
      .catch(e => { if (!/not modified/.test(e.message)) console.error('tg edit', m.chat_id, e.message); });
  }));
}

// Orders from before private messages: one message in the group, by orders.tg_message_id
export async function refreshOrderMessage(o, site) {
  if (!o.tg_message_id || !staffChatId()) return;
  const link = await orderLink(o, site);
  await tg('editMessageText', { chat_id: staffChatId(), message_id: Number(o.tg_message_id), text: orderText(o, link, 'feed'), parse_mode: 'HTML', reply_markup: orderKeyboard(o, link, 'feed'), link_preview_options: { is_disabled: true } });
}

// "Nobody has taken it yet": a reply to the order in each waiter's chat (Telegram highlights the original),
// with the «Взять» button again; with no waiter messages — in the feed group. minutes: how long the table waits.
export async function remindOrder(o, msgs, minutes, site) {
  const link = await orderLink(o, site), text = `⏰ <b>${esc(tableName(o))}</b> ждёт уже ${minutes} мин — заказ #${o.id} никто не взял`;
  const targets = msgs.filter(m => m.role === 'waiter');
  const list = targets.length ? targets : msgs.filter(m => m.role === 'feed');
  await Promise.all(list.map(m => send(m.chat_id, text, orderKeyboard(o, link, m.role === 'feed' ? 'feed' : 'offer'), { reply_parameters: { message_id: Number(m.message_id), allow_sending_without_reply: true } })
    .catch(e => console.error('tg remind', m.chat_id, e.message))));
}

// A private message to the waiter who took the order, when someone else changed it.
// changes: [{ kind: 'removed' | 'qty' | 'added', name, variant, from, to }]
export async function notifyEdited(o, chatId, changes, editor, site) {
  const link = await orderLink(o, site), dish = c => esc(c.name) + (c.variant ? ' — ' + esc(c.variant) : '');
  const lines = changes.map(c => (c.kind === 'removed' ? `➖ ${dish(c)}` : c.kind === 'added' ? `➕ ${dish(c)} × <b>${c.to}</b>` : `✏️ ${dish(c)}: × ${c.from} → × <b>${c.to}</b>`));
  const text = [`✏️ <b>Заказ #${o.id} · ${esc(tableName(o))} изменён</b>`, `Правил(а): ${esc(editor)}`, '', ...lines, '', `<b>Итого: ${fmtPrice(o.total)}</b>${o.on_request ? ' + позиции по запросу' : ''}`].join('\n');
  await send(chatId, text, link.button ? { inline_keyboard: [[{ text: '📋 Открыть заказ', url: link.url }]] } : undefined);
}
