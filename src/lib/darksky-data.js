// DARKSKY Hookah Lounge — menu data (from HOOKAH / COMIDA / BEBIDAS / PROMOCIONES / REGLAS PDFs)
import { I18N } from './darksky-i18n.mjs';

const L = (en, es, ru, zh, hi, ar, fr, pt, de, ja) => ({ en, es, ru, zh, hi, ar, fr, pt, de, ja });
const T3 = (es, en, ru) => ({ es, en, ru });

export const LANGS = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' }, { code: 'hi', name: 'हिन्दी' }, { code: 'ar', name: 'العربية', rtl: true },
  { code: 'fr', name: 'Français' }, { code: 'pt', name: 'Português' }, { code: 'de', name: 'Deutsch' }, { code: 'ja', name: '日本語' },
];

const K = ['chooseLang','enter','age','searchPh','add','added','order','send','table','tablePh','pairs','taste','strength','subtotal','discount','total','cash','empty','sent','sentSub','newOrder','hit','new','onRequest','noResults','choose','lasts','businessSub','now','language','viewOrder','suggest','items','prep'];
const RAW = {
  en: ['Choose your language','Enter the lounge','18+ only','Search the menu','Add','Added','Your order','Send to waiter','Table','No.','Pairs well with','Taste','Strength','Subtotal','Discount','Total','Cash or crypto (USDT) · −15%','Your order is empty','Order sent','Your waiter is on the way','New order','Hit','New','Ask staff','Nothing found','Choose','One hookah lasts 1:30','20% off any hookah · 14:00–17:00','Now','Language','View order','Add to your order','items','Preparation 10–15 min'],
  es: ['Elegí tu idioma','Entrar al lounge','Solo +18','Buscar en el menú','Agregar','Agregado','Tu pedido','Enviar al mozo','Mesa','N.º','Combina con','Sabor','Intensidad','Subtotal','Descuento','Total','Efectivo o cripto (USDT) · −15%','Tu pedido está vacío','Pedido enviado','Tu mozo está en camino','Nuevo pedido','Hit','Nuevo','Consultar','Sin resultados','Elegí','Una hookah dura 1:30','20% OFF en cualquier hookah · 14:00–17:00','Ahora','Idioma','Ver pedido','Sumá a tu pedido','ítems','Preparación 10–15 min'],
  ru: ['Выберите язык','Войти в лаунж','Только 18+','Поиск по меню','Добавить','Добавлено','Ваш заказ','Отправить официанту','Стол','№','С этим берут','Вкус','Крепость','Сумма','Скидка','Итого','Наличные или крипто (USDT) · −15%','Заказ пока пуст','Заказ отправлен','Официант уже идёт','Новый заказ','Хит','Новинка','Уточните','Ничего не найдено','Выберите','Кальян курится 1:30','−20% на любой кальян · 14:00–17:00','Сейчас','Язык','Смотреть заказ','Добавьте к заказу','поз.','Приготовление 10–15 мин'],
  zh: ['选择语言','进入酒廊','仅限18岁以上','搜索菜单','添加','已添加','我的订单','发送给服务员','桌号','号','推荐搭配','口味','浓度','小计','折扣','合计','现金或加密货币 (USDT) · −15%','订单为空','订单已发送','服务员马上就到','新订单','热门','新品','请咨询','未找到','请选择','一支水烟约1:30','任意水烟8折 · 14:00–17:00','进行中','语言','查看订单','加入订单','项','准备时间 10–15 分钟'],
  hi: ['भाषा चुनें','लाउंज में प्रवेश','केवल 18+','मेनू खोजें','जोड़ें','जोड़ा गया','आपका ऑर्डर','वेटर को भेजें','टेबल','नं.','इसके साथ अच्छा','स्वाद','तीव्रता','उप-योग','छूट','कुल','नकद या क्रिप्टो (USDT) · −15%','ऑर्डर खाली है','ऑर्डर भेजा गया','वेटर आ रहे हैं','नया ऑर्डर','हिट','नया','स्टाफ से पूछें','कुछ नहीं मिला','चुनें','एक हुक्का 1:30 चलता है','किसी भी हुक्के पर 20% छूट · 14:00–17:00','अभी','भाषा','ऑर्डर देखें','ऑर्डर में जोड़ें','आइटम','तैयारी 10–15 मिनट'],
  ar: ['اختر لغتك','ادخل الصالة','للبالغين +18 فقط','ابحث في القائمة','أضف','تمت الإضافة','طلبك','أرسل إلى النادل','الطاولة','رقم','يناسبه','النكهة','القوة','المجموع الفرعي','الخصم','الإجمالي','نقدًا أو بالعملات المشفرة (USDT) · ‎−15%','طلبك فارغ','تم إرسال الطلب','النادل في الطريق','طلب جديد','الأكثر طلبًا','جديد','اسأل الطاقم','لا توجد نتائج','اختر','تدوم الشيشة 1:30','خصم 20% على أي شيشة · 14:00–17:00','الآن','اللغة','عرض الطلب','أضف إلى طلبك','عناصر','التحضير 10–15 دقيقة'],
  fr: ['Choisissez votre langue','Entrer dans le lounge','Réservé aux 18+','Rechercher dans le menu','Ajouter','Ajouté','Votre commande','Envoyer au serveur','Table','N°','Se marie avec','Goût','Intensité','Sous-total','Remise','Total','Espèces ou crypto (USDT) · −15%','Votre commande est vide','Commande envoyée','Votre serveur arrive','Nouvelle commande','Best-seller','Nouveau','Demandez au staff','Aucun résultat','Choisir','Une chicha dure 1:30','−20% sur toute chicha · 14:00–17:00','En cours','Langue','Voir la commande','Ajoutez à votre commande','articles','Préparation 10–15 min'],
  pt: ['Escolha seu idioma','Entrar no lounge','Somente +18','Buscar no menu','Adicionar','Adicionado','Seu pedido','Enviar ao garçom','Mesa','Nº','Combina com','Sabor','Intensidade','Subtotal','Desconto','Total','Dinheiro ou cripto (USDT) · −15%','Seu pedido está vazio','Pedido enviado','Seu garçom está a caminho','Novo pedido','Hit','Novo','Consulte','Nada encontrado','Escolha','Um narguilé dura 1:30','20% OFF em qualquer narguilé · 14:00–17:00','Agora','Idioma','Ver pedido','Adicione ao pedido','itens','Preparo 10–15 min'],
  de: ['Sprache wählen','Lounge betreten','Nur ab 18','Menü durchsuchen','Hinzufügen','Hinzugefügt','Deine Bestellung','An Kellner senden','Tisch','Nr.','Passt dazu','Geschmack','Stärke','Zwischensumme','Rabatt','Gesamt','Bar oder Krypto (USDT) · −15%','Deine Bestellung ist leer','Bestellung gesendet','Dein Kellner ist unterwegs','Neue Bestellung','Hit','Neu','Bitte erfragen','Nichts gefunden','Wählen','Eine Shisha hält 1:30','20% auf jede Shisha · 14:00–17:00','Jetzt','Sprache','Bestellung ansehen','Zur Bestellung hinzufügen','Artikel','Zubereitung 10–15 Min'],
  ja: ['言語を選択','ラウンジへ','18歳以上限定','メニューを検索','追加','追加しました','ご注文','スタッフに送信','テーブル','番号','おすすめの組み合わせ','味わい','強さ','小計','割引','合計','現金または暗号資産 (USDT) · −15%','ご注文はまだありません','注文を送信しました','スタッフがお伺いします','新しい注文','人気','新作','スタッフにお尋ねください','見つかりません','選択','シーシャ1台 約1:30','全シーシャ20%OFF · 14:00–17:00','実施中','言語','注文を見る','ご一緒にいかが','点','準備 10–15分'],
};
export const UI = Object.fromEntries(Object.entries(RAW).map(([l, a]) => [l, Object.fromEntries(K.map((k, i) => [k, a[i]]))]));

