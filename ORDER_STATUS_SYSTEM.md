# 📦 Система управления статусами заказов

## Обзор

Полная система управления жизненным циклом заказов с поддержкой:
- ✅ Разные типы заказов (доставка/самовывоз/в заведении)
- ✅ Пошаговые переходы статусов
- ✅ Автоматические уведомления клиентам
- ✅ История изменений
- ✅ Контроль прав доступа по ролям

---

## 🔄 Жизненный цикл заказа

### 📦 Доставка (Delivery)

```
1. NEW (новый)
   ↓ Бариста нажимает "Принять"
   
2. ACCEPTED (принят) 
   ↓ Автоматически переходит / Бариста нажимает "Начать готовку"
   📱 Уведомление клиенту: "Ваш заказ принят и скоро будет готов!"
   
3. PREPARING (готовится)
   ↓ Бариста нажимает "Готов"
   
4. READY (готов)
   ↓ Админ назначает курьера
   📱 Уведомление клиенту: "Ваш заказ готов!"
   
5. ASSIGNED (назначен курьеру)
   ↓ Курьер нажимает "Забрал заказ"
   📱 Уведомление клиенту: "Курьер получил ваш заказ"
   
6. PICKED_UP (забрал)
   ↓ Курьер нажимает "В пути"
   📱 Уведомление клиенту: "Курьер забрал ваш заказ"
   
7. ON_THE_WAY (в пути)
   ↓ Курьер нажимает "Доставлено"
   📱 Уведомление клиенту: "Курьер едет к вам!"
   
8. DELIVERED (доставлено) ✅
   📱 Уведомление клиенту: "Заказ доставлен. Приятного аппетита!"
```

### 🏃 Самовывоз (Pickup)

```
1. NEW (новый)
   ↓ Бариста нажимает "Принять"
   
2. ACCEPTED (принят)
   ↓ Бариста нажимает "Начать готовку"
   📱 Уведомление клиенту: "Ваш заказ принят и скоро будет готов!"
   
3. PREPARING (готовится)
   ↓ Бариста нажимает "Готов"
   
4. READY (готов)
   ↓ Бариста нажимает "Завершить" (клиент забрал)
   📱 Уведомление клиенту: "Ваш заказ готов!"
   
5. COMPLETED (завершено) ✅
```

---

## 📱 Автоматические уведомления

Клиент получает push-уведомления на каждом ключевом этапе:

| Статус | Когда | Сообщение |
|--------|-------|-----------|
| **ACCEPTED** | Бариста принял | "Ваш заказ принят и скоро будет готов!" |
| **READY** | Заказ готов | "Ваш заказ готов!" |
| **ASSIGNED** | Курьер назначен | "Курьер получил ваш заказ" |
| **PICKED_UP** | Курьер забрал | "Курьер забрал ваш заказ" |
| **ON_THE_WAY** | Курьер едет | "Курьер едет к вам!" |
| **DELIVERED** | Доставлено | "Заказ доставлен. Приятного аппетита!" |

---

## 👥 Права доступа по ролям

### 👑 Admin (Администратор)
- ✅ Все переходы статусов
- ✅ Назначение курьеров
- ✅ Отмена заказов

### ☕ Barista (Бариста)
- ✅ NEW → ACCEPTED (принять)
- ✅ ACCEPTED → PREPARING (начать готовку)
- ✅ PREPARING → READY (готов)
- ✅ READY → COMPLETED (выдать клиенту, только самовывоз)

### 🚚 Courier (Курьер)
- ✅ ASSIGNED → PICKED_UP (забрал)
- ✅ PICKED_UP → ON_THE_WAY (в пути)
- ✅ ON_THE_WAY → DELIVERED (доставлено)

---

## 🏗️ Архитектура

### 1. Типы и константы
**Файл**: `admin/src/types/orderStatus.ts`

```typescript
export enum OrderStatus {
  NEW = 'new',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  ON_THE_WAY = 'on_the_way',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  DINE_IN = 'dine_in',
}
```

### 2. Бизнес-логика
**Файл**: `admin/src/services/orderStatusService.ts`

```typescript
class OrderStatusService {
  // Обновление статуса с валидацией и уведомлениями
  async updateStatus(orderId, newStatus, userId, userEmail, userRole): Promise<Result>
  
  // Специфичные методы для каждого перехода
  async acceptOrder(orderId, userId, userEmail): Promise<Result>
  async startPreparing(orderId, userId, userEmail): Promise<Result>
  async markReady(orderId, userId, userEmail): Promise<Result>
  async assignCourier(orderId, courierId, userId, userEmail): Promise<Result>
  async markPickedUp(orderId, courierId, courierEmail): Promise<Result>
  async markOnTheWay(orderId, courierId, courierEmail): Promise<Result>
  async markDelivered(orderId, courierId, courierEmail): Promise<Result>
  async completePickup(orderId, userId, userEmail): Promise<Result>
  async cancelOrder(orderId, userId, userEmail, reason?): Promise<Result>
}
```

### 3. UI Компоненты

