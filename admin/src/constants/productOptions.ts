// Опции для настройки напитков в админке (просмотр товара)

export interface SizeDef {
  key: string;
  label: string;
  ml: number;
  priceMultiplier: number;
}

export interface MilkDef {
  key: string;
  name: string;
  price: number;
  image?: string;
}

export interface SyrupDef {
  key: string;
  name: string;
  price: number;
  image?: string;
}

export interface ToppingDef {
  key: string;
  name: string;
  price: number;
  image?: string;
}

// Размеры напитков
export const SIZES: SizeDef[] = [
  { key: 'S', label: 'S', ml: 250, priceMultiplier: 0.9 },
  { key: 'M', label: 'M', ml: 350, priceMultiplier: 1.0 },
  { key: 'L', label: 'L', ml: 450, priceMultiplier: 1.18 },
];

// Типы молока
export const MILKS: MilkDef[] = [
  { 
    key: 'regular', 
    name: 'Обычное', 
    price: 0, 
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'oat', 
    name: 'Овсяное', 
    price: 200, 
    image: 'https://images.unsplash.com/photo-1600623560792-d0b2d4e30b91?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'almond', 
    name: 'Миндальное', 
    price: 250, 
    image: 'https://images.unsplash.com/photo-1569478412303-6f566ac41a37?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'coconut', 
    name: 'Кокосовое', 
    price: 250, 
    image: 'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'lactosefree', 
    name: 'Безлактозное', 
    price: 180, 
    image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=160&h=160&fit=crop&auto=format' 
  },
];

// Сиропы
export const SYRUPS: SyrupDef[] = [
  { 
    key: 'none', 
    name: 'Без сиропа', 
    price: 0, 
    image: 'https://images.unsplash.com/photo-1514820720301-4c4790309f46?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'vanilla', 
    name: 'Ваниль', 
    price: 200, 
    image: 'https://images.unsplash.com/photo-1587736174440-ddbf2b6a3b4b?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'caramel', 
    name: 'Карамель', 
    price: 200, 
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'hazelnut', 
    name: 'Фундук', 
    price: 220, 
    image: 'https://images.unsplash.com/photo-1633436370590-223c9e0d2afd?w=160&h=160&fit=crop&auto=format' 
  },
];

// Топпинги
export const TOPPINGS: ToppingDef[] = [
  { 
    key: 'whipped_cream', 
    name: 'Взбитые сливки', 
    price: 150, 
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'chocolate_chips', 
    name: 'Шоколадная крошка', 
    price: 180, 
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'cinnamon', 
    name: 'Корица', 
    price: 100, 
    image: 'https://images.unsplash.com/photo-1509831128611-c3f02e67db59?w=160&h=160&fit=crop&auto=format' 
  },
  { 
    key: 'marshmallow', 
    name: 'Маршмеллоу', 
    price: 200, 
    image: 'https://images.unsplash.com/photo-1585670274787-048f4acb94f8?w=160&h=160&fit=crop&auto=format' 
  },
];
