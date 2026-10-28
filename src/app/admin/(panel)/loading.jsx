// Shown at once while the next admin page comes from the server (it is far away): the page doesn't seem stuck
export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Загрузка">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-white/10" />
      {[0, 1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[.04]" />)}
    </div>
  );
}
