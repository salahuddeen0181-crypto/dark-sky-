'use client';
import { useEffect, useRef, useState } from 'react';

const MAX = 90 * 1024 * 1024;

// Upload with progress: fetch can't report it
const send = (file, onPct) => new Promise((res, rej) => {
  const x = new XMLHttpRequest();
  x.open('POST', '/api/admin/clips'); x.setRequestHeader('content-type', 'application/octet-stream');
  x.upload.onprogress = e => e.lengthComputable && onPct(e.loaded / e.total);
  x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} if (x.status < 300) res(j.id); else rej(new Error(j.error || `Ошибка ${x.status}`)); };
  x.onerror = () => rej(new Error('Обрыв связи при загрузке'));
  x.send(file);
});

// A video on a green or plain backdrop: sent to the server, which cuts the backdrop out. onReady(path of the clip).
export default function VideoUpload({ onReady, onBusy }) {
  const [stage, setStage] = useState(''), [pct, setPct] = useState(0), [err, setErr] = useState('');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const finish = e => { setStage(''); setErr(e || ''); onBusy?.(false); };
  const poll = id => {
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/clips/${id}`); const c = await r.json();
        if (c.status === 'ready') { finish(); onReady(c.media); }
        else if (c.status === 'failed') finish(c.error);
        else poll(id);
      } catch { poll(id); } // offline for a moment: the server carries on
    }, 3000);
  };
  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > MAX) return setErr('Файл больше 90 МБ');
    setErr(''); setPct(0); setStage('upload'); onBusy?.(true);
    try { const id = await send(file, setPct); setStage('cut'); poll(id); }
    catch (x) { finish(x.message); }
  }
  return (
    <div className="flex flex-col gap-2">
      <label className={`flex h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-sm ${stage ? 'opacity-60' : 'cursor-pointer hover:bg-white/5'}`}>
        {stage === 'upload' ? `Загружаем… ${Math.round(pct * 100)}%` : stage === 'cut' ? 'Вырезаем фон… 2–5 минут' : 'Загрузить видео'}
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v" disabled={!!stage} onChange={pick} className="hidden" />
      </label>
      {stage === 'cut' && <p className="text-xs text-white/45">Не закрывайте эту страницу: клип подставится сюда, как только будет готов.</p>}
      {err && <div className="text-sm text-[#f2a676]">{err}</div>}
    </div>
  );
}
