'use client';
export default function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 font-semibold text-white">Печать</button>;
}
