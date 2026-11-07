'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import ClipReview from './ClipReview';

const MAX = 90 * 1024 * 1024, PENDING = 'darksky.clip.pending';
const store = { get: () => { try { return localStorage.getItem(PENDING); } catch { return null; } }, set: v => { try { v ? localStorage.setItem(PENDING, v) : localStorage.removeItem(PENDING); } catch { /* private mode */ } } };
const thumbOf = m => m.split('#')[0].replace(/\.mp4$/, '-th.webp');
const when = t => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Upload with progress: fetch can't report it
const send = (file, onPct) => new Promise((res, rej) => {
  const x = new XMLHttpRequest();
  x.open('POST', '/api/admin/clips'); x.setRequestHeader('content-type', 'application/octet-stream');
  x.upload.onprogress = e => e.lengthComputable && onPct(e.loaded / e.total);
  x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} if (x.status < 300) res(j.id); else rej(new Error(j.error || `Ошибка ${x.status}`)); };
  x.onerror = () => rej(new Error('Обрыв связи при загрузке'));
  x.send(file);
});

// A video on a green or plain backdrop: sent to the server, which cuts the backdrop out. The finished cut is shown
// before it is used (ClipReview), and can be cut again with other settings. The one being cut is remembered on this
// device, and the last few are listed, so leaving the page loses nothing. onReady(path of the clip).
export default function VideoUpload({ onReady, onBusy }) {
  const [stage, setStage] = useState(''), [pct, setPct] = useState(0), [cut, setCut] = useState(null), [err, setErr] = useState('');
  const [review, setReview] = useState(null), [recent, setRecent] = useState([]), [tries, setTries] = useState(0);
  const timer = useRef(0);
  const loadRecent = useCallback(() => fetch('/api/admin/clips').then(r => (r.ok ? r.json() : [])).then(setRecent).catch(() => {}), []);

  const finish = useCallback(e => { setStage(''); setErr(e || ''); onBusy?.(false); store.set(null); loadRecent(); }, [onBusy, loadRecent]);
  const poll = useCallback(id => {
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/clips/${id}`);
        if (r.status === 404) return finish();
        const c = await r.json();
        if (c.status === 'ready') { finish(); setReview({ id, ...c }); }
        else if (c.status === 'failed') finish(c.error);
        else { setCut(c.status === 'working' ? c.progress || 0 : null); poll(id); }
      } catch { poll(id); } // offline for a moment: the server carries on
    }, 2000);
  }, [finish]);
  const follow = useCallback(id => { store.set(id); setCut(null); setStage('cut'); setReview(null); onBusy?.(true); poll(id); }, [poll, onBusy]);

  useEffect(() => {
    loadRecent();
    const id = store.get();
    if (id) follow(id); // a cut started before this page was left
    return () => clearTimeout(timer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > MAX) return setErr('Файл больше 90 МБ');
    setErr(''); setPct(0); setStage('upload'); setReview(null); setTries(1); onBusy?.(true);
    try { follow(await send(file, setPct)); }
    catch (x) { finish(x.message); }
  }
  async function recut(opts) {
    setErr('');
    try {
      const r = await fetch(`/api/admin/clips/${review.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ opts }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Ошибка ${r.status}`);
      setTries(t => t + 1); follow(j.id);
    } catch (x) { setErr(x.message); }
  }

  const status = c => (c.status === 'ready' ? 'готово' : c.status === 'failed' ? 'не вышло' : c.status === 'working' ? `вырезаем ${Math.round((c.progress || 0) * 100)}%` : 'в очереди');
  return (
    <div className="flex flex-col gap-2">
      <label className={`flex h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-sm ${stage ? 'opacity-60' : 'cursor-pointer hover:bg-white/5'}`}>
        {stage === 'upload' ? `Загружаем… ${Math.round(pct * 100)}%` : stage === 'cut' ? (cut == null ? 'Ждём очереди на вырезку…' : `Вырезаем фон… ${Math.round(cut * 100)}%`) : 'Загрузить видео'}
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v" disabled={!!stage} onChange={pick} className="hidden" />
      </label>
      {stage === 'cut' && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#e8793c] transition-[width] duration-700" style={{ width: `${Math.round((cut || 0) * 100)}%` }} /></div>}
      {stage === 'cut' && <p className="text-xs text-white/45">Когда фон вырежется, здесь появится результат. Можно уйти со страницы: видео останется в «Последних видео».</p>}
      {err && <div className="text-sm text-[#f2a676]">{err}</div>}
      {review && <ClipReview clip={review} tries={tries} onRecut={recut} onClose={() => setReview(null)} onAccept={m => { setReview(null); onReady(m); }} />}
      {!stage && !review && recent.length > 0 && (
        <details className="rounded-xl border border-white/10 px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none text-white/70">Последние видео · {recent.length}</summary>
          <div className="mt-2 flex flex-col gap-1">
            {recent.map(c => (
              <button key={c.id} type="button" disabled={c.status !== 'ready'} onClick={() => { setTries(1); setReview(c); }}
                className="flex items-center gap-3 rounded-lg p-1 text-left hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent">
                <span className="h-12 w-9 flex-none overflow-hidden rounded bg-black">{c.media && <img src={thumbOf(c.media)} alt="" className="h-full w-full object-contain" /> /* eslint-disable-line @next/next/no-img-element */}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-white/80">{when(c.created_at)} · {status(c)}</span>
                  {c.error && <span className="block text-xs text-[#f2a676]">{c.error}</span>}
                </span>
                {c.status === 'ready' && <span className="text-xs text-white/45">посмотреть ›</span>}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
