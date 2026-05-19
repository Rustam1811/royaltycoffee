/**
 * Seed Firestore menuCategories + menuItems from drinksData.ts
 * 
 * Reads the local drinksData, resolves i18n keys from ru.json,
 * and writes everything to Firestore so the admin panel shows
 * the current (correct) menu.
 *
 * Usage:  node scripts/seed-menu-firestore.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Firebase Admin init ───────────────────────────────
const serviceAccount = require('../functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Load Russian locale for resolving translation keys ─
const ruPath = path.join(__dirname, '..', 'src', 'pages', 'menu', 'locales', 'ru.json');
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf-8'));

const enPath = path.join(__dirname, '..', 'src', 'pages', 'menu', 'locales', 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const kzPath = path.join(__dirname, '..', 'src', 'pages', 'menu', 'locales', 'kz.json');
const kz = JSON.parse(fs.readFileSync(kzPath, 'utf-8'));

/**
 * Resolve a dotted key like "menu.cappuccino.name" from a locale object.
 */
function resolve(obj, key) {
  if (!key) return '';
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return key;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : key;
}

// ─── Category + Product data (manually mirrored from drinksData.ts) ─
// We parse key fields we need for the admin panel.

const categories = [
  { id: 'coffee',      name: resolve(ru, 'menu.categories.coffee'),      nameEn: resolve(en, 'menu.categories.coffee'),      nameKz: resolve(kz, 'menu.categories.coffee'),      icon: '☕', order: 1, image: '/drinks/cappuccino.webp' },
  { id: 'raf_royal',   name: resolve(ru, 'menu.categories.raf_royal'),   nameEn: resolve(en, 'menu.categories.raf_royal'),   nameKz: resolve(kz, 'menu.categories.raf_royal'),   icon: '👑', order: 2, image: '/drinks/raf-arahis.webp' },
  { id: 'lemonade',    name: resolve(ru, 'menu.categories.lemonade'),    nameEn: resolve(en, 'menu.categories.lemonade'),    nameKz: resolve(kz, 'menu.categories.lemonade'),    icon: '🍋', order: 3, image: '/drinks/lemonade-kiwi-mint.webp' },
  { id: 'ice_coffee',  name: resolve(ru, 'menu.categories.ice_coffee'),  nameEn: resolve(en, 'menu.categories.ice_coffee'),  nameKz: resolve(kz, 'menu.categories.ice_coffee'),  icon: '🧊', order: 4, image: '/drinks/ice-latte.webp' },
  { id: 'milkshake',   name: resolve(ru, 'menu.categories.milkshake'),   nameEn: resolve(en, 'menu.categories.milkshake'),   nameKz: resolve(kz, 'menu.categories.milkshake'),   icon: '🥛', order: 5, image: '/drinks/milk-duet.webp' },
];

