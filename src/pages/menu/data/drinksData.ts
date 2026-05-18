export interface Recommendation {
  id: number;
  title: string; // Ключ для t()
  image: string;
}

export interface Modifier {
  id: number;
  title: string;
  type: 'select' | 'multi' | 'toggle' | 'slider';
  options?: string[];
  default: string | string[] | boolean | number;
  min?: number;
  max?: number;
}

export interface TogetherBetter {
  id: number;
  name: string;
  image: string;
}

export interface Review {
  user: string;
  text: string;
  rating?: number;
}

export interface NutritionInfo {
  energy: string; // ккал
  protein: string; // г
  fat: string;     // г
  carbs: string;   // г
}

export interface FoodPairing {
  id: number;
  name: string;
  price: number;
  image: string;
}

export interface Product {
  id: number;
  name: string; // Ключ для t()
  price: number;
  description: string; // Ключ для t()
  ingredients: string[]; // Массив ключей для t()
  recommendation: string; // Ключ для t()
  recommendations?: Recommendation[];
  image: string;
  video?: string; // URL видео для модалки (формат MP4/WebM)
  isNew?: boolean;
  isHit?: boolean;
  energy: number;
  protein: number;
  fat: number;
  carbs: number;
  caffeine?: number;
  modifiers: Modifier[];
  togetherBetter: TogetherBetter[];
  badges: string[];
  promo?: string;
  bonusPay: number;
  rating: number;
  reviews: Review[];
  allergens: string[];
  shortDesc?: string;
  nutrition?: NutritionInfo; // сделать optional для fallback
  pairings?: FoodPairing[];
}

export interface DrinkCategory {
  id: number;
  title: string; // Ключ для t()
  image: string;
  products: Product[];
  icon?: React.ReactNode;
}