export const CATS = [
  { id: 'hookah', kind: 'hookah', n: L('Hookah','Hookah','Кальяны','水烟','हुक्का','الشيشة','Chicha','Narguilé','Shisha','シーシャ') },
  { id: 'promos', kind: 'promos', n: L('Promotions','Promociones','Акции','优惠','ऑफ़र','العروض','Promotions','Promoções','Angebote','プロモーション') },
  { id: 'starters', n: L('Starters','Entradas','Закуски','前菜','स्टार्टर','المقبلات','Entrées','Entradas','Vorspeisen','前菜') },
  { id: 'rolls', n: L('Rolls','Rolls','Роллы','寿司卷','रोल्स','رولز','Rolls','Rolls','Rolls','ロール') },
  { id: 'hotrolls', n: L('Hot rolls','Hot rolls','Горячие роллы','炸卷','हॉट रोल्स','رولز مقلية','Rolls chauds','Hot rolls','Hot Rolls','ホットロール') },
  { id: 'wok', n: L('Wok & Noodles','Wok & Noodles','Вок и лапша','炒饭与面','वोक और नूडल्स','ووك ونودلز','Wok & nouilles','Wok & macarrão','Wok & Nudeln','炒め物・麺') },
  { id: 'salads', n: L('Salads','Ensaladas','Салаты','沙拉','सलाद','السلطات','Salades','Saladas','Salate','サラダ') },
  { id: 'desserts', n: L('Desserts','Postres','Десерты','甜点','मिठाइयाँ','الحلويات','Desserts','Sobremesas','Desserts','デザート') },
  { id: 'soft', n: L('Soft drinks','Sin alcohol','Безалкогольные','软饮','सॉफ्ट ड्रिंक्स','بدون كحول','Sans alcool','Sem álcool','Alkoholfrei','ソフトドリンク') },
  { id: 'tea', n: L('Tea · 800 ml','Té · 800 ml','Чай · 800 мл','茶 · 800毫升','चाय · 800 ml','الشاي · 800 مل','Thé · 800 ml','Chá · 800 ml','Tee · 800 ml','お茶 · 800ml') },
  { id: 'authortea', n: L('Signature tea','Té de autor','Авторский чай','特调茶','सिग्नेचर चाय','شاي مميز','Thés signature','Chá autoral','Signature-Tee','オリジナルティー') },
  { id: 'classics', n: L('Classic cocktails','Tragos clásicos','Классика','经典鸡尾酒','क्लासिक कॉकटेल','كوكتيلات كلاسيكية','Cocktails classiques','Drinks clássicos','Klassiker','クラシックカクテル') },
  { id: 'signature', n: L('Signature cocktails','Tragos de autor','Авторские коктейли','特调鸡尾酒','सिग्नेचर कॉकटेल','كوكتيلات مميزة','Cocktails signature','Drinks autorais','Signature-Cocktails','オリジナルカクテル') },
  { id: 'wine', n: L('Wine','Vinos','Вино','葡萄酒','वाइन','النبيذ','Vins','Vinhos','Wein','ワイン') },
  { id: 'sparkling', n: L('Sparkling','Espumantes','Игристое','起泡酒','स्पार्कलिंग','نبيذ فوار','Effervescents','Espumantes','Schaumwein','スパークリング') },
  { id: 'shots', n: L('Spirits · 50 ml','Shots · 50 ml','Крепкое · 50 мл','烈酒 · 50毫升','स्पिरिट्स · 50 ml','مشروبات روحية · 50 مل','Spiritueux · 50 ml','Destilados · 50 ml','Spirituosen · 50 ml','スピリッツ · 50ml') },
  { id: 'beer', n: L('Beer','Cervezas','Пиво','啤酒','बीयर','البيرة','Bières','Cervejas','Bier','ビール') },
  { id: 'rules', kind: 'rules', n: L('Visit rules','Reglas de visita','Правила','到店须知','नियम','قواعد الزيارة','Règles','Regras','Hausregeln','ご利用ルール') },
];

const CN = id => CATS.find(c => c.id === id).n;
// clip: keyed product clip for the section's tile on the home screen and its banner (instead of the 3D scene)
export const SECTIONS = [
  { id: 'hookah', clip: '/media/hookah.webm#t=0.04', kind: 'hookah', cats: ['hookah'], n: CN('hookah'), tag: T3('Tres líneas, de suave a cigar.', 'Three lines, from soft to cigar.', 'Три линейки — от мягкой до сигарной.') },
  { id: 'kitchen', clip: '/media/roll-phila.webm#t=1.08', cats: ['starters', 'rolls', 'hotrolls', 'wok', 'salads', 'desserts'], n: L('Kitchen','Cocina','Кухня','厨房','किचन','المطبخ','Cuisine','Cozinha','Küche','キッチン'), tag: T3('Rolls, wok, entradas y postres.', 'Rolls, wok, starters & desserts.', 'Роллы, вок, закуски и десерты.') },
  { id: 'cocktails', clip: '/media/cocktail-amber.webm#t=5.92', cats: ['classics', 'signature'], n: L('Cocktails','Tragos','Коктейли','鸡尾酒','कॉकटेल','الكوكتيلات','Cocktails','Drinks','Cocktails','カクテル'), tag: T3('Clásicos y de autor.', 'Classics & signature.', 'Классика и авторские.') },
  { id: 'tea', clip: '/media/tea-tropic.webm#t=1.54', cats: ['tea', 'authortea'], n: L('Tea','Té','Чай','茶','चाय','الشاي','Thé','Chá','Tee','お茶'), tag: T3('De hoja y de autor · 800 ml.', 'Loose-leaf & signature · 800 ml.', 'Листовой и авторский · 800 мл.') },
  { id: 'bar', clip: '/media/whiskey.webm#t=3.50', cats: ['wine', 'sparkling', 'shots', 'beer'], n: L('Bar','Bar','Бар','酒吧','बार','البار','Bar','Bar','Bar','バー'), tag: T3('Vino, whisky, cerveza.', 'Wine, whisky, beer.', 'Вино, виски, пиво.') },
  { id: 'soft', clip: '/media/passion-lemonade.webm#t=0.83', cats: ['soft'], n: L('Soft drinks','Sin alcohol','Без алкоголя','无酒精','सॉफ्ट ड्रिंक्स','بدون كحول','Sans alcool','Sem álcool','Alkoholfrei','ノンアル'), tag: T3('Limonadas y jugos.', 'Lemonades & juices.', 'Лимонады и соки.') },
  { id: 'promos', clip: '/media/cash.webm#t=4.79', kind: 'promos', cats: [], n: CN('promos'), tag: T3('Hasta 20% OFF · acumulables con efectivo o cripto.', 'Up to 20% off · stacks with cash or crypto.', 'До −20% · суммируются со скидкой за наличные.') },
  { id: 'rules', kind: 'rules', cats: [], n: CN('rules'), tag: T3('Antes de tu visita.', 'Before your visit.', 'Перед визитом.') },
];

export const UI_X = {
  en: { from: 'from {p}', hits: 'House favourites', back: 'Menu' },
  es: { from: 'desde {p}', hits: 'Los favoritos de la casa', back: 'Menú' },
  ru: { from: 'от {p}', hits: 'Хиты заведения', back: 'Меню' },
  zh: { from: '{p} 起', hits: '人气推荐', back: '菜单' },
  hi: { from: '{p} से', hits: 'लोकप्रिय पसंद', back: 'मेनू' },
  ar: { from: 'من {p}', hits: 'المفضلة لدينا', back: 'القائمة' },
  fr: { from: 'dès {p}', hits: 'Les incontournables', back: 'Menu' },
  pt: { from: 'a partir de {p}', hits: 'Os favoritos da casa', back: 'Menu' },
  de: { from: 'ab {p}', hits: 'Hausfavoriten', back: 'Menü' },
  ja: { from: '{p}〜', hits: '人気メニュー', back: 'メニュー' },
};

export const TASTE = {
  sweet: L('Sweet','Dulce','Сладкий','甜','मीठा','حلو','Doux','Doce','Süß','甘い'),
  citrus: L('Citrus','Cítrico','Цитрус','柑橘','सिट्रस','حمضي','Agrumes','Cítrico','Zitrus','柑橘'),
  fresh: L('Fresh','Fresco','Свежий','清爽','ताज़ा','منعش','Frais','Fresco','Frisch','爽やか'),
  bitter: L('Bitter','Amargo','Горчинка','苦','कड़वा','مر','Amer','Amargo','Bitter','ビター'),
  strong: L('Strong','Intenso','Крепкий','浓烈','तेज़','قوي','Corsé','Forte','Kräftig','強め'),
  spicy: L('Spiced','Especiado','Пряный','辛香','मसालेदार','متبل','Épicé','Especiado','Würzig','スパイシー'),
  creamy: L('Creamy','Cremoso','Сливочный','奶香','क्रीमी','كريمي','Crémeux','Cremoso','Cremig','クリーミー'),
  fruity: L('Fruity','Frutal','Фруктовый','果香','फ्रूटी','فاكهي','Fruité','Frutado','Fruchtig','フルーティー'),
  herbal: L('Herbal','Herbal','Травяной','草本','हर्बल','عشبي','Herbacé','Herbal','Kräuter','ハーブ'),
  floral: L('Floral','Floral','Цветочный','花香','फूलों जैसा','زهري','Floral','Floral','Blumig','フローラル'),
  smoky: L('Smoky','Ahumado','Дымный','烟熏','धुएँदार','مدخن','Fumé','Defumado','Rauchig','スモーキー'),
  savory: L('Savory','Salado','Пикантный','咸鲜','नमकीन','مالح','Salé','Salgado','Herzhaft','旨味'),
  soft: L('Soft','Suave','Мягкий','柔和','हल्का','خفيف','Léger','Suave','Mild','マイルド'),
};

