import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { tg, staffChatId, webhookSecret } from '@/lib/telegram';
import { acceptOrder, serveOrder, getOrder } from '@/lib/orders';

const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Telegram webhook: the "Принял" / "Подано" buttons and the /id helper.
export async function POST(req) {
  const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!process.env.TELEGRAM_BOT_TOKEN || !same(got, webhookSecret())) return new NextResponse('forbidden', { status: 403 });
  const upd = await req.json().catch(() => ({}));

  try {
    const cq = upd.callback_query;
    if (cq) {
      const chat = String(cq.message?.chat?.id ?? '');
      if (chat !== staffChatId()) { await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Нет доступа' }); return NextResponse.json({ ok: true }); }
      const [act, raw] = String(cq.data || '').split(':');
      const id = Number(raw);
      const who = [cq.from?.first_name, cq.from?.last_name].filter(Boolean).join(' ') || cq.from?.username || 'официант';
      const done = act === 'acc' ? await acceptOrder(id, who) : act === 'srv' ? await serveOrder(id) : null;
      let text = 'Готово';
      if (!done) {
        const cur = await getOrder(id);
        text = cur?.status === 'accepted' ? `Уже принял(а) ${cur.accepted_by}` : cur?.status === 'served' ? 'Уже подано' : 'Заказ не найден';
      }
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text });
      return NextResponse.json({ ok: true });
    }

    const msg = upd.message;
    if (msg && /^\/(id|start)(@\w+)?\b/.test(msg.text || '')) {
      const ok = String(msg.chat.id) === staffChatId();
      await tg('sendMessage', {
        chat_id: msg.chat.id, parse_mode: 'HTML',
        text: ok ? '✅ Этот чат подключён: сюда приходят заказы DARKSKY.' : `ID этого чата: <code>${msg.chat.id}</code>\nУкажите его в TELEGRAM_CHAT_ID, чтобы заказы приходили сюда.`,
      });
    }
  } catch (e) {
    console.error('telegram webhook', e);
  }
  return NextResponse.json({ ok: true });
}
