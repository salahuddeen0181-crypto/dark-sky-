import 'server-only';
import * as S from './order-store';
import { tgReady, remindOrder } from './telegram';

// "Nobody has taken it yet": every ORDER_REMIND_MIN minutes (default 3), up to ORDER_REMIND_TIMES times (default 3),
// the waiters get a reply to the order with the «Взять» button again. Checked every 30 s by one timer per server
// (src/instrumentation.js); claimReminder() makes sure a reminder goes out once even with several processes.
const EVERY = 30e3;

async function tick() {
  if (!tgReady()) return;
  const minutes = Number(process.env.ORDER_REMIND_MIN) || 3, times = Number(process.env.ORDER_REMIND_TIMES ?? 3);
  if (times <= 0) return;
  for (const o of await S.dueReminders(minutes, times)) {
    const claimed = await S.claimReminder(o.id, o.reminders || 0);
    if (!claimed) continue;
    const waited = Math.max(1, Math.round((Date.now() - new Date(o.created_at)) / 60e3));
    await remindOrder(claimed, await S.orderMessages(o.id), waited, process.env.SITE_URL).catch(e => console.error('remind', o.id, e.message));
  }
}

export function startReminders() {
  if (globalThis.__darkskyReminders) return; // once per server process (dev reloads modules)
  globalThis.__darkskyReminders = setInterval(() => tick().catch(e => console.error('reminders', e.message)), EVERY);
  console.log(`order reminders: every ${Number(process.env.ORDER_REMIND_MIN) || 3} min, up to ${process.env.ORDER_REMIND_TIMES ?? 3} times`);
}
