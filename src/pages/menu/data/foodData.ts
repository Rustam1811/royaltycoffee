// src/pages/menu/data/foodData.ts

export interface FoodProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  badges?: string[];
}

export interface FoodCategory {
  id: number;
  title: string;
  products: FoodProduct[];
}

export const foodCategories: FoodCategory[] = [
  {
    id: 1,
    title: 'Хот-доги',
    products: [
      {
        id: 101,
        name: 'Классический хот-дог',
        price: 800,
        image: 'https://images.unsplash.com/photo-1612392062798-2407d7e25140?w=500&auto=format',
        energy: 350,
        protein: 15,
        fat: 18,
        carbs: 32,
        badges: ['popular']
      },
      {
        id: 102,
        name: 'Хот-дог с сыром',
        price: 950,
        image: 'https://images.unsplash.com/photo-1619894991209-e2dd39a00ff0?w=500&auto=format',
        energy: 420,
        protein: 18,
        fat: 22,
        carbs: 35,
        badges: ['new']
      },
      {
        id: 103,
        name: 'Острый хот-дог',
        price: 900,
        image: 'https://images.unsplash.com/photo-1621360004632-46fe5ffcd553?w=500&auto=format',
        energy: 380,
        protein: 16,
        fat: 20,
        carbs: 33
      }
    ]
  },
  {
    id: 2,
    title: 'Бургеры',
    products: [
      {
        id: 201,
        name: 'Чизбургер',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format',
        energy: 520,
        protein: 25,
        fat: 28,
        carbs: 42,
        badges: ['popular']
      },
      {
        id: 202,
        name: 'Двойной бургер',
        price: 1500,
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format',
        energy: 680,
        protein: 35,
        fat: 38,
        carbs: 45,
        badges: ['new']
      },
      {
        id: 203,
        name: 'Куриный бургер',
        price: 1100,
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&auto=format',
        energy: 450,
        protein: 28,
        fat: 22,
        carbs: 40
      }
    ]
  },
  {
    id: 3,
    title: 'Снеки',
    products: [
      {
        id: 301,
        name: 'Картофель фри',
        price: 600,
        image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format',
        energy: 320,
        protein: 4,
        fat: 15,
        carbs: 42,
        badges: ['popular']
      },
      {
        id: 302,
        name: 'Наггетсы (6 шт)',
        price: 850,
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format',
        energy: 280,
        protein: 18,
        fat: 16,
        carbs: 20
      },
      {
        id: 303,
        name: 'Луковые кольца',
        price: 700,
        image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&auto=format',
        energy: 250,
        protein: 5,
        fat: 12,
        carbs: 32
      }
    ]
  },
  {
    id: 4,
    title: 'Десерты',
    products: [
      {
        id: 401,
        name: 'Чизкейк',
        price: 900,
        image: 'https://images.unsplash.com/photo-1533134242-8c4ce0aeff7b?w=500&auto=format',
        energy: 380,
        protein: 8,
        fat: 24,
        carbs: 35,
        badges: ['popular']
      },
      {
        id: 402,
        name: 'Шоколадный брауни',
        price: 750,
        image: 'https://images.unsplash.com/photo-1564355808143-f9b30eb34c53?w=500&auto=format',
        energy: 420,
        protein: 6,
        fat: 22,
        carbs: 48,
        badges: ['new']
      },
      {
        id: 403,
        name: 'Маффин',
        price: 650,
        image: 'https://images.unsplash.com/photo-1607478900766-efe13248b125?w=500&auto=format',
        energy: 340,
        protein: 5,
        fat: 16,
        carbs: 42
      }
    ]
  }
];