const V = (es, en, ru, p) => ({ n: T3(es, en, ru), p });
const PROT = {
  pollo: ['Pollo', 'Chicken', 'Курица'], salmon: ['Salmón', 'Salmon', 'Лосось'], lang: ['Langostinos', 'Prawns', 'Креветки'],
  cang: ['Cangrejo', 'Crab', 'Краб'], ang: ['Anguila', 'Eel', 'Угорь'], atun: ['Atún', 'Tuna', 'Тунец'], veg: ['Veggie', 'Veggie', 'Овощной'],
  pepino: ['Pepino', 'Cucumber', 'Огурец'], palta: ['Palta', 'Avocado', 'Авокадо'], teri: ['Pollo teriyaki', 'Teriyaki chicken', 'Курица терияки'],
};
const P = (k, p) => V(...PROT[k], p);

// Desserts: one free topping, or none (opt: a free choice next to the variants; staff see it with the variant)
const TOPPING = {
  n: L('Topping', 'Topping', 'Топпинг', '淋酱', 'टॉपिंग', 'الصلصة', 'Nappage', 'Cobertura', 'Topping', 'トッピング'),
  none: L('No topping', 'Sin topping', 'Без топпинга', '不加淋酱', 'बिना टॉपिंग', 'بدون صلصة', 'Sans nappage', 'Sem cobertura', 'Ohne Topping', 'なし'),
  o: [
    L('Chocolate', 'Chocolate', 'Шоколадный', '巧克力', 'चॉकलेट', 'شوكولاتة', 'Chocolat', 'Chocolate', 'Schokolade', 'チョコレート'),
    L('Dulce de leche', 'Dulce de leche', 'Дульсе де лече', '牛奶焦糖酱', 'दुल्से दे लेचे', 'دولسي دي ليتشي', 'Dulce de leche', 'Doce de leite', 'Dulce de leche', 'ドゥルセ・デ・レチェ'),
    L('Strawberry', 'Frutilla', 'Клубничный', '草莓', 'स्ट्रॉबेरी', 'فراولة', 'Fraise', 'Morango', 'Erdbeere', 'いちご'),
  ],
};

