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
// Cuba Libre, Cosmoflower and Negroni: their own clips and the owner's descriptions; prices and the rest stay as they are
const CUBA_D = {"en": "Refreshing and sweetish, with a citrus tang. 45 ml Ron especial, Coca-Cola on top, lime.", "es": "Refrescante y dulzón, con un toque cítrico. 45 ml de Ron especial, Coca-Cola, lima.", "ru": "Освежающий, сладковатый, с цитрусовой кислинкой. 45 мл Ron especial, Coca-Cola, лайм.", "zh": "清爽微甜，带柑橘酸香。45 毫升 Ron especial、Coca-Cola、青柠。", "hi": "ताज़ा, हल्का मीठा, खट्टे स्वाद के साथ। 45 ml स्पेशल रम, Coca-Cola, नींबू।", "ar": "منعش وحلو قليلًا مع حموضة حمضيات. 45 مل Ron especial، Coca-Cola، ليمون أخضر.", "fr": "Rafraîchissant et légèrement sucré, avec une pointe d’agrumes. 45 ml de Ron especial, Coca-Cola, citron vert.", "pt": "Refrescante e levemente doce, com um toque cítrico. 45 ml de Ron especial, Coca-Cola, limão.", "de": "Erfrischend, leicht süß, mit Zitrusnote. 45 ml Ron especial, Coca-Cola, Limette.", "ja": "爽やかでほんのり甘く、柑橘の酸味。Ron especial 45ml、Coca-Cola、ライム。"};
const COSMO_D = {"en": "Berry-forward, lightly bitter, with a refreshing finish. 30 ml vodka, 30 ml Aperol, 30 ml blackberry liqueur.", "es": "Frutos rojos, ligeramente amargo, con un final refrescante. 30 ml de vodka, 30 ml de Aperol, 30 ml de licor de mora.", "ru": "Ягодный, слегка горьковатый, с освежающим послевкусием. 30 мл водки, 30 мл Aperol, 30 мл ежевичного ликёра.", "zh": "莓果风味，微苦，余味清爽。30 毫升伏特加、30 毫升 Aperol、30 毫升黑莓利口酒。", "hi": "बेरी जैसा, हल्का कड़वा, ताज़गी भरे स्वाद के साथ। 30 ml वोदका, 30 ml Aperol, 30 ml ब्लैकबेरी लिकर।", "ar": "بنكهة التوت، مر قليلًا، مع نهاية منعشة. 30 مل فودكا، 30 مل Aperol، 30 مل ليكيور العليق.", "fr": "Fruité, légèrement amer, avec une finale rafraîchissante. 30 ml de vodka, 30 ml d’Aperol, 30 ml de liqueur de mûre.", "pt": "Frutado, levemente amargo, com final refrescante. 30 ml de vodka, 30 ml de Aperol, 30 ml de licor de amora.", "de": "Beerig, leicht bitter, mit erfrischendem Abgang. 30 ml Wodka, 30 ml Aperol, 30 ml Brombeerlikör.", "ja": "ベリーの風味にほのかな苦み、爽やかな後味。ウォッカ 30ml、Aperol 30ml、ブラックベリーリキュール 30ml。"};
const NEGRONI_D = {"en": "Bitter, astringent, refreshing. 30 ml gin, 30 ml vermouth, 30 ml Campari.", "es": "Amargo, astringente, refrescante. 30 ml de gin, 30 ml de vermut, 30 ml de Campari.", "ru": "Горьковатый, терпкий, освежающий. 30 мл джина, 30 мл вермута, 30 мл Campari.", "zh": "微苦、涩口、清爽。30 毫升金酒、30 毫升味美思、30 毫升 Campari。", "hi": "हल्का कड़वा, तीखा, ताज़गी भरा। 30 ml जिन, 30 ml वर्माउथ, 30 ml Campari।", "ar": "مر قليلًا، قابض، منعش. 30 مل جن، 30 مل فيرموث، 30 مل Campari.", "fr": "Amer, astringent, rafraîchissant. 30 ml de gin, 30 ml de vermouth, 30 ml de Campari.", "pt": "Amargo, adstringente, refrescante. 30 ml de gin, 30 ml de vermute, 30 ml de Campari.", "de": "Bitter, herb, erfrischend. 30 ml Gin, 30 ml Wermut, 30 ml Campari.", "ja": "ほろ苦く、渋みがあり、爽やか。ジン 30ml、ベルモット 30ml、Campari 30ml。"};
for (const [id, text] of [['cl11', CUBA_D], ['sg3', COSMO_D], ['cl0', NEGRONI_D]]) {
  const [it] = await sql`select data from menu_items where id = ${id}`;
  if (!it || (it.data.media === MEDIA[id] && it.data.d?.ru === text.ru)) { console.log(`${id}: left as it is`); continue; }
  console.log(`${id}: clip and description${DRY ? ' (dry run)' : ''}`);
  if (!DRY) await sql`update menu_items set data = (data - 'img') || ${sql.json({ media: MEDIA[id], d: text })}, updated_at = now() where id = ${id}`;
}
await sql.end();
