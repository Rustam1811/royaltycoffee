import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { DailyAnalytics, MonthlyAnalytics, WorkshopOrder } from '@/types';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

const ORDERS_COLLECTION = 'workshop_orders';

// Получить аналитику клиента за период
export async function getClientAnalytics(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyAnalytics[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('clientId', '==', clientId),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as WorkshopOrder;
  });
  
  // Группируем по дням
  const dailyMap = new Map<string, DailyAnalytics>();
  
  orders.forEach(order => {
    const dateKey = format(order.createdAt, 'yyyy-MM-dd');
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        clientId,
        totalOrders: 0,
        totalAmount: 0,
        itemsSummary: {},
      });
    }
    
    const daily = dailyMap.get(dateKey)!;
    daily.totalOrders += 1;
    daily.totalAmount += order.totalAmount;
    
    order.items.forEach(item => {
      if (!daily.itemsSummary[item.productId]) {
        daily.itemsSummary[item.productId] = { quantity: 0, amount: 0 };
      }
      daily.itemsSummary[item.productId].quantity += item.quantity;
      daily.itemsSummary[item.productId].amount += item.subtotal;
    });
  });
  
  return Array.from(dailyMap.values());
}

// Получить аналитику за последние N дней
export async function getClientAnalyticsLastDays(
  clientId: string,
  days: number
): Promise<DailyAnalytics[]> {
  const endDate = new Date();
  const startDate = subDays(endDate, days);
  return getClientAnalytics(clientId, startDate, endDate);
}

// Получить месячную аналитику
export async function getClientMonthlyAnalytics(
  clientId: string,
  months: number = 6
): Promise<MonthlyAnalytics[]> {
  const endDate = new Date();
  const startDate = subMonths(startOfMonth(endDate), months - 1);
  
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('clientId', '==', clientId),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endOfMonth(endDate))),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as WorkshopOrder;
  });
  
  // Группируем по месяцам
  const monthlyMap = new Map<string, MonthlyAnalytics & { products: Map<string, { name: string; quantity: number; amount: number }> }>();
  
  orders.forEach(order => {
    const monthKey = format(order.createdAt, 'yyyy-MM');
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        clientId,
        totalOrders: 0,
        totalAmount: 0,
        topProducts: [],
        products: new Map(),
      });
    }
    
    const monthly = monthlyMap.get(monthKey)!;
    monthly.totalOrders += 1;
    monthly.totalAmount += order.totalAmount;
    
    order.items.forEach(item => {
      const existing = monthly.products.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += item.subtotal;
      } else {
        monthly.products.set(item.productId, {
          name: item.productName.ru,
          quantity: item.quantity,
          amount: item.subtotal,
        });
      }
    });
  });
  
  // Конвертируем в итоговый формат с топ-продуктами
  return Array.from(monthlyMap.values()).map(monthly => ({
    month: monthly.month,
    clientId: monthly.clientId,
    totalOrders: monthly.totalOrders,
    totalAmount: monthly.totalAmount,
    topProducts: Array.from(monthly.products.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        amount: data.amount,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
  }));
}

// Получить общую аналитику для админа/владельца
export async function getOverallAnalytics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalOrders: number;
  totalAmount: number;
  ordersByClient: Record<string, { name: string; orders: number; amount: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; amount: number }>;
}> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as WorkshopOrder;
  });
  
  const result = {
    totalOrders: orders.length,
    totalAmount: 0,
    ordersByClient: {} as Record<string, { name: string; orders: number; amount: number }>,
    topProducts: [] as Array<{ productId: string; name: string; quantity: number; amount: number }>,
  };
  
  const productsMap = new Map<string, { name: string; quantity: number; amount: number }>();
  
  orders.forEach(order => {
    result.totalAmount += order.totalAmount;
    
    // По клиентам
    if (!result.ordersByClient[order.clientId]) {
      result.ordersByClient[order.clientId] = {
        name: order.clientName,
        orders: 0,
        amount: 0,
      };
    }
    result.ordersByClient[order.clientId].orders += 1;
    result.ordersByClient[order.clientId].amount += order.totalAmount;
    
    // По продуктам
    order.items.forEach(item => {
      const existing = productsMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += item.subtotal;
      } else {
        productsMap.set(item.productId, {
          name: item.productName.ru,
          quantity: item.quantity,
          amount: item.subtotal,
        });
      }
    });
  });
  
  result.topProducts = Array.from(productsMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
  
  return result;
}