export const drinkCategories: DrinkCategory[] = [
  /* ══════════════════════════════════════════════════════════
     1. КОФЕ — основные напитки
     ══════════════════════════════════════════════════════════ */
  {
    id: 1,
    title: 'menu.categories.coffee',
    image: '/drinks/cappuccino.webp',
    products: [
      {
        id: 101,
        name: 'menu.cappuccino.name',
        price: 940,
        description: 'menu.cappuccino.description',
        ingredients: ['menu.cappuccino.ingredients.0', 'menu.cappuccino.ingredients.1'],
        recommendation: 'menu.cappuccino.recommendation',
        image: '/drinks/cappuccino.webp',
        isNew: false,
        isHit: true,
        energy: 150, protein: 8.5, fat: 8.2, carbs: 12.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4', '0.5'], default: '0.3' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое', 'Безлактозное'], default: 'Обычное' },
          { id: 3, title: 'Сироп', type: 'multi', options: ['Ваниль', 'Карамель', 'Орех'], default: [] }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 140,
        rating: 4.7,
        reviews: [
          { user: 'Айжан', text: 'Лучший капучино в городе!', rating: 5 },
          { user: 'Арман', text: 'Пенка просто идеальная', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 102,
        name: 'menu.latte.name',
        price: 940,
        description: 'menu.latte.description',
        ingredients: ['menu.latte.ingredients.0', 'menu.latte.ingredients.1'],
        recommendation: 'menu.latte.recommendation',
        image: '/drinks/latte.webp',
        isNew: false,
        isHit: true,
        energy: 158, protein: 8.2, fat: 8.1, carbs: 12.6, caffeine: 75,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4', '0.5'], default: '0.3' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое', 'Миндальное'], default: 'Обычное' },
          { id: 3, title: 'Сироп', type: 'multi', options: ['Ваниль', 'Карамель', 'Лесной орех'], default: [] }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 140,
        rating: 4.6,
        reviews: [
          { user: 'Айгуль', text: 'Очень нежный вкус', rating: 5 },
          { user: 'Мадина', text: 'Мой любимый кофе!', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 103,
        name: 'menu.caramelatte.name',
        price: 1300,
        description: 'menu.caramelatte.description',
        ingredients: ['menu.caramelatte.ingredients.0', 'menu.caramelatte.ingredients.1', 'menu.caramelatte.ingredients.2'],
        recommendation: 'menu.caramelatte.recommendation',
        image: '/drinks/caramelatte.webp',
        isNew: false,
        isHit: false,
        energy: 210, protein: 7.8, fat: 9.0, carbs: 25.0, caffeine: 75,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 195,
        rating: 4.5,
        reviews: [
          { user: 'Дана', text: 'Нежная карамель, очень вкусно', rating: 5 },
          { user: 'Ерлан', text: 'Сладко и приятно', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 104,
        name: 'menu.americano.name',
        price: 780,
        description: 'menu.americano.description',
        ingredients: ['menu.americano.ingredients.0', 'menu.americano.ingredients.1'],
        recommendation: 'menu.americano.recommendation',
        image: '/drinks/americano.webp',
        isNew: false,
        isHit: false,
        energy: 20, protein: 0.8, fat: 0.3, carbs: 1.2, caffeine: 100,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4', '0.5'], default: '0.3' },
          { id: 2, title: 'Сахар', type: 'toggle', default: false },
          { id: 3, title: 'Молоко', type: 'select', options: ['Без молока', 'Обычное', 'Овсяное'], default: 'Без молока' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 120,
        rating: 4.5,
        reviews: [
          { user: 'Максат', text: 'Хороший американо, бодрит отлично', rating: 4 },
          { user: 'Лаура', text: 'Идеально для утра', rating: 5 }
        ],
        allergens: []
      },
      {
        id: 105,
        name: 'menu.raf_coffee.name',
        price: 1480,
        description: 'menu.raf_coffee.description',
        ingredients: ['menu.raf_coffee.ingredients.0', 'menu.raf_coffee.ingredients.1', 'menu.raf_coffee.ingredients.2'],
        recommendation: 'menu.raf_coffee.recommendation',
        image: '/drinks/raf-coffee.webp',
        isNew: false,
        isHit: true,
        energy: 280, protein: 6.5, fat: 14.0, carbs: 28.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Сироп', type: 'select', options: ['Ваниль', 'Карамель', 'Лаванда'], default: 'Ваниль' }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 220,
        rating: 4.6,
        reviews: [
          { user: 'Гульнара', text: 'Нежный сливочный вкус', rating: 5 },
          { user: 'Санжар', text: 'Лучший раф в городе', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 106,
        name: 'menu.mokkachino.name',
        price: 1180,
        description: 'menu.mokkachino.description',
        ingredients: ['menu.mokkachino.ingredients.0', 'menu.mokkachino.ingredients.1', 'menu.mokkachino.ingredients.2'],
        recommendation: 'menu.mokkachino.recommendation',
        image: '/drinks/mokkachino.webp',
        isNew: false,
        isHit: false,
        energy: 198, protein: 9.1, fat: 9.8, carbs: 18.4, caffeine: 85,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' },
          { id: 3, title: 'Шоколад', type: 'select', options: ['Молочный', 'Темный', 'Белый'], default: 'Молочный' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 180,
        rating: 4.3,
        reviews: [
          { user: 'Алия', text: 'Сладко и вкусно', rating: 4 },
          { user: 'Батыр', text: 'Отличный десертный кофе', rating: 4 }
        ],
        allergens: ['Молоко', 'Глютен']
      },
      {
        id: 107,
        name: 'menu.flat_white.name',
        price: 980,
        description: 'menu.flat_white.description',
        ingredients: ['menu.flat_white.ingredients.0', 'menu.flat_white.ingredients.1'],
        recommendation: 'menu.flat_white.recommendation',
        image: '/drinks/flat-white.webp',
        isNew: false,
        isHit: false,
        energy: 135, protein: 7.8, fat: 7.5, carbs: 10.2, caffeine: 95,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 150,
        rating: 4.4,
        reviews: [
          { user: 'Самат', text: 'Крепче капучино, мне нравится', rating: 4 },
          { user: 'Жадыра', text: 'Хороший баланс кофе и молока', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 108,
        name: 'menu.masala_coffee.name',
        price: 1380,
        description: 'menu.masala_coffee.description',
        ingredients: ['menu.masala_coffee.ingredients.0', 'menu.masala_coffee.ingredients.1', 'menu.masala_coffee.ingredients.2'],
        recommendation: 'menu.masala_coffee.recommendation',
        image: '/drinks/masala-coffee.webp',
        isNew: false,
        isHit: false,
        energy: 220, protein: 3.2, fat: 8.5, carbs: 28.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' },
          { id: 2, title: 'Специи', type: 'multi', options: ['Корица', 'Имбирь', 'Кардамон'], default: ['Корица'] }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 210,
        rating: 4.2,
        reviews: [
          { user: 'Гульнара', text: 'Очень ароматный, согревает', rating: 4 },
          { user: 'Бахтияр', text: 'Интересное сочетание специй', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 109,
        name: 'menu.glintveyn_coffee.name',
        price: 1540,
        description: 'menu.glintveyn_coffee.description',
        ingredients: ['menu.glintveyn_coffee.ingredients.0', 'menu.glintveyn_coffee.ingredients.1', 'menu.glintveyn_coffee.ingredients.2'],
        recommendation: 'menu.glintveyn_coffee.recommendation',
        image: '/drinks/glintveyn-coffee.webp',
        isNew: true,
        isHit: false,
        energy: 185, protein: 1.5, fat: 0.5, carbs: 32.0, caffeine: 60,
        modifiers: [
          { id: 1, title: 'Сладость', type: 'slider', min: 0, max: 3, default: 2 }
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 230,
        rating: 4.3,
        reviews: [
          { user: 'Назира', text: 'Необычный и согревающий', rating: 4 },
          { user: 'Ернур', text: 'Зимний хит!', rating: 5 }
        ],
        allergens: []
      },
      {
        id: 110,
        name: 'menu.matcha_latte.name',
        price: 1150,
        description: 'menu.matcha_latte.description',
        ingredients: ['menu.matcha_latte.ingredients.0', 'menu.matcha_latte.ingredients.1', 'menu.matcha_latte.ingredients.2'],
        recommendation: 'menu.matcha_latte.recommendation',
        image: '/drinks/matcha-latte.webp',
        isNew: false,
        isHit: true,
        energy: 142, protein: 6.8, fat: 7.2, carbs: 14.6, caffeine: 35,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое', 'Миндальное'], default: 'Овсяное' },
          { id: 2, title: 'Сладость', type: 'slider', min: 0, max: 3, default: 1 }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 170,
        rating: 4.7,
        reviews: [
          { user: 'Аида', text: 'Очень необычный и вкусный!', rating: 5 },
          { user: 'Камила', text: 'Нежный вкус, рекомендую', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 111,
        name: 'menu.chai_tea.name',
        price: 670,
        description: 'menu.chai_tea.description',
        ingredients: ['menu.chai_tea.ingredients.0'],
        recommendation: 'menu.chai_tea.recommendation',
        image: '/drinks/chai-tea.webp',
        isNew: false,
        isHit: false,
        energy: 5, protein: 0.1, fat: 0.0, carbs: 1.0, caffeine: 25,
        modifiers: [
          { id: 1, title: 'Вид', type: 'select', options: ['Чёрный', 'Зелёный', 'Травяной'], default: 'Чёрный' },
          { id: 2, title: 'Сахар', type: 'toggle', default: false }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 100,
        rating: 4.0,
        reviews: [
          { user: 'Алтынай', text: 'Хороший чай, правильно заваренный', rating: 4 },
          { user: 'Марат', text: 'Вкусный шай', rating: 4 }
        ],
        allergens: []
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     2. RAF ROYAL — авторские раф-кофе
     ══════════════════════════════════════════════════════════ */
  {
    id: 2,
    title: 'menu.categories.raf_royal',
    image: '/drinks/raf-arahis.webp',
    products: [
      {
        id: 201,
        name: 'menu.raf_arahis.name',
        price: 1700,
        description: 'menu.raf_arahis.description',
        ingredients: ['menu.raf_arahis.ingredients.0', 'menu.raf_arahis.ingredients.1', 'menu.raf_arahis.ingredients.2'],
        recommendation: 'menu.raf_arahis.recommendation',
        image: '/drinks/raf-arahis.webp',
        isNew: false,
        isHit: true,
        energy: 310, protein: 8.0, fat: 16.0, carbs: 30.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 255,
        rating: 4.8,
        reviews: [
          { user: 'Дарын', text: 'Арахисовый раф — бомба!', rating: 5 },
          { user: 'Асель', text: 'Самый вкусный раф', rating: 5 }
        ],
        allergens: ['Молоко', 'Арахис']
      },
      {
        id: 202,
        name: 'menu.raf_lavanda.name',
        price: 1700,
        description: 'menu.raf_lavanda.description',
        ingredients: ['menu.raf_lavanda.ingredients.0', 'menu.raf_lavanda.ingredients.1', 'menu.raf_lavanda.ingredients.2'],
        recommendation: 'menu.raf_lavanda.recommendation',
        image: '/drinks/raf-lavanda.webp',
        isNew: false,
        isHit: false,
        energy: 290, protein: 6.5, fat: 14.0, carbs: 28.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 255,
        rating: 4.5,
        reviews: [
          { user: 'Назира', text: 'Нежный цветочный аромат', rating: 5 },
          { user: 'Олжас', text: 'Очень расслабляющий', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 203,
        name: 'menu.raf_medovik.name',
        price: 1700,
        description: 'menu.raf_medovik.description',
        ingredients: ['menu.raf_medovik.ingredients.0', 'menu.raf_medовик.ingredients.1', 'menu.raf_medовик.ingredients.2'],
        recommendation: 'menu.raf_medовик.recommendation',
        image: '/drinks/raf-medovik.webp',
        isNew: true,
        isHit: false,
        energy: 305, protein: 7.0, fat: 15.0, carbs: 32.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 255,
        rating: 4.6,
        reviews: [
          { user: 'Мадина', text: 'Как десерт медовик в чашке!', rating: 5 },
          { user: 'Тимур', text: 'Сладко и по-домашнему', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 204,
        name: 'menu.raf_melon_cactus.name',
        price: 1700,
        description: 'menu.raf_melon_cactus.description',
        ingredients: ['menu.raf_melon_cactus.ingredients.0', 'menu.raf_melon_cactus.ingredients.1', 'menu.raf_melon_cactus.ingredients.2'],
        recommendation: 'menu.raf_melon_cactus.recommendation',
        image: '/drinks/raf-melon-cactus.webp',
        isNew: true,
        isHit: false,
        energy: 275, protein: 6.2, fat: 13.0, carbs: 27.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 255,
        rating: 4.4,
        reviews: [
          { user: 'Амина', text: 'Необычный свежий вкус', rating: 4 },
          { user: 'Данияр', text: 'Дыня и кактус — неожиданно вкусно', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 205,
        name: 'menu.raf_pistachio.name',
        price: 1700,
        description: 'menu.raf_pistachio.description',
        ingredients: ['menu.raf_pistachio.ingredients.0', 'menu.raf_pistachio.ingredients.1', 'menu.raf_pistachio.ingredients.2'],
        recommendation: 'menu.raf_pistachio.recommendation',
        image: '/drinks/raf-pistachio.webp',
        isNew: false,
        isHit: true,
        energy: 320, protein: 8.5, fat: 17.0, carbs: 29.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 255,
        rating: 4.9,
        reviews: [
          { user: 'Жанар', text: 'Фисташковый раф — мой фаворит!', rating: 5 },
          { user: 'Асхат', text: 'Нереально вкусный', rating: 5 }
        ],
        allergens: ['Молоко', 'Орехи']
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     3. LEMONADE — лимонады
     ══════════════════════════════════════════════════════════ */
  {
    id: 3,
    title: 'menu.categories.lemonade',
    image: '/drinks/lemonade-kiwi-mint.webp',
    products: [
      {
        id: 301,
        name: 'menu.lemonade_kiwi_mint.name',
        price: 990,
        description: 'menu.lemonade_kiwi_mint.description',
        ingredients: ['menu.lemonade_kiwi_mint.ingredients.0', 'menu.lemonade_kiwi_mint.ingredients.1', 'menu.lemonade_kiwi_mint.ingredients.2'],
        recommendation: 'menu.lemonade_kiwi_mint.recommendation',
        image: '/drinks/lemonade-kiwi-mint.webp',
        isNew: false,
        isHit: true,
        energy: 138, protein: 1.0, fat: 0.2, carbs: 33.5,
        modifiers: [
          { id: 1, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Много' },
          { id: 2, title: 'Мята', type: 'toggle', default: true }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 150,
        rating: 4.7,
        reviews: [
          { user: 'Мадина', text: 'Свежий и бодрящий!', rating: 5 },
          { user: 'Олжас', text: 'Кисло-сладкий, очень хорошо', rating: 4 }
        ],
        allergens: []
      },
      {
        id: 302,
        name: 'menu.lemonade_mango_passion.name',
        price: 990,
        description: 'menu.lemonade_mango_passion.description',
        ingredients: ['menu.lemonade_mango_passion.ingredients.0', 'menu.lemonade_mango_passion.ingredients.1', 'menu.lemonade_mango_passion.ingredients.2'],
        recommendation: 'menu.lemonade_mango_passion.recommendation',
        image: '/drinks/lemonade-mango-passion.webp',
        isNew: false,
        isHit: false,
        energy: 155, protein: 0.8, fat: 0.3, carbs: 38.0,
        modifiers: [
          { id: 1, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Много' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 150,
        rating: 4.5,
        reviews: [
          { user: 'Асем', text: 'Тропический рай!', rating: 5 },
          { user: 'Нурлан', text: 'Освежает идеально', rating: 5 }
        ],
        allergens: []
      },
      {
        id: 303,
        name: 'menu.lemonade_mango_strawberry.name',
        price: 990,
        description: 'menu.lemonade_mango_strawberry.description',
        ingredients: ['menu.lemonade_mango_strawberry.ingredients.0', 'menu.lemonade_mango_strawberry.ingredients.1', 'menu.lemonade_mango_strawberry.ingredients.2'],
        recommendation: 'menu.lemonade_mango_strawberry.recommendation',
        image: '/drinks/lemonade-mango-strawberry.webp',
        isNew: false,
        isHit: true,
        energy: 148, protein: 0.9, fat: 0.2, carbs: 36.0,
        modifiers: [
          { id: 1, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Много' }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 150,
        rating: 4.6,
        reviews: [
          { user: 'Айжан', text: 'Манго и клубника — идеальная пара', rating: 5 },
          { user: 'Дамир', text: 'Вкуснейший лимонад', rating: 5 }
        ],
        allergens: []
      },
      {
        id: 304,
        name: 'menu.lemonade_raspberry_lychee.name',
        price: 990,
        description: 'menu.lemonade_raspberry_lychee.description',
        ingredients: ['menu.lemonade_raspberry_lychee.ingredients.0', 'menu.lemonade_raspberry_lychee.ingredients.1', 'menu.lemonade_raspberry_lychee.ingredients.2'],
        recommendation: 'menu.lemonade_raspberry_lychee.recommendation',
        image: '/drinks/lemonade-raspberry-lychee.webp',
        isNew: true,
        isHit: false,
        energy: 142, protein: 0.7, fat: 0.2, carbs: 34.5,
        modifiers: [
          { id: 1, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Много' }
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 150,
        rating: 4.4,
        reviews: [
          { user: 'Лаура', text: 'Личи придает изюминку!', rating: 5 },
          { user: 'Арман', text: 'Необычный и вкусный', rating: 4 }
        ],
        allergens: []
      },
      {
        id: 305,
        name: 'menu.lemonade_peach_grapefruit.name',
        price: 990,
        description: 'menu.lemonade_peach_grapefruit.description',
        ingredients: ['menu.lemonade_peach_grapefruit.ingredients.0', 'menu.lemonade_peach_grapefruit.ingredients.1', 'menu.lemonade_peach_grapefruit.ingredients.2'],
        recommendation: 'menu.lemonade_peach_grapefruit.recommendation',
        image: '/drinks/lemonade-peach-grapefruit.webp',
        isNew: false,
        isHit: false,
        energy: 135, protein: 0.6, fat: 0.1, carbs: 33.0,
        modifiers: [
          { id: 1, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Много' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 150,
        rating: 4.3,
        reviews: [
          { user: 'Санжар', text: 'Лёгкая горчинка грейпфрута — класс', rating: 4 },
          { user: 'Айгуль', text: 'Персик очень натуральный', rating: 4 }
        ],
        allergens: []
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     4. ICE — холодные кофейные напитки
     ══════════════════════════════════════════════════════════ */
  {
    id: 4,
    title: 'menu.categories.ice_coffee',
    image: '/drinks/ice-latte.webp',
    products: [
      {
        id: 401,
        name: 'menu.ice_latte.name',
        price: 1190,
        description: 'menu.ice_latte.description',
        ingredients: ['menu.ice_latte.ingredients.0', 'menu.ice_latte.ingredients.1', 'menu.ice_latte.ingredients.2'],
        recommendation: 'menu.ice_latte.recommendation',
        image: '/drinks/ice-latte.webp',
        isNew: false,
        isHit: true,
        energy: 165, protein: 8.5, fat: 8.0, carbs: 13.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' },
          { id: 3, title: 'Сироп', type: 'multi', options: ['Ваниль', 'Карамель', 'Лесной орех'], default: [] }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 180,
        rating: 4.8,
        reviews: [
          { user: 'Дарья', text: 'Идеально для жаркого дня!', rating: 5 },
          { user: 'Нурлан', text: 'Очень вкусный и освежающий', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 402,
        name: 'menu.ice_americano.name',
        price: 980,
        description: 'menu.ice_americano.description',
        ingredients: ['menu.ice_americano.ingredients.0', 'menu.ice_americano.ingredients.1'],
        recommendation: 'menu.ice_americano.recommendation',
        image: '/drinks/ice-americano.webp',
        isNew: false,
        isHit: false,
        energy: 20, protein: 0.8, fat: 0.3, carbs: 1.2, caffeine: 100,
        modifiers: [
          { id: 1, title: 'Сахар', type: 'toggle', default: false },
          { id: 2, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Средне' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 150,
        rating: 4.4,
        reviews: [
          { user: 'Максат', text: 'Простой и освежающий', rating: 4 },
          { user: 'Лаура', text: 'Бодрит и охлаждает', rating: 5 }
        ],
        allergens: []
      },
      {
        id: 403,
        name: 'menu.ice_raf.name',
        price: 1600,
        description: 'menu.ice_raf.description',
        ingredients: ['menu.ice_raf.ingredients.0', 'menu.ice_raf.ingredients.1', 'menu.ice_raf.ingredients.2'],
        recommendation: 'menu.ice_raf.recommendation',
        image: '/drinks/ice-raf.webp',
        isNew: false,
        isHit: false,
        energy: 280, protein: 6.5, fat: 14.0, carbs: 28.0, caffeine: 80,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Сироп', type: 'select', options: ['Ваниль', 'Карамель'], default: 'Ваниль' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 240,
        rating: 4.5,
        reviews: [
          { user: 'Гульнара', text: 'Холодный раф — находка для лета', rating: 5 },
          { user: 'Ерлан', text: 'Нежный и сливочный', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 404,
        name: 'menu.ice_matcha.name',
        price: 1150,
        description: 'menu.ice_matcha.description',
        ingredients: ['menu.ice_matcha.ingredients.0', 'menu.ice_matcha.ingredients.1', 'menu.ice_matcha.ingredients.2'],
        recommendation: 'menu.ice_matcha.recommendation',
        image: '/drinks/ice-matcha.webp',
        isNew: false,
        isHit: true,
        energy: 142, protein: 6.8, fat: 7.2, carbs: 14.6, caffeine: 35,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Овсяное', 'Кокосовое', 'Миндальное'], default: 'Овсяное' },
          { id: 2, title: 'Лёд', type: 'select', options: ['Мало', 'Средне', 'Много'], default: 'Средне' }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 170,
        rating: 4.7,
        reviews: [
          { user: 'Аида', text: 'Освежающая матча!', rating: 5 },
          { user: 'Тимур', text: 'Лучше горячей версии', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 405,
        name: 'menu.bamble.name',
        price: 1600,
        description: 'menu.bamble.description',
        ingredients: ['menu.bamble.ingredients.0', 'menu.bamble.ingredients.1', 'menu.bamble.ingredients.2', 'menu.bamble.ingredients.3'],
        recommendation: 'menu.bamble.recommendation',
        image: '/drinks/bamble.webp',
        isNew: false,
        isHit: false,
        energy: 195, protein: 7.2, fat: 7.8, carbs: 22.0, caffeine: 95,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.4', '0.5'], default: '0.4' },
          { id: 2, title: 'Сироп', type: 'select', options: ['Ваниль', 'Карамель'], default: 'Ваниль' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 240,
        rating: 4.5,
        reviews: [
          { user: 'Гульнара', text: 'Очень сладкий и вкусный', rating: 5 },
          { user: 'Ернур', text: 'Как десерт в стакане', rating: 4 }
        ],
        allergens: ['Молоко']
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     5. MILKSHAKE — молочные напитки
     ══════════════════════════════════════════════════════════ */
  {
    id: 5,
    title: 'menu.categories.milkshake',
    image: '/drinks/milk-duet.webp',
    products: [
      {
        id: 501,
        name: 'menu.milk_duet.name',
        price: 750,
        description: 'menu.milk_duet.description',
        ingredients: ['menu.milk_duet.ingredients.0', 'menu.milk_duet.ingredients.1'],
        recommendation: 'menu.milk_duet.recommendation',
        image: '/drinks/milk-duet.webp',
        isNew: false,
        isHit: false,
        energy: 180, protein: 10.0, fat: 8.5, carbs: 18.0,
        modifiers: [
          { id: 1, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 110,
        rating: 4.2,
        reviews: [
          { user: 'Алмас', text: 'Нежный молочный вкус', rating: 4 },
          { user: 'Динара', text: 'Детям очень нравится', rating: 4 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 502,
        name: 'menu.cocoa.name',
        price: 940,
        description: 'menu.cocoa.description',
        ingredients: ['menu.cocoa.ingredients.0', 'menu.cocoa.ingredients.1', 'menu.cocoa.ingredients.2'],
        recommendation: 'menu.cocoa.recommendation',
        image: '/drinks/cocoa.webp',
        isNew: false,
        isHit: true,
        energy: 220, protein: 9.0, fat: 10.5, carbs: 24.0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое'], default: 'Обычное' },
          { id: 3, title: 'Маршмеллоу', type: 'toggle', default: true }
        ],
        togetherBetter: [],
        badges: ['HIT'],
        bonusPay: 140,
        rating: 4.6,
        reviews: [
          { user: 'Айгуль', text: 'Настоящее какао как в детстве', rating: 5 },
          { user: 'Дамир', text: 'Густой и шоколадный', rating: 5 }
        ],
        allergens: ['Молоко']
      },
      {
        id: 503,
        name: 'menu.hot_chocolate.name',
        price: 940,
        description: 'menu.hot_chocolate.description',
        ingredients: ['menu.hot_chocolate.ingredients.0', 'menu.hot_chocolate.ingredients.1', 'menu.hot_chocolate.ingredients.2'],
        recommendation: 'menu.hot_chocolate.recommendation',
        image: '/drinks/hot-chocolate.webp',
        isNew: false,
        isHit: false,
        energy: 250, protein: 8.0, fat: 12.0, carbs: 28.0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
          { id: 2, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное'], default: 'Обычное' },
          { id: 3, title: 'Взбитые сливки', type: 'toggle', default: true }
        ],
        togetherBetter: [],
        badges: [],
        bonusPay: 140,
        rating: 4.4,
        reviews: [
          { user: 'Алия', text: 'Горячий шоколад — зимняя сказка', rating: 5 },
          { user: 'Батыр', text: 'Густой и насыщенный', rating: 4 }
        ],
        allergens: ['Молоко']
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     6. НОВИНКИ — новые напитки
     ══════════════════════════════════════════════════════════ */
  {
    id: 6,
    title: 'menu.categories.new_items',
    image: '/drinks/extra-01.webp',
    products: [
      {
        id: 601,
        name: 'Новинка 1', // TODO: заполнить название и i18n ключ
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-01.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 602,
        name: 'Новинка 2', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-02.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 603,
        name: 'Новинка 3', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-03.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 604,
        name: 'Новинка 4', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-04.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 605,
        name: 'Новинка 5', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-05.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 606,
        name: 'Новинка 6', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-06.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 607,
        name: 'Новинка 7', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-07.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 608,
        name: 'Новинка 8', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-08.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 609,
        name: 'Новинка 9', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-09.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 610,
        name: 'Новинка 10', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-10.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 611,
        name: 'Новинка 11', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-11.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 612,
        name: 'Новинка 12', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-12.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
      {
        id: 613,
        name: 'Новинка 13', // TODO
        price: 990,
        description: 'Описание нового напитка', // TODO
        ingredients: [],
        recommendation: '',
        image: '/drinks/extra-13.webp',
        isNew: true,
        isHit: false,
        energy: 0, protein: 0, fat: 0, carbs: 0,
        modifiers: [
          { id: 1, title: 'Размер', type: 'select', options: ['0.3', '0.4'], default: '0.3' },
        ],
        togetherBetter: [],
        badges: ['NEW'],
        bonusPay: 0,
        rating: 0,
        reviews: [],
        allergens: []
      },
    ]
  }
];