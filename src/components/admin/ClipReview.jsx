'use client';
import { useState } from 'react';
import ClipPreview from './ClipPreview';

const STAGE = 'bg-[radial-gradient(70%_62%_at_50%_45%,rgba(196,199,208,.34),rgba(110,112,120,.12)_48%,transparent_76%),#020203]';
const btn = 'h-11 rounded-xl border border-white/15 px-3 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40';
const word = s => (s > 0 ? `сильнее ×${s}` : s < 0 ? `мягче ×${-s}` : 'обычная');

// A finished cut, playing on the menu's dark stage and on a chequered ground (left-over backdrop shows there), with
// what to do next: take it, or have the same video cut again stronger, gentler, without the screen's tint on glass…
export default function ClipReview({ clip, tries, onAccept, onRecut, onClose }) {
  const o = clip.opts || {}, s = o.strength || 0;
  const [glass, setGlass] = useState(!!o.glass), [noShadow, setNoShadow] = useState(!!o.noShadow);
  const recut = strength => onRecut({ strength, glass, noShadow });
  const changed = glass !== !!o.glass || noShadow !== !!o.noShadow;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8793c]/40 bg-[#0e0e13] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Как вырезалось?</span>
        <span className="text-xs text-white/40">вырезка: {word(s)}{o.glass ? ' · без отсвета' : ''}{o.noShadow ? ' · без тени' : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`aspect-[9/14] overflow-hidden rounded-xl ${STAGE}`}><ClipPreview key={'a' + clip.media} media={clip.media} /></div>
        <div className="aspect-[9/14] overflow-hidden rounded-xl"><ClipPreview key={'b' + clip.media} media={clip.media} checker /></div>
      </div>
      <p className="-mt-1 text-xs text-white/40">Слева — как в меню. Справа на клетке видно, где остался фон. Не играет — нажмите на видео.</p>
      <button onClick={() => onAccept(clip.media)} className="h-12 rounded-xl bg-[#f2f2f4] text-sm font-semibold text-[#050507]">Хорошо — поставить это видео</button>
      {clip.recut ? <>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={() => recut(Math.min(2, s + 1))} disabled={s >= 2} className={btn}>Остался фон или зелёная кайма</button>
          <button onClick={() => recut(Math.max(-2, s - 1))} disabled={s <= -2} className={btn}>Пропали части блюда, стекло дырявое</button>
        </div>
        <label className="flex items-start gap-2 text-sm text-white/75"><input type="checkbox" className="mt-1" checked={glass} onChange={e => setGlass(e.target.checked)} /> <span>Убрать зелёный отсвет со стекла <span className="text-white/40">— для бокалов; зелёное в кадре (лайм, мята) станет серым</span></span></label>
        <label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={noShadow} onChange={e => setNoShadow(e.target.checked)} /> Убрать тень под блюдом</label>
        {changed && <button onClick={() => recut(s)} className={btn}>Пересобрать с этими галочками</button>}
      </> : <p className="text-xs text-white/45">Исходное видео уже удалено (хранится 3 дня): чтобы вырезать иначе, загрузите его заново.</p>}
      {tries >= 3 && <p className="rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">Если и так не выходит, видео лучше переснять: ровный зелёный или однотонный фон по всему кадру без складок и теней, объект не касается краёв и не цвета фона, камера неподвижна, свет ровный.</p>}
      <button onClick={onClose} className="text-sm text-white/50 hover:text-white">Закрыть</button>
    </div>
  );
}