// Products: [categoryId, firestoreId, i18nKey, price, image, energy, protein, fat, carbs, isPopular, badges, isNew]
const products = [
  // ── Coffee ──
  ['coffee', 'cappuccino',              'cappuccino',              940,  '/drinks/cappuccino.webp',              150, 8.5, 8.2, 12.0, true,  ['HIT'], false],
  ['coffee', 'latte',                   'latte',                   940,  '/drinks/latte.webp',                   158, 8.2, 8.1, 12.6, true,  ['HIT'], false],
  ['coffee', 'caramelatte',             'caramelatte',             1300, '/drinks/caramelatte.webp',             210, 7.8, 9.0, 25.0, false, [],      false],
  ['coffee', 'americano',               'americano',               780,  '/drinks/americano.webp',               20,  0.8, 0.3, 1.2,  false, [],      false],
  ['coffee', 'raf-coffee',              'raf_coffee',              1480, '/drinks/raf-coffee.webp',              280, 6.5, 14.0,28.0, true,  ['HIT'], false],
  ['coffee', 'mokkachino',              'mokkachino',              1180, '/drinks/mokkachino.webp',              198, 9.1, 9.8, 18.4, false, [],      false],
  ['coffee', 'flat-white',              'flat_white',              980,  '/drinks/flat-white.webp',              135, 7.8, 7.5, 10.2, false, [],      false],
  ['coffee', 'masala-coffee',           'masala_coffee',           1380, '/drinks/masala-coffee.webp',           220, 3.2, 8.5, 28.0, false, [],      false],
  ['coffee', 'glintveyn-coffee',        'glintveyn_coffee',        1540, '/drinks/glintveyn-coffee.webp',        185, 1.5, 0.5, 32.0, false, ['NEW'], true],
  ['coffee', 'matcha-latte',            'matcha_latte',            1150, '/drinks/matcha-latte.webp',            142, 6.8, 7.2, 14.6, true,  ['HIT'], false],
  ['coffee', 'chai-tea',                'chai_tea',                670,  '/drinks/chai-tea.webp',                5,   0.1, 0.0, 1.0,  false, [],      false],

  // ── Raf Royal ──
  ['raf_royal', 'raf-arahis',           'raf_arahis',              1700, '/drinks/raf-arahis.webp',              310, 8.0, 16.0,30.0, true,  ['HIT'], false],
  ['raf_royal', 'raf-lavanda',          'raf_lavanda',             1700, '/drinks/raf-lavanda.webp',             290, 6.5, 14.0,28.0, false, [],      false],
  ['raf_royal', 'raf-medovik',          'raf_medovik',             1700, '/drinks/raf-medovik.webp',             305, 7.0, 15.0,32.0, false, ['NEW'], true],
  ['raf_royal', 'raf-melon-cactus',     'raf_melon_cactus',        1700, '/drinks/raf-melon-cactus.webp',        275, 6.2, 13.0,27.0, false, ['NEW'], true],
  ['raf_royal', 'raf-pistachio',        'raf_pistachio',           1700, '/drinks/raf-pistachio.webp',           320, 8.5, 17.0,29.0, true,  ['HIT'], false],

  // ── Lemonade ──
  ['lemonade', 'lemonade-kiwi-mint',      'lemonade_kiwi_mint',      990,  '/drinks/lemonade-kiwi-mint.webp',      138, 1.0, 0.2, 33.5, true,  ['HIT'], false],
  ['lemonade', 'lemonade-mango-passion',  'lemonade_mango_passion',  990,  '/drinks/lemonade-mango-passion.webp',  155, 0.8, 0.3, 38.0, false, [],      false],
  ['lemonade', 'lemonade-mango-strawberry','lemonade_mango_strawberry',990, '/drinks/lemonade-mango-strawberry.webp',148,0.9, 0.2, 36.0, true,  ['HIT'], false],
  ['lemonade', 'lemonade-raspberry-lychee','lemonade_raspberry_lychee',990, '/drinks/lemonade-raspberry-lychee.webp',142,0.7, 0.2, 34.5, false, ['NEW'], true],
  ['lemonade', 'lemonade-peach-grapefruit','lemonade_peach_grapefruit',990, '/drinks/lemonade-peach-grapefruit.webp',135,0.6, 0.1, 33.0, false, [],      false],

  // ── Ice Coffee ──
  ['ice_coffee', 'ice-latte',           'ice_latte',               1190, '/drinks/ice-latte.webp',               165, 8.5, 8.0, 13.0, true,  ['HIT'], false],
  ['ice_coffee', 'ice-americano',       'ice_americano',           980,  '/drinks/ice-americano.webp',           20,  0.8, 0.3, 1.2,  false, [],      false],
  ['ice_coffee', 'ice-raf',             'ice_raf',                 1600, '/drinks/ice-raf.webp',                 280, 6.5, 14.0,28.0, false, [],      false],
  ['ice_coffee', 'ice-matcha',          'ice_matcha',              1150, '/drinks/ice-matcha.webp',              142, 6.8, 7.2, 14.6, true,  ['HIT'], false],
  ['ice_coffee', 'bamble',              'bamble',                  1600, '/drinks/bamble.webp',                  195, 7.2, 7.8, 22.0, false, [],      false],

  // ── Milkshake ──
  ['milkshake', 'milk-duet',            'milk_duet',               750,  '/drinks/milk-duet.webp',               180, 10.0,8.5, 18.0, false, [],      false],
  ['milkshake', 'cocoa',                'cocoa',                   940,  '/drinks/cocoa.webp',                   220, 9.0, 10.5,24.0, true,  ['HIT'], false],
  ['milkshake', 'hot-chocolate',        'hot_chocolate',           940,  '/drinks/hot-chocolate.webp',           250, 8.0, 12.0,28.0, false, [],      false],
];

