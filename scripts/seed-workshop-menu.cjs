/**
 * Seed Firestore workshop_categories + workshop_products
 * 
 * Populates the workshop (цех) menu with production items.
 * These are wholesale items the workshop produces for café outlets.
 *
 * Usage:  node scripts/seed-workshop-menu.cjs
 */

const admin = require('firebase-admin');

// ─── Firebase Admin init ───────────────────────────────
const serviceAccount = require('../functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Categories (цех) ──────────────────────────────────
const categories = [
  {
    id: 'croissants',
    name: { ru: 'Круассаны', kz: 'Круассандар', en: 'Croissants' },
    icon: '🥐',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'bakery',
    name: { ru: 'Выпечка', kz: 'Наубайхана', en: 'Bakery' },
    icon: '🧁',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'sandwiches',
    name: { ru: 'Сэндвичи', kz: 'Сэндвичтер', en: 'Sandwiches' },
    icon: '🥪',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'desserts',
    name: { ru: 'Десерты', kz: 'Десерттер', en: 'Desserts' },
    icon: '🍰',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'dough',
    name: { ru: 'Заготовки и тесто', kz: 'Дайындамалар', en: 'Dough & Prep' },
    icon: '🫓',
    sortOrder: 5,
    isActive: true,
  },
];

// ─── Products (цех — оптовые цены) ─────────────────────
// image paths point to /eats/ (reusing café images) or /workshop/ for new ones
const products = [
  // ── Круассаны ──
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан классический', kz: 'Классикалық круассан', en: 'Classic Croissant' },
    description: { ru: 'Воздушный слоёный круассан, 85г', kz: 'Ауалы қабатты круассан, 85г', en: 'Flaky butter croissant, 85g' },
    price: 450,
    unit: 'шт',
    image: '/eats/eat-01.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с шоколадом', kz: 'Шоколадты круассан', en: 'Chocolate Croissant' },
    description: { ru: 'Бельгийский шоколад, 95г', kz: 'Бельгиялық шоколад, 95г', en: 'Belgian chocolate filling, 95g' },
    price: 500,
    unit: 'шт',
    image: '/eats/eat-02.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан миндальный', kz: 'Бадамды круассан', en: 'Almond Croissant' },
    description: { ru: 'С миндальным кремом и лепестками, 110г', kz: 'Бадам кремімен, 110г', en: 'Almond cream & flakes, 110g' },
    price: 550,
    unit: 'шт',
    image: '/eats/eat-03.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с ветчиной и сыром', kz: 'Ірімшікті-ветчиналы круассан', en: 'Ham & Cheese Croissant' },
    description: { ru: 'Сытный, 130г', kz: 'Тамақтандыратын, 130г', en: 'Savory, 130g' },
    price: 600,
    unit: 'шт',
    image: '/eats/eat-04.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с лососем', kz: 'Лососьты круассан', en: 'Salmon Croissant' },
    description: { ru: 'Лосось, сливочный сыр, руккола, 140г', kz: 'Лосось, кілегей ірімшігі, 140г', en: 'Salmon, cream cheese, arugula, 140g' },
    price: 750,
    unit: 'шт',
    image: '/eats/eat-05.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с фисташковым кремом', kz: 'Фисташкалы круассан', en: 'Pistachio Croissant' },
    description: { ru: 'Фисташковый крем, 105г', kz: 'Фисташка кремі, 105г', en: 'Pistachio cream, 105g' },
    price: 650,
    unit: 'шт',
    image: '/eats/eat-06.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с малиновым джемом', kz: 'Таңқурайлы круассан', en: 'Raspberry Jam Croissant' },
    description: { ru: 'Домашний малиновый джем, 95г', kz: 'Үйдегі таңқурай джемі, 95г', en: 'Homemade raspberry jam, 95g' },
    price: 480,
    unit: 'шт',
    image: '/eats/eat-07.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с карамелью', kz: 'Карамельді круассан', en: 'Caramel Croissant' },
    description: { ru: 'Солёная карамель + сливочный крем, 100г', kz: 'Тұзды карамель + кілегей крем, 100г', en: 'Salted caramel & cream, 100g' },
    price: 530,
    unit: 'шт',
    image: '/eats/eat-08.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'croissants',
    name: { ru: 'Круассан с курицей и песто', kz: 'Тауықты-песто круассан', en: 'Chicken Pesto Croissant' },
    description: { ru: 'Куриное филе, песто, вяленые томаты, 145г', kz: 'Тауық филесі, песто, 145г', en: 'Chicken, pesto, sun-dried tomato, 145g' },
    price: 650,
    unit: 'шт',
    image: '/eats/eat-09.webp',
    minOrder: 3,
    isAvailable: true,
  },

  // ── Выпечка ──
  {
    categoryId: 'bakery',
    name: { ru: 'Синнабон классический', kz: 'Классикалық Синнабон', en: 'Classic Cinnabon' },
    description: { ru: 'Булочка с корицей и глазурью, 140г', kz: 'Даршын булочкасы, 140г', en: 'Cinnamon roll with frosting, 140g' },
    price: 600,
    unit: 'шт',
    image: '/eats/eat-11.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Датская булочка с кремом', kz: 'Дат тоқашы крем', en: 'Danish Custard Pastry' },
    description: { ru: 'Слоёная с ванильным кремом, 110г', kz: 'Ванильді кремді, 110г', en: 'Puff pastry with vanilla custard, 110g' },
    price: 450,
    unit: 'шт',
    image: '/eats/eat-12.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Маффин шоколадный', kz: 'Шоколадты маффин', en: 'Chocolate Muffin' },
    description: { ru: 'С жидким центром, 120г', kz: 'Сұйық орталығымен, 120г', en: 'Molten center, 120g' },
    price: 400,
    unit: 'шт',
    image: '/eats/eat-13.webp',
    minOrder: 6,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Маффин с ягодами', kz: 'Жидекті маффин', en: 'Berry Muffin' },
    description: { ru: 'Голубика, малина, ежевика, 115г', kz: 'Көк жидек, таңқурай, 115г', en: 'Blueberry, raspberry, blackberry, 115g' },
    price: 380,
    unit: 'шт',
    image: '/eats/eat-14.webp',
    minOrder: 6,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Кекс лимонный', kz: 'Лимонды кекс', en: 'Lemon Cake' },
    description: { ru: 'С цитрусовой глазурью, 100г', kz: 'Цитрус глазурьімен, 100г', en: 'With citrus glaze, 100g' },
    price: 350,
    unit: 'шт',
    image: '/eats/eat-15.webp',
    minOrder: 6,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Печенье овсяное с шоколадом', kz: 'Шоколадты сулы печенье', en: 'Oat Chocolate Cookie' },
    description: { ru: 'Хрустящее с тёмным шоколадом, 70г', kz: 'Қытырлақ қара шоколадпен, 70г', en: 'Crunchy with dark chocolate, 70g' },
    price: 250,
    unit: 'шт',
    image: '/eats/eat-16.webp',
    minOrder: 10,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Брауни', kz: 'Брауни', en: 'Brownie' },
    description: { ru: 'Тягучий шоколадный с грецким орехом, 100г', kz: 'Шоколадты грек жаңғағымен, 100г', en: 'Fudgy chocolate with walnut, 100g' },
    price: 450,
    unit: 'шт',
    image: '/eats/eat-17.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Эклер ванильный', kz: 'Ванильді эклер', en: 'Vanilla Eclair' },
    description: { ru: 'С ванильным кремом и шоколадной глазурью, 90г', kz: 'Ванильді крем + шоколад глазурь, 90г', en: 'Vanilla cream & chocolate glaze, 90g' },
    price: 400,
    unit: 'шт',
    image: '/eats/eat-18.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Шу с кремом', kz: 'Кремді шу', en: 'Cream Puff' },
    description: { ru: 'Профитроль с кремом патисьер, 80г', kz: 'Крем патисьер профитрольі, 80г', en: 'Profiterole with pastry cream, 80g' },
    price: 350,
    unit: 'шт',
    image: '/eats/eat-19.webp',
    minOrder: 6,
    isAvailable: true,
  },
  {
    categoryId: 'bakery',
    name: { ru: 'Тарт с ягодами', kz: 'Жидекті тарт', en: 'Berry Tart' },
    description: { ru: 'Песочный с заварным кремом, 110г', kz: 'Құмдақты крем патисьерімен, 110г', en: 'Shortcrust with custard & berries, 110g' },
    price: 500,
    unit: 'шт',
    image: '/eats/eat-20.webp',
    minOrder: 5,
    isAvailable: true,
  },

  // ── Сэндвичи ──
  {
    categoryId: 'sandwiches',
    name: { ru: 'Панини с моцареллой и песто', kz: 'Моцарелла-песто панини', en: 'Mozzarella Pesto Panini' },
    description: { ru: 'Моцарелла, вяленые томаты, песто, 200г', kz: 'Моцарелла, кептірілген томат, 200г', en: 'Mozzarella, sun-dried tomato, pesto, 200g' },
    price: 750,
    unit: 'шт',
    image: '/eats/eat-21.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'sandwiches',
    name: { ru: 'Сэндвич с индейкой', kz: 'Күркетауықты сэндвич', en: 'Turkey Sandwich' },
    description: { ru: 'Копчёная индейка, авокадо на чиабатте, 210г', kz: 'Ысталған күркетауық, авокадо, 210г', en: 'Smoked turkey, avocado on ciabatta, 210g' },
    price: 700,
    unit: 'шт',
    image: '/eats/eat-22.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'sandwiches',
    name: { ru: 'Клаб-сэндвич', kz: 'Клаб-сэндвич', en: 'Club Sandwich' },
    description: { ru: 'Курица, бекон, яйцо, салат, 280г', kz: 'Тауық, бекон, жұмыртқа, 280г', en: 'Chicken, bacon, egg, salad, 280g' },
    price: 800,
    unit: 'шт',
    image: '/eats/eat-23.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'sandwiches',
    name: { ru: 'Тост с авокадо и яйцом', kz: 'Авокадолы тост', en: 'Avocado Toast' },
    description: { ru: 'Авокадо, яйцо пашот, микрозелень, 180г', kz: 'Авокадо, пашот жұмыртқа, 180г', en: 'Avocado, poached egg, microgreens, 180g' },
    price: 650,
    unit: 'шт',
    image: '/eats/eat-24.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'sandwiches',
    name: { ru: 'Врап с курицей', kz: 'Тауықты врап', en: 'Chicken Wrap' },
    description: { ru: 'Тортилья, курица, овощи, цезарь, 220г', kz: 'Тортилья, тауық, көкөністер, 220г', en: 'Tortilla, chicken, veggies, Caesar, 220g' },
    price: 600,
    unit: 'шт',
    image: '/eats/eat-28.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'sandwiches',
    name: { ru: 'Кесадилья с курицей', kz: 'Тауықты кесадилья', en: 'Chicken Quesadilla' },
    description: { ru: 'Куриное филе, сыр, сальса, 230г', kz: 'Тауық филесі, ірімшік, сальса, 230г', en: 'Chicken, cheese, salsa, 230g' },
    price: 700,
    unit: 'шт',
    image: '/eats/eat-29.webp',
    minOrder: 3,
    isAvailable: true,
  },

  // ── Десерты ──
  {
    categoryId: 'desserts',
    name: { ru: 'Чизкейк Нью-Йорк', kz: 'Нью-Йорк чизкейк', en: 'New York Cheesecake' },
    description: { ru: 'Сливочный с бисквитной основой, 150г', kz: 'Кілегейлі бисквит негізімен, 150г', en: 'Creamy with biscuit base, 150g' },
    price: 650,
    unit: 'шт',
    image: '/eats/eat-30.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Тирамису', kz: 'Тирамису', en: 'Tiramisu' },
    description: { ru: 'Маскарпоне, кофе, какао, 140г', kz: 'Маскарпоне, кофе, какао, 140г', en: 'Mascarpone, coffee, cocoa, 140g' },
    price: 700,
    unit: 'шт',
    image: '/eats/eat-31.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Медовик', kz: 'Бал торт', en: 'Honey Cake' },
    description: { ru: 'Со сметанным кремом, 130г', kz: 'Қаймақ кремімен, 130г', en: 'With sour cream frosting, 130g' },
    price: 500,
    unit: 'шт',
    image: '/eats/eat-32.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Наполеон', kz: 'Наполеон', en: 'Napoleon Cake' },
    description: { ru: 'Слоёный с заварным кремом, 140г', kz: 'Қабатты крем патисьерімен, 140г', en: 'Puff pastry with custard, 140g' },
    price: 550,
    unit: 'шт',
    image: '/eats/eat-33.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Панна котта с манго', kz: 'Манголы панна котта', en: 'Mango Panna Cotta' },
    description: { ru: 'Сливочная с манговым кули, 120г', kz: 'Кілегейлі манго кулимен, 120г', en: 'Creamy with mango coulis, 120g' },
    price: 450,
    unit: 'шт',
    image: '/eats/eat-34.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Макарон ассорти (6 шт)', kz: 'Макарон жиынтығы (6 дана)', en: 'Macaron Assorted (6pc)' },
    description: { ru: 'Фисташка, малина, шоколад, ваниль, лаванда, манго', kz: 'Фисташка, таңқурай, шоколад, ваниль, лаванда, манго', en: 'Pistachio, raspberry, chocolate, vanilla, lavender, mango' },
    price: 1000,
    unit: 'шт',
    image: '/eats/eat-35.webp',
    minOrder: 3,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Трайфл ягодный', kz: 'Жидекті трайфл', en: 'Berry Trifle' },
    description: { ru: 'Ягоды, крем, бисквит, 150г', kz: 'Жидектер, крем, бисквит, 150г', en: 'Berries, cream, sponge, 150g' },
    price: 450,
    unit: 'шт',
    image: '/eats/eat-36.webp',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'desserts',
    name: { ru: 'Сорбет фруктовый', kz: 'Жемісті сорбет', en: 'Fruit Sorbet' },
    description: { ru: 'Манго-маракуйя, 130г', kz: 'Манго-маракуйя, 130г', en: 'Mango-passionfruit, 130g' },
    price: 400,
    unit: 'шт',
    image: '/eats/eat-38.webp',
    minOrder: 5,
    isAvailable: true,
  },

  // ── Заготовки и тесто ──
  {
    categoryId: 'dough',
    name: { ru: 'Тесто круассанное (заморозка)', kz: 'Круассан қамыры (мұздатылған)', en: 'Croissant Dough (frozen)' },
    description: { ru: 'Слоёное дрожжевое, 5 кг', kz: 'Қабатты ашытқылы, 5 кг', en: 'Laminated yeast dough, 5 kg' },
    price: 5500,
    unit: 'кг',
    image: '',
    minOrder: 5,
    isAvailable: true,
  },
  {
    categoryId: 'dough',
    name: { ru: 'Крем патисьер', kz: 'Крем патисьер', en: 'Pastry Cream' },
    description: { ru: 'Ванильный заварной крем, 1 кг', kz: 'Ванильді пісірілген крем, 1 кг', en: 'Vanilla custard, 1 kg' },
    price: 2800,
    unit: 'кг',
    image: '',
    minOrder: 1,
    isAvailable: true,
  },
  {
    categoryId: 'dough',
    name: { ru: 'Фисташковый крем', kz: 'Фисташка кремі', en: 'Pistachio Cream' },
    description: { ru: 'Для начинок, 500г', kz: 'Ішкі толтыру үшін, 500г', en: 'For fillings, 500g' },
    price: 3500,
    unit: 'кг',
    image: '',
    minOrder: 1,
    isAvailable: true,
  },
  {
    categoryId: 'dough',
    name: { ru: 'Карамель солёная', kz: 'Тұзды карамель', en: 'Salted Caramel' },
    description: { ru: 'Готовая, 500г', kz: 'Дайын, 500г', en: 'Ready-made, 500g' },
    price: 2200,
    unit: 'кг',
    image: '',
    minOrder: 1,
    isAvailable: true,
  },
];

