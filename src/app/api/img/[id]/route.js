import { db } from '@/lib/db';

// Dish photos live in the database (uploaded from the admin, already resized). Ids are immutable → cache forever.
export async function GET(req, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('not found', { status: 404 });
  const [img] = await db()`select mime, bytes from images where id = ${id}`;
  if (!img) return new Response('not found', { status: 404 });
  return new Response(img.bytes, { headers: { 'content-type': img.mime, 'cache-control': 'public, max-age=31536000, immutable' } });
}
