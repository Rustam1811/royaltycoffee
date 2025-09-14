/**
 * Сервис аналитики для админ-панели
 * Получает данные заказов через локальный API сервер
 */

import { apiUrl } from '../../src/config/api';

export interface OrderItem {
  productId?: string;
  productName?: string;
  category?: string;
  name?: string;
  price: number;
  qty?: number;
  quantity?: number;
}

export interface Order {
  id: string;
  createdAt: Date;
  date: Date; // Normalized date field for analytics
  items: OrderItem[];
  totalPrice: number;
  status: string;
  userId?: string;
  bonusEarned?: number;
}

/**
 * Получить заказы за период через локальный API
 */
export async function getOrders(from: Date, to: Date): Promise<Order[]> {
  console.log('📊 Analytics: getOrders вызван', { from, to });
  
  try {
    console.log('📊 Analytics: загружаем заказы с', from, 'по', to);
    
    // Используем новый unified API endpoint
    const requestUrl = apiUrl('orders', { action: 'get', admin: true });
    
    console.log('📊 Analytics: используем URL:', requestUrl);
    console.log('📊 Analytics: отправляем запрос...');
    
    const startTime = Date.now();
    
    // Пробуем сначала простой fetch без сложных настроек
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: 'GET',
        mode: 'cors'
      });
    } catch (fetchError) {
      console.error('📊 Analytics: fetch failed, trying XMLHttpRequest:', fetchError);
      
      // Fallback на XMLHttpRequest
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', requestUrl, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                console.log('📊 Analytics: XMLHttpRequest успешен, получено заказов:', data.orders?.length || 0);
                
                if (!data.orders || !Array.isArray(data.orders)) {
                  console.warn('📊 Analytics: неверный формат данных:', data);
                  resolve([]);
                  return;
                }

                const allOrders = data.orders.map((order: any) => {
                  // Normalize date from Firestore Timestamp if needed
                  let date: Date;
                  if (order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt) {
                    // Firestore Timestamp
                    date = new Date(order.createdAt.seconds * 1000);
                  } else if (order.date) {
                    date = new Date(order.date);
                  } else if (order.createdAt) {
                    date = new Date(order.createdAt);
                  } else {
                    date = new Date(order.timestamp || Date.now());
                  }
                  
                  return {
                    id: order.id,
                    createdAt: date,
                    date, // Add date field for analytics
                    items: order.items || [],
                    totalPrice: order.amount || order.totalPrice || 0,
                    status: order.status || 'completed',
                    userId: order.userId,
                    bonusEarned: order.bonusEarned || 0
                  };
                });

                console.log('📊 Analytics: показываем заказов:', allOrders.length);
                resolve(allOrders);
              } catch (parseError) {
                console.error('📊 Analytics: ошибка парсинга JSON:', parseError);
                reject(new Error(`Ошибка парсинга ответа: ${parseError}`));
              }
            } else {
              console.error('📊 Analytics: XMLHttpRequest error:', xhr.status, xhr.responseText);
              reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
            }
          }
        };
        xhr.onerror = function() {
          console.error('📊 Analytics: XMLHttpRequest network error');
          reject(new Error('Сетевая ошибка при выполнении запроса'));
        };
        xhr.send();
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    console.log('📊 Analytics: ответ получен за', responseTime, 'мс');
    console.log('📊 Analytics: ответ сервера status:', response.status, 'url:', response.url);
    console.log('📊 Analytics: content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('📊 Analytics: HTTP ошибка:', response.status, response.statusText, 'Body:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // Проверяем что мы получили JSON, а не HTML
    const contentType = response.headers.get('content-type');
    console.log('📊 Analytics: content-type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('📊 Analytics: получен не JSON ответ:', responseText.substring(0, 200));
      throw new Error(`Сервер вернул неожиданный тип контента: ${contentType}. Ответ: ${responseText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    console.log('📊 Analytics: получено заказов:', data.orders?.length || 0);
    
    if (!data.orders || !Array.isArray(data.orders)) {
      console.warn('📊 Analytics: неверный формат данных:', data);
      return [];
    }

    // ВРЕМЕННО: показываем ВСЕ заказы для продакшена
    console.log('📊 Analytics: показываем ВСЕ заказы (без фильтрации дат)');
    
    const allOrders = data.orders.map((order: any) => {
      // Normalize date from Firestore Timestamp if needed
      let date: Date;
      try {
        if (order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt) {
          // Firestore Timestamp
          date = new Date(order.createdAt.seconds * 1000);
        } else if (order.date) {
          date = new Date(order.date);
        } else if (order.createdAt) {
          date = new Date(order.createdAt);
        } else {
          date = new Date(order.timestamp || Date.now());
        }
        
        // Проверяем валидность даты
        if (isNaN(date.getTime())) {
          console.warn('⚠️ Невалидная дата для заказа', order.id, '- используем текущую дату');
          date = new Date();
        }
      } catch (error) {
        console.warn('⚠️ Ошибка парсинга даты для заказа', order.id, error);
        date = new Date();
      }
      
      // Логируем первые несколько заказов для отладки
      if (data.orders.indexOf(order) < 3) {
        console.log('📊 Analytics: заказ', order.id, 'исходная дата:', order.date || order.createdAt, 'парсинг:', date, 'товары:', order.items?.length);
      }
      
      return {
        id: order.id,
        createdAt: date,
        date, // Add date field for analytics
        items: order.items || [],
        totalPrice: order.amount || order.totalPrice || 0,
        status: order.status || 'completed',
        userId: order.userId,
        bonusEarned: order.bonusEarned || 0
      };
    });

    console.log('📊 Analytics: показываем заказов:', allOrders.length);
    return allOrders;
    
  } catch (error) {
    console.error('📊 Analytics: ошибка загрузки заказов:', error);
    
    // Показываем реальную ошибку пользователю, не скрываем её тестовыми данными
    throw new Error(`Не удалось загрузить данные заказов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

// Функция для генерации тестовых данных
function generateTestOrders(from: Date, to: Date): Order[] {
  const testOrders: Order[] = [];
  const currentDate = new Date(from);
  
  while (currentDate <= to) {
    // Генерируем 2-5 заказов в день
    const ordersPerDay = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < ordersPerDay; i++) {
      const orderTime = new Date(currentDate);
      orderTime.setHours(Math.floor(Math.random() * 12) + 8); // 8-20 часов
      orderTime.setMinutes(Math.floor(Math.random() * 60));
      
      testOrders.push({
        id: `test-${Date.now()}-${i}`,
        createdAt: orderTime,
        date: orderTime, // Add date field
        items: [
          { name: 'Капучино', price: 350, quantity: 1 },
          { name: 'Круассан', price: 200, quantity: Math.floor(Math.random() * 2) + 1 }
        ],
        totalPrice: Math.floor(Math.random() * 800) + 300,
        status: 'completed',
        userId: `user-${Math.floor(Math.random() * 100)}`,
        bonusEarned: Math.floor(Math.random() * 50) + 10
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log('📊 Analytics: сгенерировано тестовых заказов:', testOrders.length);
  return testOrders;
}

export function aggregateOrders(orders: Order[]) {
  console.log('📊 Analytics: агрегируем', orders.length, 'заказов');
  
  // Суммарные показатели
  const byProduct: Record<string, { productName: string; quantity: number; totalRevenue: number }> = {};
  const byHour: Record<string, number> = {};
  const byDay: Record<string, { orders: number; revenue: number; date: string }> = {};
  const byWeek: Record<string, { orders: number; revenue: number; weekStart: string }> = {};
  const byMonth: Record<string, { orders: number; revenue: number; monthStart: string }> = {};
  let totalRevenue = 0;
  let totalOrders = orders.length;

  for (const order of orders) {
    // Проверяем, что у нас валидная дата
    if (!order.createdAt || !order.createdAt.getHours || isNaN(order.createdAt.getTime())) {
      console.warn('⚠️ Пропускаем заказ с невалидной датой:', order.id, order.createdAt);
      totalOrders--; // Уменьшаем счетчик, так как заказ невалидный
      continue;
    }

    const hour = order.createdAt.getHours().toString();
    const day = order.createdAt.toISOString().slice(0, 10);
    
    // Получаем начало недели (понедельник)
    const weekStart = getWeekStart(order.createdAt);
    const weekKey = weekStart.toISOString().slice(0, 10);
    
    // Получаем начало месяца
    const monthStart = new Date(order.createdAt.getFullYear(), order.createdAt.getMonth(), 1);
    const monthKey = monthStart.toISOString().slice(0, 7); // YYYY-MM
    
    // По часам
    byHour[hour] = (byHour[hour] || 0) + 1;
    
    // По дням
    if (!byDay[day]) {
      byDay[day] = { orders: 0, revenue: 0, date: day };
    }
    byDay[day].orders += 1;
    byDay[day].revenue += order.totalPrice;
    
    // По неделям
    if (!byWeek[weekKey]) {
      byWeek[weekKey] = { orders: 0, revenue: 0, weekStart: weekKey };
    }
    byWeek[weekKey].orders += 1;
    byWeek[weekKey].revenue += order.totalPrice;
    
    // По месяцам
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { orders: 0, revenue: 0, monthStart: monthKey };
    }
    byMonth[monthKey].orders += 1;
    byMonth[monthKey].revenue += order.totalPrice;
    
    totalRevenue += order.totalPrice;
    
    // Обрабатываем товары
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        // Пробуем разные форматы данных
        const productName = item.productName || item.name || 'Неизвестный товар';
        const quantity = item.quantity || item.qty || 1;
        const price = item.price || 0;
        
        if (!byProduct[productName]) {
          byProduct[productName] = {
            productName,
            quantity: 0,
            totalRevenue: 0
          };
        }
        byProduct[productName].quantity += quantity;
        byProduct[productName].totalRevenue += price * quantity;
      }
    }
  }

  // Топ товаров
  const topProducts = Object.values(byProduct)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Сортируем данные по периодам
  const dailyData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  const weeklyData = Object.values(byWeek).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const monthlyData = Object.values(byMonth).sort((a, b) => a.monthStart.localeCompare(b.monthStart));

  console.log('📊 Analytics: топ товаров:', topProducts.length);
  console.log('📊 Analytics: общий доход:', totalRevenue);
  console.log('📊 Analytics: дней с данными:', dailyData.length);
  console.log('📊 Analytics: недель с данными:', weeklyData.length);
  console.log('📊 Analytics: месяцев с данными:', monthlyData.length);

  return {
    revenue: totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    topProducts,
    byHour,
    byDay: dailyData,
    byWeek: weeklyData,
    byMonth: monthlyData
  };
}

// Функция для получения начала недели (понедельник)
function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
