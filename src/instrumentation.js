// Next.js calls register() once when the server starts: the background timer for order reminders and the day's
// report lives here (the report is kept for the admin even without Telegram)
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !(process.env.TELEGRAM_BOT_TOKEN || process.env.DATABASE_URL)) return;
  const { startReminders } = await import('./lib/reminders');
  startReminders();
}