export const ITEMS = [
  // HOOKAH
  { id: 'h-classic', cat: 'hookah', name: 'Classic', d: T3('Mezcla suave para una sesión relajada.', 'A soft blend for an easy, mellow session.', 'Мягкий микс для спокойной долгой сессии.'), str: [1, 3], p: 34812, t: ['soft', 'fruity'] },
  { id: 'h-premium', cat: 'hookah', name: 'Premium', d: T3('De media a fuerte — tabaco premium, humo denso.', 'Medium to strong — premium tobacco, dense smoke.', 'От средней до высокой крепости — премиальный табак, плотный дым.'), str: [1, 7], p: 48787, t: ['strong', 'fruity'], hit: true },
  { id: 'h-cigar', cat: 'hookah', name: 'Cigar Line', d: T3('Línea con carácter de cigarro.', 'A cigar-character line for connoisseurs.', 'Линейка с характером сигары — для ценителей.'), p: 58951, t: ['strong', 'smoky'], str: [1, 10] },
  // STARTERS
  { id: 'jerky', cat: 'starters', name: 'Jerky artesanal', m: '150 g', p: 22857, d: T3('Carne curada artesanal.', 'House-made cured jerky.', 'Вяленое мясо собственного приготовления.'), t: ['savory', 'smoky'], v: [V('Cerdo', 'Pork', 'Свинина', 22857), V('Pollo', 'Chicken', 'Курица', 22857), V('Carne', 'Beef', 'Говядина', 22857), V('Pescado', 'Fish', 'Рыба', 22857)], hit: true },
  { id: 'falafel', cat: 'starters', name: 'Falafel', m: '300 g', p: 16262, d: T3('Falafel (garbanzo, especias), pan árabe, pepinillos, pepino, tomate cherry, salsa cremosa de ajo.', 'Falafel (chickpeas, spices), pita, pickles, cucumber, cherry tomato, creamy garlic sauce.', 'Фалафель (нут, специи), арабский хлеб, корнишоны, огурец, черри, сливочный чесночный соус.'), t: ['spicy', 'creamy'] },
  { id: 'langostinos', cat: 'starters', name: 'Langostinos apanados', m: L('9 pcs', '9 u.', '9 шт.', '9只', '9 पीस', '9 قطع', '9 pièces', '9 un.', '9 Stück', '9尾'), p: 25941, d: T3('9 langostinos apanados con mayo Sweet Chili.', '9 breaded prawns with sweet chili mayo.', '9 креветок в панировке с майонезом sweet chili.'), t: ['savory', 'sweet'] },
  { id: 'panqueques', cat: 'starters', name: 'Crepes caseros (blinis)', m: T3('2 u.', '2 pcs.', '2 шт.'), p: 15540, d: T3('Panqueques finos y tiernos con un relleno abundante a elección. Se sirven con crema agria.', 'Thin, tender crepes with a generous filling of your choice. Served with sour cream.', 'Нежные тонкие блинчики с сытной начинкой на выбор. Подаются со сметаной.'), t: ['creamy', 'savory'], v: [V('Carne picada de vaca', 'Ground beef', 'Говяжий фарш', 15540), V('Julienne', 'Julienne', 'Жульен', 15540), V('Ricota', 'Ricotta', 'Творог', 15540)] },
  // ROLLS
  { id: 'phila-ebi', cat: 'rolls', name: 'Philadelphia Ebi Ponzu', m: '310 g', p: 27180, d: T3('Salmón, arroz, nori, queso crema, langostinos fritos, salsa ponzu (soja y cítricos), salsa spicy tuna.', 'Salmon, rice, nori, cream cheese, fried prawns, ponzu (citrus soy sauce), spicy tuna sauce.', 'Лосось, рис, нори, сливочный сыр, жареные креветки, соус понзу (соевый с цитрусовыми), спайси-тунец.'), t: ['savory', 'citrus'], hit: true },
  { id: 'phila', cat: 'rolls', name: 'Philadelphia', m: '300–320 g', p: 24320, d: T3('Arroz, nori, salmón, queso crema.', 'Rice, nori, salmon, cream cheese.', 'Рис, нори, лосось, сливочный сыр.'), t: ['creamy'], v: [V('Clásico', 'Classic', 'Классический', 24320), P('atun', 29090), P('lang', 27810), P('palta', 25710), P('pepino', 25020)] },
  { id: 'newyork', cat: 'rolls', name: 'New York', m: '260 g', p: 22740, d: T3('Salmón, palta, queso crema, nori, sésamo.', 'Salmon, avocado, cream cheese, nori, sesame.', 'Лосось, авокадо, сливочный сыр, нори, кунжут.'), t: ['creamy'] },
  { id: 'maki', cat: 'rolls', name: 'Maki roll', m: '240 g', p: 16389, d: T3('Roll japonés clásico: arroz y alga nori, relleno a elección.', 'Classic Japanese roll: rice and nori, filling of your choice.', 'Классический японский ролл: рис и нори, начинка на выбор.'), t: ['soft'], v: [P('pepino', 16389), P('palta', 17660), P('lang', 18295), P('salmon', 18930), P('atun', 21356)] },
  { id: 'aburi', cat: 'rolls', name: 'Atún Aburi', m: '330 g', p: 28760, d: T3('Roll de autor con atún, nori, queso crema, palta, salsa especial, ciboulette y atún flameado por encima.', 'Signature roll: tuna, nori, cream cheese, avocado, special sauce, chives, flame-seared tuna on top.', 'Авторский ролл: тунец, нори, сливочный сыр, авокадо, фирменный соус, шнитт-лук, тунец, обожжённый сверху.'), t: ['smoky', 'savory'], hit: true },
  { id: 'kanikama', cat: 'rolls', name: 'Kanikama', m: '250 g', p: 17660, d: T3('Cangrejo, arroz, nori, pepino, queso crema.', 'Crab, rice, nori, cucumber, cream cheese.', 'Краб, рис, нори, огурец, сливочный сыр.'), t: ['soft', 'creamy'] },
  { id: 'unagi', cat: 'rolls', name: 'Unagi roll', m: '260 g', p: 29094, d: T3('Arroz, nori, queso crema, pepino, anguila, salsa unagi, sésamo.', 'Rice, nori, cream cheese, cucumber, eel, unagi sauce, sesame.', 'Рис, нори, сливочный сыр, огурец, угорь, соус унаги, кунжут.'), t: ['sweet', 'smoky'] },
  // HOT ROLLS
  { id: 'tempura', cat: 'hotrolls', name: 'Tempura roll', m: '320 g', p: 24012, d: T3('Frito en tempura y panko. Arroz, nori, queso crema, pepino.', 'Fried in tempura & panko. Rice, nori, cream cheese, cucumber.', 'Обжарен в темпуре и панко. Рис, нори, сливочный сыр, огурец.'), t: ['creamy', 'savory'], v: [P('salmon', 24012), P('lang', 24012), P('cang', 21471), P('atun', 27477)] },
  { id: 'tempura-teri', cat: 'hotrolls', name: 'Tempura teriyaki roll', m: '320 g', p: 25179, d: T3('Frito en tempura y panko con teriyaki. Arroz, nori, queso crema, pepino.', 'Tempura & panko with teriyaki. Rice, nori, cream cheese, cucumber.', 'Темпура и панко с терияки. Рис, нори, сливочный сыр, огурец.'), t: ['sweet', 'savory'], v: [P('pollo', 25179), P('salmon', 26438), P('lang', 26438), P('ang', 33137)] },
  { id: 'horno', cat: 'hotrolls', name: 'Roll al horno', p: 22742, d: T3('Roll de arroz y nori horneado con tapa picante.', 'Rice and nori roll, baked with a spicy topping.', 'Запечённый ролл из риса и нори с острой шапочкой.'), t: ['spicy', 'creamy'], v: [P('teri', 22742), P('salmon', 24012), P('lang', 24012), P('cang', 21471), P('ang', 32910), P('atun', 26322)] },
  // WOK
  { id: 'wok-rice', cat: 'wok', name: 'Wok de arroz', p: 16389, d: T3('Arroz salteado al wok con mix de verduras: zanahoria, apio y morrón.', 'Wok-fried rice with a vegetable mix: carrot, celery and bell pepper.', 'Рис, обжаренный в воке, с овощным миксом: морковь, сельдерей, болгарский перец.'), t: ['savory'], v: [P('veg', 16389), P('pollo', 19566), P('lang', 22742), P('salmon', 24012)] },
  { id: 'udon', cat: 'wok', name: 'Udon de fideos', p: 15754, d: T3('Fideos udon salteados.', 'Stir-fried udon noodles.', 'Лапша удон из вока.'), t: ['savory'], v: [P('veg', 15754), P('pollo', 20201), P('lang', 22742), P('salmon', 24012)] },
  // SALADS
  { id: 'cesar', cat: 'salads', name: 'Ensalada César', m: '340 g', p: 21471, d: T3('Clásica César a elección.', 'Classic Caesar, your choice of protein.', 'Классический «Цезарь» на выбор.'), t: ['creamy', 'savory'], v: [P('pollo', 21471), P('salmon', 23380), P('lang', 22740)] },
  { id: 'griega', cat: 'salads', name: 'Ensalada griega', m: '340 g', p: 22615, d: T3('Queso feta, tomate cherry, pepino, morrón, cebolla morada, aceitunas. Aliño: aceite de oliva.', 'Feta, cherry tomato, cucumber, bell pepper, red onion, olives. Dressing: olive oil.', 'Фета, черри, огурец, перец, красный лук, оливки. Заправка — оливковое масло.'), t: ['fresh'] },
  // DESSERTS
  { id: 'trufa', cat: 'desserts', opt: TOPPING, name: 'Trufa Deluxe', p: 11040, d: T3('Chocolate belga 54,5%.', 'Belgian chocolate 54.5%.', 'Бельгийский шоколад 54,5%.'), t: ['sweet', 'bitter'] },
  { id: 'brownie', cat: 'desserts', opt: TOPPING, name: 'Brownie', p: 16010, d: T3('Bizcocho de chocolate.', 'Chocolate sponge.', 'Шоколадный бисквит.'), t: ['sweet'] },
  { id: 'noche', cat: 'desserts', opt: TOPPING, name: 'Noche Blanca Pistacho', p: 13560, d: T3('Mousse de leche, pistachos, pasta de pistacho.', 'Milk mousse, pistachios, pistachio paste.', 'Молочный мусс, фисташки, фисташковая паста.'), t: ['creamy', 'sweet'] },
  { id: 'cinnabon', cat: 'desserts', opt: TOPPING, name: 'Cinnabon roll', p: 11260, d: T3('Rol de canela a elección.', 'Cinnamon roll, your choice.', 'Синнабон на выбор.'), t: ['sweet', 'spicy'], new: true, v: [V('Pistacho', 'Pistachio', 'Фисташка', 11260), V('Nutella', 'Nutella', 'Нутелла', 11260), V('Doble chocolate', 'Double chocolate', 'Двойной шоколад', 11260)] },
  // SOFT
  { id: 'agua', cat: 'soft', name: 'Agua c/s gas', m: 'Smartwater · 591 ml', p: 5460, d: T3('Con o sin gas.', 'Still or sparkling.', 'С газом или без.'), t: ['fresh'], v: [V('Sin gas', 'Still', 'Без газа', 5460), V('Con gas', 'Sparkling', 'С газом', 5460)] },
  { id: 'limonada', cat: 'soft', name: 'Limonada · Pomelada', m: '800 ml', p: 10400, d: T3('Menta, exprimido de limón o pomelo.', 'Mint, fresh-squeezed lemon or grapefruit.', 'Мята, свежевыжатый лимон или грейпфрут.'), t: ['citrus', 'fresh'], v: [V('Limonada', 'Lemonade', 'Лимонад', 10400), V('Pomelada', 'Grapefruit', 'Грейпфрут', 10400)], hit: true },
  { id: 'passion', cat: 'soft', name: 'Passion lemonade', m: '800 ml', p: 11660, d: T3('Menta, maracuyá, semillas.', 'Mint, passion fruit, seeds.', 'Мята, маракуйя, семена.'), t: ['fruity', 'fresh'] },
  { id: 'citric', cat: 'soft', name: 'Orange · Peach orange', m: 'Citric · 330 ml', p: 6620, d: T3('Jugo Citric.', 'Citric juice.', 'Сок Citric.'), t: ['fruity'], v: [V('Orange', 'Orange', 'Апельсин', 6620), V('Peach orange', 'Peach orange', 'Персик-апельсин', 6620)] },
  { id: 'gaseosa', cat: 'soft', name: 'Coca-Cola · Sprite · Fanta', m: '350 ml', p: 6720, d: T3('Gaseosa a elección.', 'Soda of your choice.', 'Газировка на выбор.'), t: ['sweet'], v: [V('Coca-Cola', 'Coca-Cola', 'Coca-Cola', 6720), V('Coca-Cola Zero', 'Coca-Cola Zero', 'Coca-Cola Zero', 6720), V('Sprite', 'Sprite', 'Sprite', 6720), V('Fanta', 'Fanta', 'Fanta', 6720)] },
  { id: 'tonica', cat: 'soft', name: 'Tónica', m: 'Schweppes · 350 ml', p: 6620, d: T3('Agua tónica.', 'Tonic water.', 'Тоник.'), t: ['bitter'] },
  { id: 'redbull', cat: 'soft', name: 'Red Bull', m: '350 ml', p: 9030, d: T3('Clásico.', 'Classic.', 'Классический.'), t: ['sweet'] },
  // TEA
  { id: 'assam', cat: 'tea', name: 'Assam', p: 8766, d: T3('Té negro.', 'Black tea.', 'Чёрный чай.'), t: ['strong'] },
  { id: 'earlgrey', cat: 'tea', name: 'Earl Grey', p: 8766, d: T3('Té negro con bergamota.', 'Black tea with bergamot.', 'Чёрный чай с бергамотом.'), t: ['citrus', 'floral'] },
  { id: 'sencha', cat: 'tea', name: 'Sencha', p: 8770, d: T3('Té verde.', 'Green tea.', 'Зелёный чай.'), t: ['fresh', 'herbal'] },
  { id: 'puer', cat: 'tea', name: 'Puer cocido', p: 12450, d: T3('Negro (China).', 'Ripe pu-erh (China).', 'Шу пуэр (Китай).'), t: ['smoky', 'strong'] },
  { id: 'krishna', cat: 'tea', name: 'Krishna Chai', p: 8766, d: T3('Té negro, jengibre, cardamomo, pimienta rosa, anís estrellado, canela.', 'Black tea, ginger, cardamom, pink pepper, star anise, cinnamon.', 'Чёрный чай, имбирь, кардамон, розовый перец, бадьян, корица.'), t: ['spicy', 'sweet'], hit: true },
  { id: 'joie', cat: 'tea', name: 'Joie', p: 8770, d: T3('Té negro, rosa mosqueta, cascarilla de cacao.', 'Black tea, rosehip, cacao husk.', 'Чёрный чай, шиповник, шелуха какао.'), t: ['fruity', 'sweet'] },
  { id: 'kospi', cat: 'tea', name: 'Kospi', p: 10040, d: T3('Menta, cedrón, lavanda, manzanilla.', 'Mint, lemon verbena, lavender, chamomile.', 'Мята, вербена, лаванда, ромашка.'), t: ['herbal', 'floral'] },
  { id: 'akasha', cat: 'tea', name: 'Akasha & Pei Chen', p: 8770, d: T3('Wulong (China).', 'Oolong (China).', 'Улун (Китай).'), t: ['floral'] },
  { id: 'mudanwan', cat: 'tea', name: 'Mudanwan', p: 7500, d: T3('Té blanco (China).', 'White tea (China).', 'Белый чай (Китай).'), t: ['soft', 'floral'] },
  { id: 'karkade', cat: 'tea', name: 'Karkade Flower', p: 8770, d: T3('Hibiscus, rosas.', 'Hibiscus, roses.', 'Гибискус, розы.'), t: ['floral', 'fruity'] },
  { id: 'dahongpao', cat: 'tea', name: 'Da Hong Pao', p: 11090, d: T3('Wulong negro.', 'Dark oolong.', 'Тёмный улун.'), t: ['smoky', 'strong'] },
  // AUTHOR TEA
  ...[
    ['Apple Muse', T3('Té verde, Monin de manzana, vainilla, limón, miel, menta.', 'Green tea, apple Monin, vanilla, lemon, honey, mint.', 'Зелёный чай, яблочный Monin, ваниль, лимон, мёд, мята.'), ['fruity', 'sweet']],
    ['Orange Team', T3('Té negro, Monin de mandarina, jugo de naranja, miel, menta.', 'Black tea, mandarin Monin, orange juice, honey, mint.', 'Чёрный чай, мандариновый Monin, апельсиновый сок, мёд, мята.'), ['citrus', 'sweet']],
    ['Kir Peach', T3('Té negro, Monin de durazno, durazno, miel, menta.', 'Black tea, peach Monin, peach, honey, mint.', 'Чёрный чай, персиковый Monin, персик, мёд, мята.'), ['fruity', 'sweet']],
    ['Citrus Symphony', T3('Té negro, limón, naranja, pomelo, miel, menta.', 'Black tea, lemon, orange, grapefruit, honey, mint.', 'Чёрный чай, лимон, апельсин, грейпфрут, мёд, мята.'), ['citrus', 'fresh']],
    ['Very Peri 2.0', T3('Hibiscus, frutilla, frambuesa, arándano rojo, miel, menta.', 'Hibiscus, strawberry, raspberry, cranberry, honey, mint.', 'Гибискус, клубника, малина, клюква, мёд, мята.'), ['fruity', 'floral']],
    ['Tropic Rey', T3('Té negro, puré de maracuyá, semillas, miel, menta.', 'Black tea, passion fruit purée, seeds, honey, mint.', 'Чёрный чай, пюре маракуйи, семена, мёд, мята.'), ['fruity', 'fresh']],
  ].map(([name, d, t], i) => ({ id: 'at' + i, cat: 'authortea', name, d, t, p: 13721, m: '800 ml · + Ice tea', hit: i === 4 })),
  // CLASSICS
  ...[
    ['Negroni', 'Gin Gordon’s, Campari, Vermouth Rosso, piel de naranja', '28,7%', ['bitter', 'strong']],
    ['Long Island', 'Gin, ron blanco, tequila, vodka, Triple Sec (licor de naranja), limón, simple syrup, Coca-Cola', '22%', ['strong', 'citrus']],
    ['Mojito', 'Ron Havana, jugo de lima, almíbar, soda, menta', '13,4%', ['fresh', 'citrus'], true],
    ['Aperol Spritz', 'Espumante Gambei, Aperol, soda, piel de naranja', '10,4%', ['bitter', 'citrus'], true],
    ['Black Russian', 'Vodka Sernova, licor de café', '33,3%', ['strong']],
    ['Boulevardier', 'Jim Beam, Vermouth Rosso, Campari, piel de naranja', '28,3%', ['bitter', 'strong']],
    null, // White Russian — no longer served
    ['Margarita', 'Tequila, Triple Sec, lima, simple syrup', '24%', ['citrus']],
    ['Old Fashioned', 'Jim Beam, Angostura, almíbar simple', '26,7%', ['strong', 'bitter']],
    ['Manhattan', 'Jim Beam, Vermouth Rosso, Angostura, cereza, piel de naranja', '32,2%', ['strong']],
    ['Dry Martini', 'Gin Gordon’s, Vermouth Dry, aceituna', '33,3%', ['strong', 'herbal']],
    ['Cuba Libre', 'Ron especial, Coca-Cola', '12%', ['sweet']],
    ['Garibaldi', 'Campari, jugo de naranja, piel de naranja', '8,1%', ['bitter', 'citrus']],
    ['New York Sour', 'Bourbon Jim Beam, jugo de limón, azúcar, vino tinto, piel de limón', '24,4%', ['citrus', 'strong']],
    ['Cynar Julep', 'Cynar, pomelo, jugo de pomelo, menta', '7,6%', ['herbal', 'fresh']],
    ['Penicillin', 'Johnnie Walker Red Label, limón, almíbar de jengibre', '20%', ['spicy', 'smoky']],
    ['Pisco Sour', 'Capel Pisco, exprimido de lima, almíbar de azúcar', '35%', ['citrus']],
    ['Daiquiri', 'Ron blanco, Triple Sec, lima, simple syrup', '22%', ['citrus', 'fresh']],
    null, // Mint Julep — no longer served
    ['Fernet Cola', 'Fernet Branca, Coca-Cola', null, ['bitter', 'sweet']],
    null, // Hanky Panky — no longer served
    null, // Gimlet — no longer served
    ['Gin Tonic', 'Gin Gordon’s, tónica, garnish a elección', null, ['fresh', 'bitter']],
  ].map((r, i) => r && { id: 'cl' + i, cat: 'classics', name: r[0], d: { es: r[1] }, m: r[2] || undefined, t: r[3], p: 14610, hit: !!r[4] }).filter(Boolean),
  // SIGNATURE
  ...[
    ['Piña Colada', 'Ron, licor Malibu, jugo y almíbar de ananá, Amarula', ['creamy', 'sweet']],
    ['Tropic Sin', 'Ron, Triple Sec, maracuyá, limón, almíbar de azúcar', ['fruity', 'citrus']],
    ['Apricot Sunshine', 'Ron, apricot brandy, jugo de naranja y durazno, limón, almíbar, pulpa', ['fruity', 'sweet']],
    ['Cosmoflower', 'Licor de grosella negra, Aperol, vodka Sernova', ['fruity', 'bitter']],
    ['Bramble Shock', 'Gin, jugo de limón, almíbar de azúcar, licor de cassis', ['fruity', 'citrus']],
    ['Mai Tai', 'Ron blanco, ron negro, amaretto, limón, almíbar, jugo de naranja, Aperol', ['strong', 'fruity']],
    ['Sweet Dreams', 'Amaretto, bourbon vainilla, licor de café, limón, almíbar de azúcar', ['sweet', 'creamy']],
  ].map(([name, es, t], i) => ({ id: 'sg' + i, cat: 'signature', name, d: { es }, t, p: 16770, new: i === 3 })),
  // WINE
  { id: 'cabfranc', cat: 'wine', name: 'Norton Altura Cabernet Franc', m: '750 ml', p: 34176, t: ['spicy', 'fruity'] },
  { id: 'agrelo', cat: 'wine', name: 'Norton Lote Agrelo', m: '750 ml', p: 45357, t: ['strong'] },
  { id: 'whiteblend', cat: 'wine', name: 'Norton Altura White Blend', m: '750 ml', p: 34049, t: ['fresh', 'fruity'] },
  { id: 'glass', cat: 'wine', name: 'Copa · Norton Libre Grüner Veltliner', m: T3('Copa · blanco', 'Glass · white', 'Бокал · белое'), p: 8770, t: ['fresh'] },
  { id: 'rose', cat: 'wine', name: 'Aristides Blend Rosé', m: '750 ml', p: 31500, t: ['fruity', 'fresh'] },
  // SPARKLING
  { id: 'navarro', cat: 'sparkling', name: 'Navarro Correas Extra Brut', m: '750 cc', p: 28840, t: ['fresh'] },
  { id: 'nortonbrut', cat: 'sparkling', name: 'Norton Cosecha Especial Brut Nature', m: '750 cc', p: 35320, t: ['fresh', 'citrus'] },
  // SHOTS
  ...[
    ['Vodka', 'Sernova', 7496], ['Vodka', 'Absolut', 10110], ['Whisky', 'Macallan', 64333], ['Whisky', "Jack Daniel's", 13848],
    ['Whisky', 'Jameson', 16390], ['Whisky', 'Chivas Regal 12', 18800], ['Whisky', 'Chivas Regal 18', 26553], ['Whisky', 'Red Label', 12450],
    ['Whisky', 'Ballantine’s', 18930], ['Whisky', 'Aberlour', 18803], ['Whisky', 'Monkey Shoulder', 23890], ['Whisky', 'Jim Beam', 12420],
    ['Whisky', 'Black Label', 13510], ['Tequila', 'José Cuervo Dorado', 13850], null,
    ['Ron', 'Havana Club 7', 11940], ['Cognac', 'Hennessy', 18240], ['Gin', 'Bombay', 7860], ['Gin', 'Hendrick’s', 16460],
  ].map((r, i) => r && { id: 'sh' + i, cat: 'shots', name: r[1], m: r[0], p: r[2], t: ['strong'] }).filter(Boolean),
  // BEER
  { id: 'corona', cat: 'beer', name: 'Corona', m: '330 ml', p: 9528, t: ['fresh'] },
  { id: 'stella', cat: 'beer', name: 'Stella Artois', m: '330 ml', p: 9780, t: ['fresh'] },
  { id: 'coronazero', cat: 'beer', name: 'Corona Zero', m: '330 ml · 0%', p: 9528, t: ['fresh'] },
  { id: 'guinness', cat: 'beer', name: 'Guinness', m: '473 ml', p: 12070, t: ['bitter', 'creamy'] },
  { id: 'rabieta', cat: 'beer', name: 'Rabieta Red Honey', m: '473 ml', p: 11261, t: ['sweet'] },
];

