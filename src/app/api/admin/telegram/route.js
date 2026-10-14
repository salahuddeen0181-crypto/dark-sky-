import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { tg, tgReady, staffChatId, webhookSecret } from '@/lib/telegram';
import { siteUrl } from '@/lib/site';

// { action: 'webhook' } — point the bot at this site; { action: 'test' } — send a test message to the staff group.
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 400 });
  const { action } = await req.json().catch(() => ({}));
  try {
    if (action === 'webhook') {
      const url = `${await siteUrl()}/api/telegram`;
      if (!url.startsWith('https://')) return NextResponse.json({ error: `Telegram требует https-адрес, а сайт открыт как ${url}` }, { status: 400 });
      await tg('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message', 'callback_query'], drop_pending_updates: true });
      return NextResponse.json({ ok: true, url });
    }
    if (action === 'test') {
      if (!tgReady()) return NextResponse.json({ error: 'TELEGRAM_CHAT_ID не задан' }, { status: 400 });
      await tg('sendMessage', { chat_id: staffChatId(), text: '✅ DARKSKY: тестовое сообщение. Заказы будут приходить сюда.' });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
