/**
 * Menu Service for Admin Panel
 * Работает с коллекциями menuCategories и menuItems
 */

import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
  query,
  orderBy,
  setDoc
} from "firebase/firestore";

// ============ ТИПЫ ============

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
  descriptionEn?: string;
  descriptionKz?: string;
  price: number;
  image: string;
  sizes?: MenuItemSize[];
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  isAvailable: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  weight?: string;
  badges?: string[];
}

// ============ КОЛЛЕКЦИИ ============

const CATEGORIES_COLL = "menuCategories";
const ITEMS_COLL = "menuItems";

// ============ КАТЕГОРИИ ============

/**
 * Слушать изменения категорий в реальном времени
 */
export const listenMenuCategories = (
  callback: (cats: MenuCategory[]) => void
): Unsubscribe => {
  const q = query(collection(db, CATEGORIES_COLL), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const cats = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MenuCategory[];
    callback(cats);
  });
};

/**
 * Получить все категории (одноразово)
 */
export const getMenuCategories = async (): Promise<MenuCategory[]> => {
  const q = query(collection(db, CATEGORIES_COLL), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MenuCategory[];
};

/**
 * Добавить категорию
 */
export const addMenuCategory = async (
  data: Omit<MenuCategory, "id">
): Promise<string> => {
  // Используем setDoc с кастомным ID
  const id = data.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  await setDoc(doc(db, CATEGORIES_COLL, id), data);
  return id;
};

/**
 * Обновить категорию
 */
export const updateMenuCategory = async (
  id: string,
  data: Partial<MenuCategory>
): Promise<void> => {
  await updateDoc(doc(db, CATEGORIES_COLL, id), data);
};

/**
 * Удалить категорию
 */
export const deleteMenuCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, CATEGORIES_COLL, id));
};

// ============ ПОЗИЦИИ МЕНЮ ============

/**
 * Слушать изменения позиций меню в реальном времени
 */
export const listenMenuItems = (
  callback: (items: MenuItem[]) => void
): Unsubscribe => {
  const colRef = collection(db, ITEMS_COLL);
  return onSnapshot(colRef, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MenuItem[];
    callback(items);
  });
};

/**
 * Получить все позиции (одноразово)
 */
export const getMenuItems = async (): Promise<MenuItem[]> => {
  const snap = await getDocs(collection(db, ITEMS_COLL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MenuItem[];
};

/**
 * Получить позиции по категории
 */
export const getMenuItemsByCategory = async (
  categoryId: string
): Promise<MenuItem[]> => {
  const items = await getMenuItems();
  if (categoryId === "all") return items;
  return items.filter((item) => item.categoryId === categoryId);
};

/**
 * Добавить позицию меню
 */
export const addMenuItem = async (
  data: Omit<MenuItem, "id">
): Promise<string> => {
  // Генерируем ID из названия
  const id = data.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-а-яё]/gi, "")
    .substring(0, 30);
  
  await setDoc(doc(db, ITEMS_COLL, id), {
    ...data,
    isAvailable: data.isAvailable ?? true,
  });
  return id;
};

/**
 * Обновить позицию меню
 */
export const updateMenuItem = async (
  id: string,
  data: Partial<MenuItem>
): Promise<void> => {
  await updateDoc(doc(db, ITEMS_COLL, id), data);
};

/**
 * Удалить позицию меню
 */
export const deleteMenuItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ITEMS_COLL, id));
};

/**
 * Переключить доступность позиции
 */
export const toggleItemAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<void> => {
  await updateDoc(doc(db, ITEMS_COLL, id), { isAvailable });
};

// Экспортируем сервис как объект для удобства
export const MenuService = {
  // Категории
  listenCategories: listenMenuCategories,
  getCategories: getMenuCategories,
  addCategory: addMenuCategory,
  updateCategory: updateMenuCategory,
  deleteCategory: deleteMenuCategory,
  
  // Позиции
  listenItems: listenMenuItems,
  getItems: getMenuItems,
  getItemsByCategory: getMenuItemsByCategory,
  addItem: addMenuItem,
  updateItem: updateMenuItem,
  deleteItem: deleteMenuItem,
  toggleAvailability: toggleItemAvailability,
};

export default MenuService;