// ─── Food categories ───────────────────────────────────
const foodCategories = [
  { id: 'croissants',  name: 'Круассаны',  nameEn: 'Croissants',  nameKz: 'Круассандар',  icon: '🥐', order: 10, image: '/eats/eat-01.webp' },
  { id: 'bakery',      name: 'Выпечка',    nameEn: 'Bakery',      nameKz: 'Наубайхана',   icon: '🧁', order: 11, image: '/eats/eat-11.webp' },
  { id: 'sandwiches',  name: 'Сэндвичи',   nameEn: 'Sandwiches',  nameKz: 'Сэндвичтер',   icon: '🥪', order: 12, image: '/eats/eat-21.webp' },
  { id: 'desserts',    name: 'Десерты',     nameEn: 'Desserts',    nameKz: 'Десерттер',     icon: '🍰', order: 13, image: '/eats/eat-30.webp' },
];

// Food products: [categoryId, firestoreId, name, nameEn, nameKz, price, image, energy, protein, fat, carbs, isPopular, badges, isNew, description, weight]
const foodProducts = [
  // ── Круассаны ──
  ['croissants', 'croissant-classic',      'Круассан классический',           'Classic Croissant',            'Классикалық круассан',         890,  '/eats/eat-01.webp', 320, 6.2, 18.5, 34.0, true,  ['HIT'],     false, 'Воздушный слоёный круассан с хрустящей золотистой корочкой.', '85г'],
  ['croissants', 'croissant-chocolate',    'Круассан с шоколадом',            'Chocolate Croissant',          'Шоколадты круассан',           990,  '/eats/eat-02.webp', 380, 7.0, 21.0, 40.5, true,  ['HIT'],     false, 'Круассан с нежной шоколадной начинкой из бельгийского шоколада.', '95г'],
  ['croissants', 'croissant-almond',       'Круассан миндальный',             'Almond Croissant',             'Бадамды круассан',             1090, '/eats/eat-03.webp', 410, 9.5, 24.0, 38.0, false, ['NEW'],     true,  'Круассан с миндальным кремом, посыпанный лепестками миндаля.', '110г'],
  ['croissants', 'croissant-ham-cheese',   'Круассан с сыром и ветчиной',     'Ham & Cheese Croissant',       'Ірімшікті-ветчиналы круассан', 1190, '/eats/eat-04.webp', 450, 18.0, 26.0, 32.0, false, [],          false, 'Сытный круассан с мягким сыром и нежной ветчиной.', '130г'],
  ['croissants', 'croissant-salmon',       'Круассан с лососем',              'Salmon Croissant',             'Лососьты круассан',            1490, '/eats/eat-05.webp', 420, 20.0, 22.0, 30.0, false, ['PREMIUM'], false, 'Круассан с лососем, сливочным сыром и рукколой.', '140г'],
  ['croissants', 'croissant-pistachio',    'Круассан с фисташковым кремом',   'Pistachio Croissant',          'Фисташкалы круассан',          1290, '/eats/eat-06.webp', 395, 8.0, 23.0, 36.0, false, ['NEW'],     true,  'Круассан с нежным фисташковым кремом.', '105г'],
  ['croissants', 'croissant-raspberry',    'Круассан с малиновым джемом',     'Raspberry Jam Croissant',      'Таңқурайлы круассан',          950,  '/eats/eat-07.webp', 350, 5.8, 17.0, 42.0, false, [],          false, 'Круассан с домашним малиновым джемом.', '95г'],
  ['croissants', 'croissant-caramel',      'Круассан с карамелью',            'Caramel Croissant',            'Карамельді круассан',          1050, '/eats/eat-08.webp', 400, 6.5, 22.0, 44.0, true,  ['HIT'],     false, 'Круассан с солёной карамелью и сливочным кремом.', '100г'],
  ['croissants', 'croissant-chicken-pesto','Круассан с курицей и песто',      'Chicken Pesto Croissant',      'Тауықты-песто круассан',       1290, '/eats/eat-09.webp', 460, 22.0, 24.0, 34.0, false, [],          false, 'Круассан с куриным филе, песто и вялеными томатами.', '145г'],
  ['croissants', 'croissant-mini-set',     'Мини-круассаны ассорти',          'Mini Croissants Assorted',     'Мини-круассандар жиынтығы',    1490, '/eats/eat-10.webp', 340, 7.0, 19.0, 36.0, false, ['SET'],     false, 'Набор из 4 мини-круассанов: классический, шоколад, миндаль, ягоды.', '4×50г'],

  // ── Выпечка ──
  ['bakery', 'cinnabon',                   'Синнабон классический',            'Classic Cinnabon',             'Классикалық Синнабон',         1190, '/eats/eat-11.webp', 520, 8.0, 22.0, 68.0, true,  ['HIT'],     false, 'Легендарная булочка с корицей, покрытая сливочной глазурью.', '140г'],
  ['bakery', 'danish-pastry',              'Датская булочка с заварным кремом','Danish Custard Pastry',        'Дат тоқашы крем',              890,  '/eats/eat-12.webp', 380, 7.0, 18.0, 45.0, false, [],          false, 'Нежная слоёная булочка с ванильным заварным кремом.', '110г'],
  ['bakery', 'muffin-chocolate',           'Маффин шоколадный',               'Chocolate Muffin',             'Шоколадты маффин',             790,  '/eats/eat-13.webp', 440, 6.5, 20.0, 55.0, false, [],          false, 'Шоколадный маффин с жидким шоколадным центром.', '120г'],
  ['bakery', 'muffin-berry',              'Маффин с ягодами',                'Berry Muffin',                 'Жидекті маффин',               750,  '/eats/eat-14.webp', 360, 5.5, 14.0, 50.0, false, ['NEW'],     true,  'Нежный маффин с лесными ягодами — голубика, малина, ежевика.', '115г'],
  ['bakery', 'lemon-cake',                'Кекс лимонный',                   'Lemon Cake',                   'Лимонды кекс',                 690,  '/eats/eat-15.webp', 340, 5.0, 16.0, 42.0, false, [],          false, 'Влажный лимонный кекс с цитрусовой глазурью.', '100г'],
  ['bakery', 'oat-cookie-choco',          'Печенье овсяное с шоколадом',     'Oat Chocolate Cookie',         'Шоколадты сулы печенье',       490,  '/eats/eat-16.webp', 280, 5.0, 12.0, 38.0, false, [],          false, 'Хрустящее овсяное печенье с кусочками тёмного шоколада.', '70г'],
  ['bakery', 'brownie',                   'Брауни',                          'Brownie',                      'Брауни',                       890,  '/eats/eat-17.webp', 460, 6.0, 24.0, 52.0, true,  ['HIT'],     false, 'Тягучий шоколадный брауни с грецким орехом.', '100г'],
  ['bakery', 'eclair-vanilla',            'Эклер ванильный',                 'Vanilla Eclair',               'Ванильді эклер',               790,  '/eats/eat-18.webp', 350, 6.0, 18.0, 40.0, false, [],          false, 'Классический эклер с ванильным кремом и шоколадной глазурью.', '90г'],
  ['bakery', 'choux-cream',               'Шу с кремом',                     'Cream Puff',                   'Кремді шу',                    690,  '/eats/eat-19.webp', 310, 5.5, 16.0, 34.0, false, ['NEW'],     true,  'Профитроль с нежным кремом патисьер.', '80г'],
  ['bakery', 'berry-tart',                'Тарт с ягодами',                  'Berry Tart',                   'Жидекті тарт',                 990,  '/eats/eat-20.webp', 320, 5.0, 15.0, 40.0, false, [],          false, 'Песочный тарт со свежими ягодами и заварным кремом.', '110г'],

  // ── Сэндвичи ──
  ['sandwiches', 'panini-mozzarella',      'Панини с моцареллой и песто',     'Mozzarella Pesto Panini',      'Моцарелла-песто панини',        1490, '/eats/eat-21.webp', 420, 18.0, 20.0, 38.0, true,  ['HIT'],     false, 'Горячий панини с моцареллой, вялеными томатами и соусом песто.', '200г'],
  ['sandwiches', 'sandwich-turkey',        'Сэндвич с индейкой',             'Turkey Sandwich',              'Күркетауықты сэндвич',         1390, '/eats/eat-22.webp', 380, 22.0, 16.0, 32.0, false, [],          false, 'Сэндвич с копчёной индейкой, авокадо и зеленью на чиабатте.', '210г'],
  ['sandwiches', 'club-sandwich',          'Клаб-сэндвич',                   'Club Sandwich',                'Клаб-сэндвич',                 1590, '/eats/eat-23.webp', 520, 28.0, 24.0, 42.0, true,  ['HIT'],     false, 'Трёхслойный сэндвич с курицей, беконом, яйцом и салатом.', '280г'],
  ['sandwiches', 'avocado-toast',          'Тост с авокадо и яйцом',         'Avocado Toast',                'Авокадолы тост',               1290, '/eats/eat-24.webp', 340, 14.0, 18.0, 28.0, false, ['NEW'],     true,  'Хрустящий тост с авокадо, яйцом пашот и микрозеленью.', '180г'],
  ['sandwiches', 'panini-salmon',          'Панини с лососем',               'Salmon Panini',                'Лососьты панини',              1690, '/eats/eat-25.webp', 410, 24.0, 20.0, 30.0, false, ['PREMIUM'], false, 'Панини с лососем, сливочным сыром и каперсами.', '220г'],
  ['sandwiches', 'tuna-sandwich',          'Сэндвич с тунцом',              'Tuna Sandwich',                'Тунецті сэндвич',              1290, '/eats/eat-26.webp', 360, 20.0, 14.0, 34.0, false, [],          false, 'Сэндвич с тунцом, кукурузой, огурцом и лёгким майонезом.', '200г'],
  ['sandwiches', 'bagel-ham-cheese',       'Бейгл с ветчиной и сыром',      'Ham & Cheese Bagel',           'Ветчиналы-ірімшікті бейгл',    1190, '/eats/eat-27.webp', 400, 20.0, 18.0, 36.0, false, [],          false, 'Классический бейгл с ветчиной, сыром чеддер и салатом.', '190г'],
  ['sandwiches', 'chicken-wrap',           'Врап с курицей',                 'Chicken Wrap',                 'Тауықты врап',                 1190, '/eats/eat-28.webp', 390, 24.0, 16.0, 36.0, false, [],          false, 'Тортилья с куриным филе, овощами и соусом цезарь.', '220г'],
  ['sandwiches', 'quesadilla',             'Кесадилья с курицей и сыром',    'Chicken Quesadilla',           'Тауықты кесадилья',            1390, '/eats/eat-29.webp', 470, 26.0, 22.0, 38.0, false, ['NEW'],     true,  'Хрустящая кесадилья с куриным филе, сыром и сальсой.', '230г'],

  // ── Десерты ──
  ['desserts', 'cheesecake-ny',            'Чизкейк Нью-Йорк',              'New York Cheesecake',          'Нью-Йорк чизкейк',            1290, '/eats/eat-30.webp', 380, 7.0, 24.0, 34.0, true,  ['HIT'],     false, 'Классический сливочный чизкейк с бисквитной основой.', '150г'],
  ['desserts', 'tiramisu',                 'Тирамису',                       'Tiramisu',                     'Тирамису',                     1390, '/eats/eat-31.webp', 350, 7.5, 20.0, 36.0, true,  ['HIT'],     false, 'Итальянский десерт с маскарпоне, кофе и какао.', '140г'],
  ['desserts', 'medovik',                  'Медовик',                        'Honey Cake',                   'Бал торт',                     990,  '/eats/eat-32.webp', 340, 5.5, 16.0, 44.0, false, [],          false, 'Нежный медовый торт со сметанным кремом.', '130г'],
  ['desserts', 'napoleon',                 'Наполеон',                       'Napoleon Cake',                'Наполеон',                     1090, '/eats/eat-33.webp', 370, 6.0, 20.0, 40.0, false, [],          false, 'Хрустящий слоёный торт с нежным заварным кремом.', '140г'],
  ['desserts', 'panna-cotta-mango',        'Панна котта с манго',            'Mango Panna Cotta',            'Манголы панна котта',          890,  '/eats/eat-34.webp', 260, 4.0, 16.0, 26.0, false, ['NEW'],     true,  'Итальянский сливочный десерт с манговым кули.', '120г'],
  ['desserts', 'macaron-set',              'Макарон ассорти (6 шт)',         'Macaron Assorted (6pc)',        'Макарон жиынтығы (6 дана)',    1990, '/eats/eat-35.webp', 180, 3.5, 8.0, 24.0, false, ['SET'],     false, 'Набор из 6 макарон: фисташка, малина, шоколад, ваниль, лаванда, манго.', '6×18г'],
  ['desserts', 'berry-trifle',             'Трайфл ягодный',                'Berry Trifle',                 'Жидекті трайфл',               890,  '/eats/eat-36.webp', 280, 5.0, 14.0, 32.0, false, [],          false, 'Слоёный десерт с ягодами, кремом и бисквитной крошкой.', '150г'],
  ['desserts', 'cake-pops',               'Кейк-попс (3 шт)',              'Cake Pops (3pc)',              'Кейк-попс (3 дана)',           690,  '/eats/eat-37.webp', 220, 3.0, 12.0, 26.0, false, [],          false, 'Мини-кейки на палочке: шоколад, ваниль, ягодный.', '3×35г'],
  ['desserts', 'fruit-sorbet',            'Сорбет фруктовый',              'Fruit Sorbet',                 'Жемісті сорбет',               790,  '/eats/eat-38.webp', 120, 0.5, 0.2, 28.0, false, ['NEW'],     true,  'Освежающий фруктовый сорбет — манго-маракуйя.', '130г'],
];