// Cross-sell: what pairs with each category
export const PAIR = {
  hookah: ['krishna', 'limonada', 'at4', 'jerky'],
  starters: ['corona', 'limonada', 'h-premium'],
  rolls: ['whiteblend', 'sencha', 'limonada'],
  hotrolls: ['corona', 'passion', 'sencha'],
  wok: ['stella', 'limonada', 'earlgrey'],
  salads: ['whiteblend', 'passion'],
  desserts: ['krishna', 'joie', 'h-classic'],
  soft: ['h-classic', 'jerky', 'falafel'],
  tea: ['cinnabon', 'trufa', 'h-classic'],
  authortea: ['noche', 'h-premium', 'brownie'],
  classics: ['jerky', 'langostinos', 'h-premium'],
  signature: ['langostinos', 'phila-ebi', 'h-premium'],
  wine: ['aburi', 'griega', 'h-cigar'],
  sparkling: ['phila-ebi', 'trufa'],
  shots: ['h-cigar', 'jerky', 'tonica'],
  beer: ['jerky', 'langostinos', 'tempura'],
};

export const PROMOS = [
  { tag: '14:00 – 17:00', title: 'Business Hookah', big: '20% OFF', d: T3('En cualquier hookah.', 'On any hookah.', 'На любой кальян.'), window: [14, 17] },
  { tag: 'EFECTIVO · CRYPTO USDT', title: T3('Efectivo o cripto', 'Cash or crypto', 'Наличные или крипто'), big: '15% OFF', d: T3('En la cuenta total.', 'On the whole bill.', 'На весь счёт.') },
  { tag: T3('Después de 17:00', 'After 17:00', 'После 17:00'), title: T3('Más hookahs', 'More hookahs', 'Больше кальянов'), big: '−10% · −15%', d: T3('2.ª hookah 10% OFF · 3.ª hookah 15% OFF.', '2nd hookah 10% off · 3rd hookah 15% off.', '2-й кальян −10% · 3-й кальян −15%.'), window: [17, 30] },
];
export const PROMO_NOTE = T3('Todas las promociones son acumulables con el descuento por pago en efectivo o cripto.', 'All promotions stack with the cash / crypto discount.', 'Все акции суммируются со скидкой за наличные или крипто.');

