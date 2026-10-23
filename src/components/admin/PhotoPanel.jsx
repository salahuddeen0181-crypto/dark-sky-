'use client';
import { useState } from 'react';
import { api, thumb } from './api';
import { cutout } from './cutout';

// Resize in the browser so the database only stores ~100 KB per photo.
async function shrink(file, max = 1200) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b), 'image/webp', 0.82));
}

// Same stage the guest menu puts cut-out dishes on: black with a light glow
const STAGE = 'bg-[radial-gradient(70%_62%_at_50%_45%,rgba(196,199,208,.34),rgba(110,112,120,.12)_48%,transparent_76%),#020203]';

// Dish photo: upload, optionally remove the background in the browser (BiRefNet), or keep the original.
export default function PhotoPanel({ img, media, cut, onChange, onBusy }) {
  const [cutOn, setCutOn] = useState(true), [orig, setOrig] = useState(null);
  const [stage, setStage] = useState(''), [pct, setPct] = useState(0), [err, setErr] = useState('');
  const busy = !!stage;
  const photo = thumb(img, media), onStage = !!(cut || (media && /\/media\/(cut\/|.+\.webm)/.test(media)));

  async function run(fn) {
    setErr(''); onBusy(true);
    try { await fn(); } catch (x) { setErr(x.message || 'Не получилось'); } finally { setStage(''); onBusy(false); }
  }
  const keepOriginal = file => run(async () => {
    setStage('upload');
    const { id } = await api('/api/admin/images', 'POST', await shrink(file));
    onChange({ img: id, media: null, cut: false });
  });
  const removeBg = file => run(async () => {
    const { blob } = await cutout(file, { onStage: setStage, onProgress: setPct });
    setStage('upload');
    const { id } = await api('/api/admin/images', 'POST', blob);
    onChange({ img: id, media: null, cut: true });
  });
  function pick(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setOrig(file);
    (cutOn ? removeBg : keepOriginal)(file);
  }

  const label = { model: pct < 1 ? `Загружаем модель вырезки… ${Math.round(pct * 100)}%` : 'Готовим модель…', cut: 'Вырезаем фон…', upload: 'Загружаем…' }[stage];
  return (
    <div className="flex flex-col gap-3">
      <div className={`aspect-square overflow-hidden rounded-2xl border border-white/10 ${onStage ? STAGE : 'bg-[#0c0c10]'}`}>
        {photo
          ? <img alt="" src={photo} className={`h-full w-full ${onStage ? 'object-contain p-3' : 'object-cover'}`} /> /* eslint-disable-line @next/next/no-img-element */
          : <div className="flex h-full items-center justify-center text-sm text-white/35">Нет фото</div>}
      </div>
      <label className={`flex h-11 items-center justify-center rounded-xl border border-white/15 text-sm ${busy ? 'opacity-60' : 'cursor-pointer hover:bg-white/5'}`}>
        {label || (photo ? 'Заменить фото' : 'Загрузить фото')}
        <input type="file" accept="image/*" disabled={busy} onChange={pick} className="hidden" />
      </label>
      <label className="flex items-center gap-2 text-sm text-white/75">
        <input type="checkbox" checked={cutOn} disabled={busy} onChange={e => setCutOn(e.target.checked)} /> Вырезать фон
      </label>
      <p className="text-xs leading-snug text-white/40">Блюдо встанет на дымный фон, как остальные. Первый раз на устройстве загружается модель (~115 МБ, потом из кэша), вырезка 10–60 секунд — лучше с ноутбука по Wi-Fi.</p>
      {orig && !busy && (cut
        ? <button onClick={() => keepOriginal(orig)} className="text-left text-sm text-white/60 hover:text-white">↺ Оставить оригинал без вырезки</button>
        : <button onClick={() => removeBg(orig)} className="text-left text-sm text-white/60 hover:text-white">✂ Вырезать фон у этого фото</button>)}
      {photo && !busy && <button onClick={() => onChange({ img: null, media: null, cut: false })} className="text-left text-sm text-white/50 hover:text-white">Убрать фото</button>}
      {err && <div className="text-sm text-[#f2a676]">{err}</div>}
    </div>
  );
}
