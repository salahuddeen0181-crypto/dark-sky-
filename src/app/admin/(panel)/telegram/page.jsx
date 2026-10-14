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
  const want = `${await siteUrl()}/api/telegram`;
  const hookOk = hook?.url === want;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-lg uppercase tracking-[.08em]">Telegram</h1>
      <ol className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-5 text-sm leading-relaxed">
        <Row ok={hasToken && !!me}>
          Бот: {me ? <b>@{me.username}</b> : <>создайте бота у <b>@BotFather</b> (команда /newbot) и положите токен в переменную <code>TELEGRAM_BOT_TOKEN</code></>}
          {err && <span className="block text-[#f2a676]">Ошибка: {err}</span>}
        </Row>
        <Row ok={hookOk}>
          Вебхук: {hookOk ? 'подключён' : <>не подключён — нажмите «Подключить бота» ниже{hook?.url ? <> (сейчас: {hook.url})</> : null}</>}
          {hook?.last_error_message && <span className="block text-[#f2a676]">Последняя ошибка: {hook.last_error_message}</span>}
        </Row>
        <Row ok={hasChat}>
          Группа официантов: {hasChat ? <>ID <code>{process.env.TELEGRAM_CHAT_ID}</code></> : <>создайте группу, добавьте туда бота и напишите в группе <b>/id</b> — бот ответит номером. Положите его в <code>TELEGRAM_CHAT_ID</code></>}
        </Row>
      </ol>
      <TelegramActions canHook={hasToken} canTest={hasToken && hasChat} />
      <p className="text-xs leading-relaxed text-white/45">
        Как это работает: гость отправляет заказ → бот пишет в группу «🔔 Новый заказ · Стол N» с кнопкой «Принял». Кто нажал — тот и взял заказ,
        остальные видят имя. После подачи нажмите «Подано». Гость видит статус у себя в телефоне.
      </p>
    </div>
  );
}