async function seed() {
  console.log('🔄 Seeding Firestore menu data...\n');

  // ── 1. Delete old data ──
  console.log('🗑️  Clearing old menuCategories...');
  const oldCats = await db.collection('menuCategories').get();
  const catBatch = db.batch();
  oldCats.forEach(d => catBatch.delete(d.ref));
  await catBatch.commit();
  console.log(`   Deleted ${oldCats.size} old categories`);

  console.log('🗑️  Clearing old menuItems...');
  const oldItems = await db.collection('menuItems').get();
  // Firestore batch limit is 500
  const chunks = [];
  const docs = oldItems.docs;
  for (let i = 0; i < docs.length; i += 400) {
    chunks.push(docs.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const b = db.batch();
    chunk.forEach(d => b.delete(d.ref));
    await b.commit();
  }
  console.log(`   Deleted ${oldItems.size} old items`);

  // ── 2. Write drink categories ──
  console.log('\n📂 Writing drink categories...');
  for (const cat of categories) {
    const { id, ...data } = cat;
    await db.collection('menuCategories').doc(id).set(data);
    console.log(`   ✅ ${id} → ${data.name}`);
  }

  // ── 2b. Write food categories ──
  console.log('\n📂 Writing food categories...');
  for (const cat of foodCategories) {
    const { id, ...data } = cat;
    await db.collection('menuCategories').doc(id).set(data);
    console.log(`   ✅ ${id} → ${data.name}`);
  }

  // ── 3. Write drink items ──
  console.log('\n📝 Writing drink items...');
  for (const row of products) {
    const [categoryId, docId, i18nKey, price, image, energy, protein, fat, carbs, isPopular, badges, isNew] = row;

    const nameRu  = resolve(ru, `menu.${i18nKey}.name`);
    const nameEn  = resolve(en, `menu.${i18nKey}.name`);
    const nameKz  = resolve(kz, `menu.${i18nKey}.name`);
    const descRu  = resolve(ru, `menu.${i18nKey}.description`) || '';
    const descEn  = resolve(en, `menu.${i18nKey}.description`) || '';
    const descKz  = resolve(kz, `menu.${i18nKey}.description`) || '';

    const doc = {
      categoryId,
      name: nameRu,
      nameEn,
      nameKz,
      description: descRu,
      descriptionEn: descEn,
      descriptionKz: descKz,
      price,
      image,
      energy,
      protein,
      fat,
      carbs,
      isAvailable: true,
      isPopular: !!isPopular,
      isNew: !!isNew,
      badges: badges || [],
      sizes: [],
    };

    await db.collection('menuItems').doc(docId).set(doc);
    console.log(`   ✅ ${docId} → ${nameRu} (${price} ₸)`);
  }

  // ── 3b. Write food items ──
  console.log('\n🍽️  Writing food items...');
  for (const row of foodProducts) {
    const [categoryId, docId, name, nameEn, nameKz, price, image, energy, protein, fat, carbs, isPopular, badges, isNew, description, weight] = row;

    const doc = {
      categoryId,
      name,
      nameEn,
      nameKz,
      description: description || '',
      descriptionEn: '',
      descriptionKz: '',
      price,
      image,
      energy,
      protein,
      fat,
      carbs,
      weight: weight || '',
      isAvailable: true,
      isPopular: !!isPopular,
      isNew: !!isNew,
      badges: badges || [],
      sizes: [],
    };

    await db.collection('menuItems').doc(docId).set(doc);
    console.log(`   ✅ ${docId} → ${name} (${price} ₸)`);
  }

  const totalCats = categories.length + foodCategories.length;
  const totalItems = products.length + foodProducts.length;
  console.log(`\n🎉 Done! ${totalCats} categories + ${totalItems} items written.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
