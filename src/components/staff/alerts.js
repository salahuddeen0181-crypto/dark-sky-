// New-order alerts for the staff board. Browsers allow sound and notifications only after a tap,
// so enable() runs from the "Включить звук" button.

let ctx = null, wake = null;

export async function enable() {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  keepAwake();
  chime();
}
export const enabled = () => !!ctx && ctx.state === 'running';

// Two soft rising tones, loud enough to hear across a lounge
export function chime() {
  if (!enabled()) return;
  const t = ctx.currentTime;
  [[880, 0], [1320, .18], [880, .5], [1320, .68]].forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.35, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .4);
    o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + .42);
  });
}

export function announce(o) {
  chime();
  navigator.vibrate?.([200, 100, 200]);
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(`Новый заказ · стол ${o.table_number}`, { body: o.lines.map(l => `${l.name} × ${l.qty}`).join(', '), tag: 'order-' + o.id }); } catch (e) { /* iOS outside a home-screen app */ }
}

// The board usually lives on a tablet by the bar: keep its screen on while the page is open.
export async function keepAwake() {
  if (!('wakeLock' in navigator) || (wake && !wake.released) || document.hidden) return;
  try { wake = await navigator.wakeLock.request('screen'); } catch (e) { /* not allowed right now */ }
}
