// One-off, as in src/lib/darksky-data.js: Dark Roll and Midnight Roll join the hot rolls, with their own clips. Skipped
// if a dish with the id is already there. --dry prints what would change.
//
//   DATABASE_URL=... node scripts/menu-update-2026-11-02.mjs [--dry]
import postgres from 'postgres';
import { ITEMS, MEDIA } from '../src/lib/darksky-data.js';

const DRY = process.argv.includes('--dry');
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /[?&]sslmode=disable\b/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1, onnotice: () => {} });

for (const dish of ['dark-roll', 'midnight-roll']) {
  const { id, cat, ...data } = ITEMS.find(i => i.id === dish);
  const [had] = await sql`select id from menu_items where id = ${id}`;
  if (had) { console.log(`${id}: already there, left as it is`); continue; }
  const [{ next }] = await sql`select coalesce(max(sort), 0) + 10 as next from menu_items where cat = ${cat}`;
  console.log(`${id}: added to ${cat}${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`insert into menu_items (id, cat, sort, hidden, data) values (${id}, ${cat}, ${next}, false, ${sql.json({ ...data, media: MEDIA[id] })})`;
}
// Cuba Libre: its own clip and the owner's description; the price and strength stay as they are
const CUBA_D = {"en": "Refreshing and sweetish, with a citrus tang. 45 ml Ron especial, Coca-Cola on top, lime.", "es": "Refrescante y dulzón, con un toque cítrico. 45 ml de Ron especial, Coca-Cola, lima.", "ru": "Освежающий, сладковатый, с цитрусовой кислинкой. 45 мл Ron especial, Coca-Cola, лайм.", "zh": "清爽微甜，带柑橘酸香。45 毫升 Ron especial、Coca-Cola、青柠。", "hi": "ताज़ा, हल्का मीठा, खट्टे स्वाद के साथ। 45 ml स्पेशल रम, Coca-Cola, नींबू।", "ar": "منعش وحلو قليلًا مع حموضة حمضيات. 45 مل Ron especial، Coca-Cola، ليمون أخضر.", "fr": "Rafraîchissant et légèrement sucré, avec une pointe d’agrumes. 45 ml de Ron especial, Coca-Cola, citron vert.", "pt": "Refrescante e levemente doce, com um toque cítrico. 45 ml de Ron especial, Coca-Cola, limão.", "de": "Erfrischend, leicht süß, mit Zitrusnote. 45 ml Ron especial, Coca-Cola, Limette.", "ja": "爽やかでほんのり甘く、柑橘の酸味。Ron especial 45ml、Coca-Cola、ライム。"};
const [cuba] = await sql`select data from menu_items where id = 'cl11'`;
if (!cuba || (cuba.data.media === MEDIA.cl11 && cuba.data.d?.ru === CUBA_D.ru)) console.log('cl11: left as it is');
else {
  console.log(`cl11: clip and description${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`update menu_items set data = (data - 'img') || ${sql.json({ media: MEDIA.cl11, d: CUBA_D })}, updated_at = now() where id = 'cl11'`;
}
await sql.end();
