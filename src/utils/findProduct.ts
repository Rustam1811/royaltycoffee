// Утилита для поиска продукта по ID во всех категориях
import { drinkCategories, Product } from '../pages/menu/data/drinksData';
import { foodCategories, FoodProduct } from '../pages/menu/data/foodData';

export interface ProductWithTogetherBetter {
  id: number | string;
  name: string;
  price: number;
  image: string;
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  togetherBetter?: Array<{ id: number; name: string; image: string }>;
  categoryId: number;
  type: 'drink' | 'food';
}

export function findProductById(id: number | string): ProductWithTogetherBetter | null {
  // Поиск в напитках
  for (const category of drinkCategories) {
    const product = category.products.find(p => p.id === id);
    if (product) {
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        energy: product.energy,
        protein: product.protein,
        fat: product.fat,
        carbs: product.carbs,
        togetherBetter: product.togetherBetter,
        categoryId: category.id,
        type: 'drink'
      };
    }
  }

  // Поиск в еде
  for (const category of foodCategories) {
    const product = category.products.find(p => p.id === id);
    if (product) {
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        energy: product.energy,
        protein: product.protein,
        fat: product.fat,
        carbs: product.carbs,
        togetherBetter: [], // Еда пока без togetherBetter
        categoryId: category.id,
        type: 'food'
      };
    }
  }

  return null;
}
