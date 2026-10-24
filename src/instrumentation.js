// Next.js calls register() once when the server starts: the background timer for order reminders lives here
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.TELEGRAM_BOT_TOKEN) return;
  const { startReminders } = await import('./lib/reminders');
  startReminders();
}