#### OrderStatusControl
**Файл**: `admin/src/components/OrderStatusControl.tsx`

Отображает текущий статус + кнопку для перехода на следующий

```tsx
<OrderStatusControl
  orderId="order-123"
  currentStatus={OrderStatus.PREPARING}
  orderType={OrderType.DELIVERY}
  courierId="courier-456"
  onStatusChanged={() => console.log('Статус изменён')}
/>
```

#### OrderStatusTimeline
**Файл**: `admin/src/components/OrderStatusTimeline.tsx`

Визуальная временная шкала прогресса заказа

```tsx
<OrderStatusTimeline
  currentStatus={OrderStatus.ON_THE_WAY}
  orderType={OrderType.DELIVERY}
  compact={false}
/>
```

---

## 🔥 Firestore структура

### Коллекция: `orders`

```typescript
{
  id: string;
  orderNumber: string;
  type: 'delivery' | 'pickup' | 'dine_in';
  status: OrderStatus;
  
  // Клиент
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Адрес (для delivery)
  deliveryAddress?: {
    street: string;
    apartment: string;
    entrance?: string;
    floor?: string;
    coordinates: { lat: number; lng: number };
  };
  
  // Курьер (для delivery)
  courierId?: string;
  assignedAt?: Timestamp;
  
  // Таймстампы
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  readyAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  
  // Финансы
  total: number;
  deliveryFee?: number;
}
```

### Подколлекция: `orders/{orderId}/statusHistory`

```typescript
{
  status: OrderStatus;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'barista' | 'courier';
  note?: string;
}
```

---

## 🚀 Использование

### Пример 1: Бариста принимает заказ

```typescript
import { orderStatusService } from '@/services/orderStatusService';

const handleAcceptOrder = async (orderId: string) => {
  const result = await orderStatusService.acceptOrder(
    orderId,
    user.uid,
    user.email
  );
  
  if (result.success) {
    console.log('✅ Заказ принят');
    if (result.notificationSent) {
      console.log('📱 Клиент уведомлён');
    }
  } else {
    alert(`Ошибка: ${result.error}`);
  }
};
```

### Пример 2: Админ назначает курьера

```typescript
const handleAssignCourier = async (orderId: string, courierId: string) => {
  const result = await orderStatusService.assignCourier(
    orderId,
    courierId,
    user.uid,
    user.email
  );
  
  if (result.success) {
    console.log('✅ Курьер назначен');
  }
};
```

### Пример 3: Курьер доставляет заказ

```typescript
const handleDelivered = async (orderId: string) => {
  const result = await orderStatusService.markDelivered(
    orderId,
    user.uid,  // courier ID
    user.email
  );
  
  if (result.success) {
    console.log('🎉 Заказ доставлен!');
  }
};
```

---

## 📊 Интеграция с существующими компонентами

### OrderManagement.tsx
```tsx
import { OrderStatusControl } from '@/components/OrderStatusControl';
import { OrderStatus, OrderType } from '@/types/orderStatus';

<OrderStatusControl
  orderId={order.id}
  currentStatus={order.status as OrderStatus}
  orderType={order.type as OrderType}
  courierId={order.courierId}
  onStatusChanged={fetchOrders}
/>
```

### CourierDashboard.tsx
```tsx
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';

<OrderStatusTimeline
  currentStatus={delivery.status}
  orderType={OrderType.DELIVERY}
  compact={true}
/>
```

### DeliveryManagement.tsx
```tsx
// Фильтр заказов на доставку по статусам
const deliveryOrders = orders.filter(order => 
  order.type === 'delivery' && 
  ['preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(order.status)
);
```

---

## ⚙️ Настройка уведомлений

### Cloud Function для отправки Push
**Файл**: `functions/src/notifications.ts`

```typescript
export const sendOrderNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newStatus = change.after.data().status;
    const customerId = change.after.data().customerId;
    
    const statusMeta = ORDER_STATUS_META[newStatus];
    
    if (statusMeta.notifyCustomer) {
      await sendPushNotification(
        customerId,
        'Обновление заказа',
        statusMeta.notificationMessage
      );
    }
  });
```

---

## ✅ Преимущества новой системы

1. **Чистый код** - Разделение ответственности (типы, сервис, UI)
2. **Type-safe** - TypeScript enum для статусов
3. **Гибкость** - Поддержка разных типов заказов
4. **Валидация** - Невозможно пропустить шаги
5. **Прозрачность** - История всех изменений
6. **UX** - Автоматические уведомления клиентам
7. **Масштабируемость** - Легко добавить новые статусы

---

## 🔜 Следующие шаги

1. ✅ Типы и константы созданы
2. ✅ Сервис статусов реализован
3. ✅ UI компоненты готовы
4. ⏳ Интегрировать в OrderManagement
5. ⏳ Интегрировать в CourierDashboard
6. ⏳ Настроить Cloud Function для уведомлений
7. ⏳ Добавить Firestore правила безопасности

---

**Дата создания**: 23 октября 2025
**Статус**: 🚧 В разработке
