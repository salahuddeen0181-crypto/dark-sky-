'use client';
import { useState } from 'react';
import { api, thumb } from '../api';
import { shrink } from '../PhotoPanel';
import MediaTips from '../MediaTips';
import VideoUpload from '../VideoUpload';

const textBtn = 'h-11 rounded-xl border border-white/15 px-4 text-sm text-white/75 hover:bg-white/5 disabled:opacity-40';

// The section tile's picture: uploaded here, or the built-in clip's still until one is. Folded until opened.
export default function TilePicture({ s, onChange }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const clip = s.video || s.clip, src = s.img ? thumb(s.img) : clip ? clip.split('#')[0].replace(/\.(webm|mp4)$/i, '-th.webp') : null;
  async function upload(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try { onChange({ img: (await api('/api/admin/images', 'POST', await shrink(file))).id, video: null }); }
    catch (x) { setErr(x.message || 'Не получилось'); }
    setBusy(false);
  }
  return (
    <details className="group rounded-xl border border-white/10">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="h-10 w-14 flex-none overflow-hidden rounded-lg border border-white/10 bg-black">
          {src && <img src={src} alt="" className="h-full w-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */}
        </div>
        <span className="flex-1 text-sm text-white/80">Картинка или видео плитки</span>
        <span className="text-white/40 transition group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-white/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${textBtn} flex cursor-pointer items-center`}>
            {busy ? 'Загрузка…' : s.img ? 'Заменить картинку' : 'Загрузить картинку'}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={e => { upload(e.target.files[0]); e.target.value = ''; }} />
          </label>
          {(s.img || s.video) && <button onClick={() => onChange({ img: null, video: null })} className={textBtn}>{s.clip ? 'Вернуть стандартное' : 'Убрать'}</button>}
          {err && <span className="text-xs text-[#f2a676]">{err}</span>}
        </div>
        <VideoUpload onReady={video => onChange({ video, img: null })} />
        <MediaTips kind="tile" />
      </div>
    </details>
  );
}