// House rules, as on darkskyhookah.com: two tabs, «Prohibited» and «General»
export const RULES = {
  title: L('House rules', 'Reglas de la casa', 'Правила заведения', '店内规则', 'हाउस नियम', 'قواعد المكان', 'Règles de la maison', 'Regras da casa', 'Hausregeln', 'ハウスルール'),
  noTitle: L('Prohibited', 'Prohibido', 'Запрещено', '禁止', 'निषिद्ध', 'ممنوع', 'Interdit', 'Proibido', 'Verboten', '禁止事項'),
  generalTitle: L('General', 'General', 'Общие', '一般规定', 'सामान्य', 'عام', 'Général', 'Geral', 'Allgemein', '一般'),
  ok: L('Got it', 'Entendido', 'Понятно', '知道了', 'समझ गया', 'فهمت', 'Compris', 'Entendi', 'Verstanden', '了解'),
  no: [
    L('Moving the hookah without staff assistance.', 'Mover la hookah sin asistencia del personal', 'Перемещать кальян без помощи персонала.', '在没有工作人员协助的情况下移动水烟。', 'स्टाफ़ की मदद के बिना हुक्का हिलाना।', 'نقل الشيشة دون مساعدة الموظفين.', 'Déplacer la chicha sans l’aide du personnel.', 'Mover o narguilé sem a ajuda da equipe.', 'Die Shisha ohne Hilfe des Personals bewegen.', 'スタッフの手を借りずにシーシャを動かすこと。'),
    L('Entering with own food or drinks.', 'Ingresar con alimentos o bebidas propios', 'Вход со своими продуктами или напитками.', '自带食物或饮料入场。', 'अपना खाना या पेय लेकर प्रवेश करना।', 'الدخول بطعام أو مشروبات خاصة.', 'Entrer avec sa propre nourriture ou ses boissons.', 'Entrar com comida ou bebida próprias.', 'Mitgebrachte Speisen oder Getränke.', '飲食物の持ち込み。'),
    L('Ordering delivery from other establishments.', 'Pedir delivery de otros establecimientos', 'Заказ доставки из других заведений.', '从其他店铺订外卖。', 'दूसरी जगहों से डिलीवरी मँगाना।', 'طلب التوصيل من أماكن أخرى.', 'Commander une livraison d’autres établissements.', 'Pedir delivery de outros estabelecimentos.', 'Lieferungen von anderen Lokalen bestellen.', '他店からのデリバリー注文。'),
    L('Entering or remaining intoxicated or under the influence of illegal substances.', 'Ingresar o permanecer en estado de ebriedad o bajo los efectos de sustancias ilegales', 'Вход или нахождение в состоянии опьянения или под воздействием запрещенных веществ.', '在醉酒或受违禁物质影响的状态下进入或停留。', 'नशे की हालत में या अवैध पदार्थों के असर में प्रवेश करना या रुकना।', 'الدخول أو البقاء في حالة سُكر أو تحت تأثير مواد محظورة.', 'Entrer ou rester en état d’ivresse ou sous l’effet de substances illicites.', 'Entrar ou permanecer embriagado ou sob efeito de substâncias ilegais.', 'Betrunken oder unter dem Einfluss illegaler Substanzen eintreten oder bleiben.', '酩酊状態または違法薬物の影響下での入店・滞在。'),
    L('Moving sofas/armchairs or joining tables without staff authorization.', 'Mover sillones o unir mesas sin autorización del personal', 'Перемещение диванов/кресел или объединение столов без разрешения персонала.', '未经工作人员允许移动沙发/扶手椅或拼桌。', 'स्टाफ़ की अनुमति के बिना सोफ़े/कुर्सियाँ हिलाना या टेबल जोड़ना।', 'تحريك الأرائك/الكراسي أو ضم الطاولات دون إذن الموظفين.', 'Déplacer canapés/fauteuils ou rapprocher des tables sans l’accord du personnel.', 'Mover sofás/poltronas ou juntar mesas sem autorização da equipe.', 'Sofas/Sessel verschieben oder Tische zusammenstellen ohne Erlaubnis des Personals.', 'スタッフの許可なくソファ・椅子を動かしたりテーブルをつなげたりすること。'),
    L('Entry exclusively for persons over 18 years old.', 'Ingreso exclusivo para mayores de 18 años', 'Вход только для лиц старше 18 лет.', '仅限18岁以上人士入场。', 'प्रवेश केवल 18 वर्ष से अधिक उम्र के लोगों के लिए।', 'الدخول حصريًا لمن تجاوزوا 18 عامًا.', 'Entrée réservée aux personnes de plus de 18 ans.', 'Entrada exclusiva para maiores de 18 anos.', 'Zutritt nur für Personen über 18 Jahre.', '18歳以上の方のみ入店可。'),
  ],
  general: [
    L("DARKSKY Hookah Lounge is not responsible for guests' personal belongings.", 'DARKSKY Hookah Lounge no se hace responsable por las pertenencias personales de los clientes.', 'DARKSKY Hookah Lounge не несет ответственности за личные вещи гостей.', 'DARKSKY Hookah Lounge 不对顾客的个人物品负责。', 'DARKSKY Hookah Lounge मेहमानों के निजी सामान के लिए ज़िम्मेदार नहीं है।', 'لا تتحمّل DARKSKY Hookah Lounge مسؤولية المتعلقات الشخصية للضيوف.', 'DARKSKY Hookah Lounge n’est pas responsable des effets personnels des clients.', 'O DARKSKY Hookah Lounge não se responsabiliza pelos pertences pessoais dos clientes.', 'DARKSKY Hookah Lounge haftet nicht für persönliche Gegenstände der Gäste.', 'DARKSKY Hookah Lounge はお客様の私物について責任を負いません。'),
    L('In case of damage to the facilities, furniture, or lounge elements, the client must pay the corresponding repair or replacement cost.', 'En caso de daños a las instalaciones, mobiliario o elementos del lounge, el cliente deberá abonar el costo de reparación o reposición correspondiente.', 'В случае повреждения помещений, мебели или элементов лаунжа клиент обязан оплатить соответствующую стоимость ремонта или замены.', '如损坏场地、家具或店内物品，顾客须支付相应的维修或更换费用。', 'परिसर, फ़र्नीचर या लाउंज की चीज़ों को नुकसान होने पर ग्राहक को मरम्मत या बदलने की लागत चुकानी होगी।', 'في حال إلحاق ضرر بالمكان أو الأثاث أو مقتنيات الصالة، يلتزم العميل بدفع تكلفة الإصلاح أو الاستبدال.', 'En cas de dommages aux locaux, au mobilier ou aux éléments du lounge, le client doit payer les frais de réparation ou de remplacement correspondants.', 'Em caso de danos às instalações, móveis ou elementos do lounge, o cliente deverá pagar o custo de reparo ou reposição correspondente.', 'Bei Schäden an Räumlichkeiten, Möbeln oder Einrichtung der Lounge trägt der Gast die Kosten für Reparatur oder Ersatz.', '店舗・家具・備品を破損した場合、お客様には修理または交換の費用をご負担いただきます。'),
    L('Hookahs are delivered for exclusive use within DARKSKY Hookah Lounge and cannot be removed from the establishment.', 'Las hookahs se entregan para uso exclusivo dentro de DARKSKY Hookah Lounge y no pueden retirarse del establecimiento.', 'Кальяны предоставляются исключительно для использования на территории DARKSKY Hookah Lounge и не могут быть вынесены из заведения.', '水烟仅限在 DARKSKY Hookah Lounge 店内使用，不得带出店外。', 'हुक्के केवल DARKSKY Hookah Lounge के अंदर इस्तेमाल के लिए दिए जाते हैं और बाहर नहीं ले जाए जा सकते।', 'تُقدَّم الشيشة للاستخدام داخل DARKSKY Hookah Lounge فقط ولا يجوز إخراجها من المكان.', 'Les chichas sont fournies pour un usage exclusif au sein du DARKSKY Hookah Lounge et ne peuvent pas quitter l’établissement.', 'Os narguilés são fornecidos para uso exclusivo dentro do DARKSKY Hookah Lounge e não podem ser retirados do estabelecimento.', 'Shishas werden ausschließlich zur Nutzung in der DARKSKY Hookah Lounge ausgegeben und dürfen das Lokal nicht verlassen.', 'シーシャは DARKSKY Hookah Lounge 店内でのご利用に限り、店外への持ち出しはできません。'),
  ],
};