async function seed() {
  console.log('🔄 Seeding workshop menu...\n');

  // ── 1. Clear old data ──
  console.log('🗑️  Clearing old workshop_categories...');
  const oldCats = await db.collection('workshop_categories').get();
  const catBatch = db.batch();
  oldCats.forEach(d => catBatch.delete(d.ref));
  await catBatch.commit();
  console.log(`   Deleted ${oldCats.size} old categories`);

  console.log('🗑️  Clearing old workshop_products...');
  const oldProducts = await db.collection('workshop_products').get();
  const prodBatch = db.batch();
  oldProducts.forEach(d => prodBatch.delete(d.ref));
  await prodBatch.commit();
  console.log(`   Deleted ${oldProducts.size} old products`);

  // ── 2. Write categories ──
  console.log('\n📂 Writing workshop categories...');
  for (const cat of categories) {
    const { id, ...data } = cat;
    await db.collection('workshop_categories').doc(id).set(data);
    console.log(`   ✅ ${id} → ${data.name.ru}`);
  }

  // ── 3. Write products ──
  console.log('\n📝 Writing workshop products...');
  const now = admin.firestore.Timestamp.now();
  for (const product of products) {
    const doc = {
      ...product,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection('workshop_products').add(doc);
    console.log(`   ✅ ${ref.id} → ${product.name.ru} (${product.price} ₸/${product.unit})`);
  }

  console.log(`\n🎉 Done! ${categories.length} categories + ${products.length} products written.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
