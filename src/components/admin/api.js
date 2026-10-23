// Small fetch wrapper for the admin: JSON in/out, throws the server's error message.
export async function api(url, method = 'POST', body) {
  const r = await fetch(url, {
    method,
    headers: body instanceof Blob ? { 'content-type': body.type } : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Ошибка ${r.status}`);
  return j;
}

export const ru = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');
export const fmt = n => (n == null ? 'по запросу' : '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

// Preview picture for an item: an uploaded photo, or the menu's own media — a keyed clip shows its still (.webp).
export const thumb = (img, media) => (img ? `/api/img/${img}` : media ? media.split('#')[0].replace(/\.webm$/i, '.webp') : null);
