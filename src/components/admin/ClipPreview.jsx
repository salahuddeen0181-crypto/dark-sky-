'use client';
import { useEffect, useRef, useState } from 'react';
import AlphaClip from '../AlphaClip';

// A dish clip playing as the guest menu shows it: an uploaded one (picture over its mask, joined by AlphaClip), or one
// made on the Mac (/media/<slug>.webm, with a .mov twin for Safari and iPhones)
export const isClip = m => !!m && (/^\/api\/clip\//.test(m) || /^\/media\/.+\.webm/.test(m));
export const CHECKER = 'bg-[conic-gradient(#2a2a31_25%,#16161b_0_50%,#2a2a31_0_75%,#16161b_0)] bg-[length:20px_20px]';

// checker: on a chequered ground, where what is left of the backdrop shows
export default function ClipPreview({ media, checker = false, className = '' }) {
  const video = useRef(null), [stuck, setStuck] = useState(false);
  const file = media.split('#')[0], poster = file.replace(/\.(webm|mp4)$/i, '.webp'), uploaded = file.startsWith('/api/clip/');
  const play = () => { const v = video.current; v?.play().then(() => setStuck(false), () => setStuck(true)); };
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (uploaded) v.src = file;
    v.load(); play();
  }, [file, uploaded]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div onClick={play} className={`relative h-full w-full ${checker ? CHECKER : ''} ${className}`}>
      {uploaded
        ? <AlphaClip videoRef={video} poster={poster} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
        : (
          <video ref={video} muted loop playsInline autoPlay poster={poster} className="absolute inset-0 h-full w-full object-contain">
            <source src={file.replace(/\.webm$/, '.mov')} type='video/mp4; codecs="hvc1"' />
            <source src={file} type="video/webm" />
          </video>
        )}
      {stuck && <button type="button" onClick={play} className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/60 text-2xl text-white" aria-label="Запустить">▶</button>}
    </div>
  );
}
