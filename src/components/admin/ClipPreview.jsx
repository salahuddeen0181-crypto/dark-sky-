'use client';
import { useEffect, useRef } from 'react';
import AlphaClip from '../AlphaClip';

// A dish clip playing as the guest menu shows it: an uploaded one (picture over its mask, joined by AlphaClip), or one
// made on the Mac (/media/<slug>.webm, with a .mov twin for Safari and iPhones)
export const isClip = m => !!m && (/^\/api\/clip\//.test(m) || /^\/media\/.+\.webm/.test(m));

export default function ClipPreview({ media, className = '' }) {
  const video = useRef(null), file = media.split('#')[0], poster = file.replace(/\.(webm|mp4)$/i, '.webp');
  const uploaded = file.startsWith('/api/clip/');
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (uploaded) v.src = file;
    v.load(); v.play().catch(() => {});
  }, [file, uploaded]);
  return (
    <div className={`relative h-full w-full ${className}`}>
      {uploaded
        ? <AlphaClip videoRef={video} poster={poster} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
        : (
          <video ref={video} muted loop playsInline autoPlay poster={poster} className="absolute inset-0 h-full w-full object-contain">
            <source src={file.replace(/\.webm$/, '.mov')} type='video/mp4; codecs="hvc1"' />
            <source src={file} type="video/webm" />
          </video>
        )}
    </div>
  );
}
