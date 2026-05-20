import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { WorkshopOrder, OrderItem, OrderStatus, QuickOrderTemplate } from '@/types';

const ORDERS_COLLECTION = 'workshop_orders';
const TEMPLATES_COLLECTION = 'workshop_quick_orders';

// Создать заказ
export async function createOrder(order: Omit<WorkshopOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // Firestore не принимает undefined — убираем такие поля
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(order)) {
    if (v !== undefined) clean[k] = v;
  }

  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
    ...clean,
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  // Сохраняем как шаблон быстрого заказа (не блокируем создание заказа при ошибке)
  try {
    await saveQuickOrderTemplate(order.clientId, order.outletId, order.items);
  } catch {
    // template save failed — non-critical, order already created
  }
  
  return docRef.id;
}

// Получить заказы клиента
export async function getClientOrders(clientId: string): Promise<WorkshopOrder[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      confirmedAt: data.confirmedAt?.toDate?.(),
      deliveredAt: data.deliveredAt?.toDate?.(),
    };
  }) as WorkshopOrder[];
}

// Получить заказы для точки
export async function getOutletOrders(outletId: string): Promise<WorkshopOrder[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('outletId', '==', outletId),
    orderBy('createdAt', 'desc'),
    limit(50)
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
  }) as WorkshopOrder[];
}

// Получить все заказы (для админа)
export async function getAllOrders(statusFilter?: OrderStatus): Promise<WorkshopOrder[]> {
  let q = query(
    collection(db, ORDERS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(500)
  );
  
  if (statusFilter) {
    q = query(
      collection(db, ORDERS_COLLECTION),
      where('status', '==', statusFilter),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }) as WorkshopOrder[];
}

// Обновить статус заказа
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const baseUpdates = {
    status,
    updatedAt: Timestamp.now(),
  };
  
  if (status === 'confirmed') {
    await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
      ...baseUpdates,
      confirmedAt: Timestamp.now(),
    });
  } else if (status === 'delivered') {
    await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
      ...baseUpdates,
      deliveredAt: Timestamp.now(),
    });
  } else {
    await updateDoc(doc(db, ORDERS_COLLECTION, orderId), baseUpdates);
  }
}

// Сохранить шаблон быстрого заказа
export async function saveQuickOrderTemplate(
  clientId: string,
  outletId: string,
  items: OrderItem[]
): Promise<void> {
  const q = query(
    collection(db, TEMPLATES_COLLECTION),
    where('clientId', '==', clientId),
    where('outletId', '==', outletId)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    await addDoc(collection(db, TEMPLATES_COLLECTION), {
      clientId,
      outletId,
      items,
      lastUsed: Timestamp.now(),
    });
  } else {
    await updateDoc(snapshot.docs[0].ref, {
      items,
      lastUsed: Timestamp.now(),
    });
  }
}

// Получить шаблон быстрого заказа для точки
export async function getQuickOrderTemplate(
  clientId: string,
  outletId: string
): Promise<QuickOrderTemplate | null> {
  const q = query(
    collection(db, TEMPLATES_COLLECTION),
    where('clientId', '==', clientId),
    where('outletId', '==', outletId)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    clientId: data.clientId,
    outletId: data.outletId,
    items: data.items,
    lastUsed: data.lastUsed?.toDate?.() || new Date(),
  };
}

// Отменить заказ (только pending)
export async function cancelOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    status: 'cancelled',
    updatedAt: Timestamp.now(),
  });
}

// Обновить позиции заказа (только pending) — редактирование клиентом
export async function updateOrderItems(
  orderId: string,
  items: OrderItem[],
  totalAmount: number,
  notes?: string,
): Promise<void> {
  const base: { items: OrderItem[]; totalAmount: number; updatedAt: Timestamp; notes?: string | null } = {
    items,
    totalAmount,
    updatedAt: Timestamp.now(),
  };
  if (notes !== undefined) base.notes = notes || null;
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), base);
}

// Получить заказ по ID
export async function getOrderById(orderId: string): Promise<WorkshopOrder | null> {
  const docSnap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as WorkshopOrder;
}
