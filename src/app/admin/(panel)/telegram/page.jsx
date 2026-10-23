import { tg } from '@/lib/telegram';
import { siteUrl } from '@/lib/site';
import TelegramActions from '@/components/admin/TelegramActions';

const Row = ({ ok, children }) => (
  <li className="flex gap-3"><span className={ok ? 'text-[#7ddc9b]' : 'text-[#f2a676]'}>{ok ? '✓' : '•'}</span><span>{children}</span></li>
);

export default async function TelegramPage() {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN, hasChat = !!process.env.TELEGRAM_CHAT_ID;
  let me = null, hook = null, err = '';
  if (hasToken) {
    try { [me, hook] = await Promise.all([tg('getMe'), tg('getWebhookInfo')]); } catch (e) { err = e.message; }
  }
  const site = await siteUrl(), https = site.startsWith('https://');
  const hookOk = hook?.url === `${site}/api/telegram`;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-lg uppercase tracking-[.08em]">Telegram</h1>
      <ol className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-5 text-sm leading-relaxed">
        <Row ok={hasToken && !!me}>
          Бот: {me ? <b>@{me.username}</b> : <>создайте бота у <b>@BotFather</b> (команда /newbot) и положите токен в переменную <code>TELEGRAM_BOT_TOKEN</code></>}
          {err && <span className="block text-[#f2a676]">Ошибка: {err}</span>}
        </Row>
        <Row ok={hasChat}>
          Группа официантов: {hasChat ? <>ID <code>{process.env.TELEGRAM_CHAT_ID}</code></> : <>создайте группу, добавьте туда бота, напишите в группе любое сообщение и нажмите «Найти группу» ниже. Номер положите в <code>TELEGRAM_CHAT_ID</code></>}
        </Row>
        <Row ok={hookOk}>
          Вебхук (кнопки «Одобрено»/«Подано» в группе, команды /start и /smena): {hookOk ? 'подключён' : https ? 'нажмите «Подключить вебхук»' : <>нужен публичный https-адрес сайта (после публикации на Vercel); сейчас сайт открыт как <code>{site}</code></>}
          {hook?.last_error_message && <span className="block text-[#f2a676]">Последняя ошибка: {hook.last_error_message}</span>}
        </Row>
        <Row ok={!!me?.has_main_web_app}>
          Приложение для официантов внутри Telegram: {me?.has_main_web_app ? 'настроено' : <>в @BotFather → /mybots → бот → <b>Bot Settings → Configure Mini App → Enable</b>, адрес <code>{https ? site : 'https://<ваш-сайт>'}/staff</code></>}
        </Row>
      </ol>
      <TelegramActions canHook={hasToken && https} canTest={hasToken && hasChat} canFind={hasToken} />
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-white/45">
        <p>Как это работает: гость отправляет заказ → бот пишет в группу «🔔 Новый заказ · Стол N» с кнопками «✋ Одобрено» и «Открыть заказ». Бот знает, кто нажал, — заказ записывается на этого официанта. «Открыть заказ» ведёт в приложение: там можно добавить или убрать блюда.</p>
        <p>Официанты: каждый пишет боту /start → в «Персонале» нажмите «Одобрить». Дальше они открывают приложение из бота, отмечают смену (кнопка в приложении или /smena) и видят все заказы. Общий планшет у бара входит по PIN и при одобрении выбирает официанта на смене.</p>
      </div>
    </div>
  );
}
