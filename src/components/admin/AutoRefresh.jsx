'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reloads the page's data every few seconds, only while the tab is in sight (a hidden tab costs nothing)
export default function AutoRefresh({ seconds = 10 }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && router.refresh();
    const t = setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick); // back to the tab: fresh at once
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [router, seconds]);
  return null;
}