// Item media: replace placeholders with real photos, video or 3D.
// Key = item id, value = URL under public/ (e.g. '/media/h-premium.mp4').
// .jpg/.png/.webp → photo · .mp4/.webm → looping video · .glb → rotating 3D model.
// '/media/<slug>.webm#t=…' → keyed product clip made by scripts/key-videos.mjs (it prints these lines).
// Cut-out photos of cocktails and bottles (Wikimedia Commons / Pexels / Bodega Norton's shop; credits in darksky-credits.js): id → public/media/cut/<name>.webp
const CUTS = {
  cl0: 'negroni', cl1: 'long-island', cl2: 'mojito', cl3: 'aperol-spritz', cl4: 'black-russian',
  cl5: 'boulevardier', cl7: 'margarita', cl8: 'old-fashioned', cl9: 'manhattan', cl10: 'dry-martini',
  cl11: 'cuba-libre', cl12: 'garibaldi', cl13: 'new-york-sour', cl14: 'cynar-julep', cl15: 'penicillin',
  cl16: 'pisco-sour', cl17: 'daiquiri', cl18: 'mint-julep', cl19: 'fernet-cola', cl20: 'hanky-panky',
  cl21: 'gimlet', cl22: 'gin-tonic', sg0: 'pina-colada', sg1: 'tropic-sin', sg2: 'apricot-sunshine',
  sg3: 'cosmoflower', sg4: 'bramble-shock', sg6: 'sweet-dreams', glass: 'norton-libre-gruner-veltliner', cabfranc: 'norton-altura-cabernet-franc', agrelo: 'norton-lote-agrelo', whiteblend: 'norton-altura-white-blend', nortonbrut: 'norton-cosecha-brut-nature', sh1: 'absolut',
  sh2: 'macallan', sh3: 'jack-daniels', sh4: 'jameson', sh5: 'chivas-regal-12', sh6: 'chivas-regal-18',
  sh7: 'red-label', sh8: 'ballantines', sh9: 'aberlour', sh10: 'monkey-shoulder', sh11: 'jim-beam',
  sh12: 'black-label', sh13: 'jose-cuervo-dorado', sh15: 'havana-club-7', sh16: 'hennessy', sh17: 'bombay',
  sh18: 'hendricks', stella: 'stella-artois', guinness: 'guinness',
};

