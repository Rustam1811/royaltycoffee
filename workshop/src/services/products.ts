import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { WorkshopProduct, WorkshopCategory } from '@/types';

const PRODUCTS_COLLECTION = 'workshop_products';
const CATEGORIES_COLLECTION = 'workshop_categories';

// Получить все категории
export async function getCategories(): Promise<WorkshopCategory[]> {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('isActive', '==', true),
    orderBy('sortOrder', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as WorkshopCategory[];
}

// Получить все доступные продукты
export async function getProducts(): Promise<WorkshopProduct[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('isAvailable', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }) as WorkshopProduct[];
}

// Получить все продукты (для админа)
export async function getAllProducts(): Promise<WorkshopProduct[]> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }) as WorkshopProduct[];
}

// Получить продукты по категории
export async function getProductsByCategory(categoryId: string): Promise<WorkshopProduct[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('categoryId', '==', categoryId),
    where('isAvailable', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }) as WorkshopProduct[];
}

// Добавить продукт
export async function addProduct(product: Omit<WorkshopProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
    ...product,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

// Обновить продукт
export async function updateProduct(id: string, updates: Partial<WorkshopProduct>): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Удалить продукт
export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}

// Переключить доступность продукта
export async function toggleProductAvailability(id: string, isAvailable: boolean): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, {
    isAvailable,
    updatedAt: Timestamp.now(),
  });
}

// Добавить категорию
export async function addCategory(category: Omit<WorkshopCategory, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), category);
  return docRef.id;
}

// Обновить категорию
export async function updateCategory(id: string, updates: Partial<WorkshopCategory>): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, id), updates);
}
