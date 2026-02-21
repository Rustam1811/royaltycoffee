/**
 * Menu Service - загрузка меню из Firestore
 */

import { 
  collection, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { eatsCategories, EatsCategory, EatsProduct } from '../pages/menu/data/eatsData';
import { drinkCategories, DrinkCategory, Product } from '../pages/menu/data/drinksData';
import i18n from '../i18n';

// Типы для меню
export interface MenuCategory {
  id: string;
  name: string;
  nameEn?: string;
  nameKz?: string;
  icon: string;
  order: number;
}

export interface MenuItemSize {
  key: string;
  label: string;
  volume: number;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  nameKz?: string;
  description?: string;
  price: number;
  image: string;
  sizes?: MenuItemSize[];
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  isAvailable: boolean;
  isPopular?: boolean;
  badges?: string[];
}

// Интерфейс для PremiumMenu компонента
export interface PremiumMenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  badges: { type: string; label: string }[];
  categoryId: string;
  sizes?: MenuItemSize[];
}

export interface PremiumCategory {
  key: string;
  label: string;
}

// Кеш для меню
let categoriesCache: MenuCategory[] | null = null;
let itemsCache: MenuItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Получить все категории меню
 */
export async function getMenuCategories(): Promise<MenuCategory[]> {
  // Проверяем кеш
  if (categoriesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return categoriesCache;
  }

  try {
    const categoriesRef = collection(db, 'menuCategories');
    const snapshot = await getDocs(categoriesRef);
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuCategory[];
    
    // Сортируем на клиенте
    categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    categoriesCache = categories;
    cacheTimestamp = Date.now();
    
    console.log('[Menu] Loaded categories:', categories.length);
    return categories;
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return [];
  }
}

/**
 * Получить все позиции меню
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  // Проверяем кеш
  if (itemsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return itemsCache;
  }

  try {
    const itemsRef = collection(db, 'menuItems');
    const snapshot = await getDocs(itemsRef);
    
    // Фильтруем на клиенте
    const items = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as MenuItem)
      .filter(item => item.isAvailable !== false);
    
    itemsCache = items;
    cacheTimestamp = Date.now();
    
    console.log('[Menu] Loaded items:', items.length);
    return items;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
}

/**
 * Получить позиции меню по категории
 */
export async function getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  try {
    // Используем кешированные данные
    const items = await getMenuItems();
    return items.filter(item => item.categoryId === categoryId);
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    return [];
  }
}

/**
 * Получить одну позицию меню
 */
export async function getMenuItem(itemId: string): Promise<MenuItem | null> {
  try {
    const itemRef = doc(db, 'menuItems', itemId);
    const snapshot = await getDoc(itemRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return {
      id: snapshot.id,
      ...snapshot.data()
    } as MenuItem;
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return null;
  }
}

/**
 * Конвертировать данные для PremiumMenu компонента
 */
export function convertToPremiumFormat(
  items: MenuItem[], 
  categories: MenuCategory[],
  lang: string = 'ru'
): { items: PremiumMenuItem[]; categories: PremiumCategory[] } {
  
  // Конвертируем категории
  const premiumCategories: PremiumCategory[] = categories.map(cat => ({
    key: cat.id,
    label: lang === 'en' ? (cat.nameEn || cat.name) : 
           lang === 'kz' ? (cat.nameKz || cat.name) : cat.name
  }));

  // Конвертируем позиции
  const premiumItems: PremiumMenuItem[] = items.map(item => ({
    id: item.id,
    name: lang === 'en' ? (item.nameEn || item.name) : 
          lang === 'kz' ? (item.nameKz || item.name) : item.name,
    price: item.price,
    image: item.image,
    energy: item.energy,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    badges: (item.badges || []).map(b => ({ type: b, label: b })),
    categoryId: item.categoryId,
    sizes: item.sizes
  }));

  return { items: premiumItems, categories: premiumCategories };
}

/**
 * Очистить кеш меню (например, после обновления в админке)
 */
export function clearMenuCache(): void {
  categoriesCache = null;
  itemsCache = null;
  cacheTimestamp = 0;
}

/**
 * Хук для загрузки меню - возвращает состояние loading и данные
 */
export async function loadFullMenu(lang: string = 'ru'): Promise<{
  drinks: { items: PremiumMenuItem[]; categories: PremiumCategory[] };
  food: { items: PremiumMenuItem[]; categories: PremiumCategory[] };
}> {
  const [categories, items] = await Promise.all([
    getMenuCategories(),
    getMenuItems()
  ]);

  // Разделяем на напитки и еду
  const foodCategoryIds = ['croissants', 'bakery', 'sandwiches', 'desserts'];

  // Еда = только food категории
  const foodCategories = categories.filter(c => foodCategoryIds.includes(c.id));
  const foodItems = items.filter(i => foodCategoryIds.includes(i.categoryId));

  // Напитки = всё что не еда
  const drinkCategories = categories.filter(c => !foodCategoryIds.includes(c.id));
  const drinkItems = items.filter(i => !foodCategoryIds.includes(i.categoryId));

  // Fallback: если в Firestore нет еды, берём локальные данные
  let foodResult: { items: PremiumMenuItem[]; categories: PremiumCategory[] };
  if (foodItems.length === 0) {
    foodResult = getLocalFoodFallback();
  } else {
    foodResult = convertToPremiumFormat(foodItems, foodCategories, lang);
  }

  // Напитки: из Firestore, fallback на локальные данные
  let drinksResult: { items: PremiumMenuItem[]; categories: PremiumCategory[] };
  if (drinkItems.length === 0) {
    drinksResult = getLocalDrinksFallback();
  } else {
    drinksResult = convertToPremiumFormat(drinkItems, drinkCategories, lang);
  }

  return {
    drinks: drinksResult,
    food: foodResult
  };
}

/**
 * Локальный фоллбек еды из eatsData (пока нет в Firestore)
 */
function getLocalFoodFallback(): { items: PremiumMenuItem[]; categories: PremiumCategory[] } {
  const categories: PremiumCategory[] = eatsCategories.map((c: EatsCategory) => ({
    key: String(c.id),
    label: c.title
  }));

  const items: PremiumMenuItem[] = eatsCategories.flatMap((cat: EatsCategory) =>
    cat.products.map((p: EatsProduct) => ({
      id: String(p.id),
      name: p.name,
      price: p.price,
      image: p.image,
      energy: p.energy,
      protein: p.protein,
      fat: p.fat,
      carbs: p.carbs,
      badges: (p.badges || []).map((b: string) => ({ type: b, label: b })),
      categoryId: String(cat.id),
    }))
  );

  return { items, categories };
}

/**
 * Локальный фоллбек напитков из drinksData.ts (актуальное меню Royal Coffee)
 */
function getLocalDrinksFallback(): { items: PremiumMenuItem[]; categories: PremiumCategory[] } {
  const t = i18n.t.bind(i18n);

  const categories: PremiumCategory[] = drinkCategories.map((c: DrinkCategory) => ({
    key: String(c.id),
    label: t(c.title)
  }));

  const items: PremiumMenuItem[] = drinkCategories.flatMap((cat: DrinkCategory) =>
    cat.products.map((p: Product) => ({
      id: String(p.id),
      name: t(p.name),
      price: p.price,
      image: p.image,
      energy: p.energy,
      protein: p.protein,
      fat: p.fat,
      carbs: p.carbs,
      badges: (p.badges || []).map((b: string) => ({ type: b, label: b })),
      categoryId: String(cat.id),
    }))
  );

  return { items, categories };
}