export const MEDIA = {
  ...Object.fromEntries(Object.entries(CUTS).map(([id, f]) => [id, '/media/cut/' + f + '.webp'])),
  // photos from darkskyhookah.com (cut out onto the smoky stage); tea shares its section photo, as on that site
  ...Object.fromEntries(['assam', 'earlgrey', 'sencha', 'puer', 'krishna', 'joie', 'kospi', 'akasha', 'mudanwan', 'karkade', 'dahongpao', 'at0', 'at1', 'at2', 'at3', 'at4'].map(id => [id, '/media/cut/tea.webp'])),
  'tempura-teri': '/media/cut/tempura-teri.webp', trufa: '/media/cut/trufa.webp', limonada: '/media/cut/limonada.webp',
  corona: '/media/cut/beer-corona.webp', coronazero: '/media/cut/beer-corona.webp',
  // keyed product clips (scripts/key-videos.mjs); list rows show their cover instead: the finished dish (scripts/make-covers.mjs)
  'h-classic': '/media/hookah.webm#t=0.04', 'h-premium': '/media/hookah.webm#t=0.04', 'h-cigar': '/media/hookah.webm#t=0.04',
  jerky: '/media/jerky.webm#t=2.21',
  falafel: '/media/falafel.webm#t=2.46',
  langostinos: '/media/langostinos.webm#t=3.54',
  panqueques: '/media/panqueques.webm#t=5.63',
  'phila-ebi': '/media/roll-phila.webm#t=1.08', // this clip is the Ebi Ponzu roll (the kitchen tile shows it too)
  phila: '/media/roll-philadelphia.webm#t=0.04', // its own clip (2026-10-28): starts on the plate, then the roll comes apart
  maki: '/media/roll-maki.webm#t=2.71',
  aburi: '/media/roll-aburi.webm#t=5.38',
  horno: '/media/roll-horno.webm#t=4.75',
  tempura: '/media/roll-tempura.webm#t=1.88',
  kanikama: '/media/roll-kanikama.webm#t=4.38',
  newyork: '/media/roll-newyork.webm#t=4.13',
  unagi: '/media/roll-unagi.webm#t=3.33',
  'wok-rice': '/media/wok-rice.webm#t=3.71',
  udon: '/media/udon.webm#t=3.63',
  cesar: '/media/salad-cesar.webm#t=7.5', // filmed landscape, kept whole (wide in key-videos.mjs)
  griega: '/media/salad-greek.webm#t=2.38',
  brownie: '/media/brownie.webm#t=3.00',
  noche: '/media/pistachio-mousse.webm#t=4.21',
  cinnabon: '/media/cinnabon.webm#t=5.08',
  sg5: '/media/cocktail-amber.webm#t=5.92', // Mai Tai
  at5: '/media/tea-tropic.webm#t=1.54', // Tropic Rey: tea, passion fruit, mint
  passion: '/media/passion-lemonade.webm#t=0.83',
};

// Ordering from the table (QR link): extra UI strings.
const OK = ['scanQr', 'accepted', 'served', 'sendFail', 'wait', 'sending', 'unavailable', 'checkout', 'review', 'note', 'notePh', 'edit', 'stSent', 'stAcc', 'stServed', 'changed'];
const ORAW = {
  en: ['Scan the QR code on your table to order', 'Your waiter has taken the order', 'Enjoy!', "Couldn't send the order. Please call your waiter.", 'Please wait a minute before the next order', 'Sending…', 'Some items are no longer available', 'Place order', 'Check your order', 'Note for the waiter', 'E.g. no ice, bring it later', 'Edit', 'Sent', 'Accepted', 'Served', 'Your waiter updated the order'],
  es: ['Escaneá el QR de tu mesa para pedir', 'Tu mozo tomó el pedido', '¡Que lo disfrutes!', 'No se pudo enviar el pedido. Llamá al mozo.', 'Esperá un minuto antes del próximo pedido', 'Enviando…', 'Algunos productos ya no están disponibles', 'Hacer el pedido', 'Revisá tu pedido', 'Comentario para el mozo', 'Ej.: sin hielo, traer más tarde', 'Modificar', 'Enviado', 'Aceptado', 'Servido', 'El mozo modificó tu pedido'],
  ru: ['Отсканируйте QR-код на столе, чтобы заказать', 'Официант принял заказ', 'Приятного отдыха!', 'Не удалось отправить заказ. Позовите официанта.', 'Подождите минуту перед следующим заказом', 'Отправляем…', 'Некоторых позиций уже нет в наличии', 'Оформить заказ', 'Проверьте заказ', 'Комментарий для официанта', 'Например: без льда, принести позже', 'Изменить', 'Отправлен', 'Принят', 'Подано', 'Официант изменил заказ'],
  zh: ['扫描桌上的二维码即可点单', '服务员已接单', '请慢用！', '订单发送失败，请呼叫服务员。', '请稍等一分钟再下单', '发送中…', '部分菜品已售罄', '提交订单', '确认您的订单', '给服务员的备注', '例如：不加冰，稍后上', '修改', '已发送', '已接单', '已上菜', '服务员已修改您的订单'],
  hi: ['ऑर्डर करने के लिए अपनी टेबल पर QR कोड स्कैन करें', 'वेटर ने ऑर्डर ले लिया है', 'आनंद लें!', 'ऑर्डर नहीं भेजा जा सका। कृपया वेटर को बुलाएँ।', 'अगला ऑर्डर देने से पहले एक मिनट रुकें', 'भेजा जा रहा है…', 'कुछ आइटम अब उपलब्ध नहीं हैं', 'ऑर्डर करें', 'अपना ऑर्डर जाँचें', 'वेटर के लिए नोट', 'जैसे: बिना बर्फ, बाद में लाएँ', 'बदलें', 'भेजा गया', 'स्वीकार', 'परोसा गया', 'वेटर ने आपका ऑर्डर बदला है'],
  ar: ['امسح رمز QR على طاولتك للطلب', 'استلم النادل طلبك', 'بالهناء والشفاء!', 'تعذّر إرسال الطلب. يرجى مناداة النادل.', 'يرجى الانتظار دقيقة قبل الطلب التالي', 'جارٍ الإرسال…', 'بعض الأصناف لم تعد متوفرة', 'تأكيد الطلب', 'راجع طلبك', 'ملاحظة للنادل', 'مثلاً: بدون ثلج، أحضره لاحقاً', 'تعديل', 'تم الإرسال', 'تم القبول', 'تم التقديم', 'قام النادل بتعديل طلبك'],
  fr: ['Scannez le QR code de votre table pour commander', 'Votre serveur a pris la commande', 'Bonne dégustation !', "Impossible d'envoyer la commande. Appelez le serveur.", 'Patientez une minute avant la prochaine commande', 'Envoi…', 'Certains articles ne sont plus disponibles', 'Commander', 'Vérifiez votre commande', 'Note pour le serveur', 'Ex. : sans glaçons, à servir plus tard', 'Modifier', 'Envoyée', 'Acceptée', 'Servie', 'Le serveur a modifié votre commande'],
  pt: ['Escaneie o QR code da sua mesa para pedir', 'O garçom recebeu o pedido', 'Aproveite!', 'Não foi possível enviar o pedido. Chame o garçom.', 'Aguarde um minuto antes do próximo pedido', 'Enviando…', 'Alguns itens não estão mais disponíveis', 'Fazer pedido', 'Confira seu pedido', 'Observação para o garçom', 'Ex.: sem gelo, trazer depois', 'Alterar', 'Enviado', 'Aceito', 'Servido', 'O garçom alterou seu pedido'],
  de: ['Scanne den QR-Code auf deinem Tisch, um zu bestellen', 'Dein Kellner hat die Bestellung angenommen', 'Viel Genuss!', 'Bestellung konnte nicht gesendet werden. Bitte ruf den Kellner.', 'Bitte warte eine Minute bis zur nächsten Bestellung', 'Wird gesendet…', 'Einige Artikel sind nicht mehr verfügbar', 'Bestellen', 'Bestellung prüfen', 'Hinweis für den Kellner', 'Z. B. ohne Eis, später bringen', 'Ändern', 'Gesendet', 'Angenommen', 'Serviert', 'Der Kellner hat deine Bestellung geändert'],
  ja: ['ご注文はテーブルのQRコードを読み取ってください', 'スタッフが注文を受け付けました', 'ごゆっくりどうぞ！', '注文を送信できませんでした。スタッフをお呼びください。', '次のご注文まで1分お待ちください', '送信中…', '一部の商品は品切れです', '注文する', 'ご注文の確認', 'スタッフへのメモ', '例：氷なし、あとで持ってきて', '変更', '送信済み', '受付済み', '提供済み', 'スタッフがご注文を変更しました'],
};
export const UI_ORDER = Object.fromEntries(Object.entries(ORAW).map(([l, a]) => [l, Object.fromEntries(OK.map((k, i) => [k, a[i]]))]));

// The remaining languages come from darksky-i18n.mjs. Guest-facing dish names go to `nm`; `name` stays what staff
// see in Telegram and the admin.
const addLangs = (o, key) => { const t = I18N[key]; if (t && o && typeof o === 'object') for (const l in t) o[l] ??= t[l]; };
for (const it of ITEMS) {
  const k = 'item:' + it.id;
  if (I18N[k + ':name']) it.nm = { ...I18N[k + ':name'] };
  addLangs(it.d, k + ':d'); addLangs(it.m, k + ':m');
  it.v?.forEach((x, i) => addLangs(x.n, k + ':v' + i));
}
const fillAll = (o, path) => { if (!o || typeof o !== 'object') return; addLangs(o, path); for (const key of Object.keys(o)) fillAll(o[key], path + '.' + key); };
for (const [name, o] of Object.entries({ PROMOS, PROMO_NOTE, RULES, SECTIONS })) fillAll(o, name);
