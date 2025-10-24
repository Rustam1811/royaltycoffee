# 🎯 Quick Start - Система статусов заказов

## Что было создано

✅ **Типы и константы** (`admin/src/types/orderStatus.ts`)
- Enum для всех статусов
- Метаданные (цвет, иконка, текст)
- Логика переходов между статусами
- Права доступа по ролям

✅ **Сервис** (`admin/src/services/orderStatusService.ts`)
- Методы для каждого перехода статуса
- Валидация
- Отправка уведомлений
- Логирование истории

✅ **UI Компоненты**
- `OrderStatusControl.tsx` - кнопка для смены статуса
- `OrderStatusTimeline.tsx` - визуальная шкала прогресса

---

## 🚀 Как использовать в OrderManagement

### 1. Импорты

```typescript
import { OrderStatusControl } from '@/components/OrderStatusControl';
import { OrderStatus, OrderType } from '@/types/orderStatus';
```

### 2. Добавить в список заказов

```tsx
{orders.map(order => (
  <div key={order.id} className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h3>Заказ {order.orderNumber}</h3>
        <p>{order.customerName}</p>
      </div>
      
      {/* Контроль статуса */}
      <OrderStatusControl
        orderId={order.id}
        currentStatus={order.status as OrderStatus}
        orderType={order.type as OrderType}
        courierId={order.courierId}
        onStatusChanged={() => fetchOrders()}
      />
    </div>
  </div>
))}
```

---

## 🚚 Как использовать в CourierDashboard

### 1. Импорты

```typescript
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { orderStatusService } from '@/services/orderStatusService';
import { OrderStatus, OrderType } from '@/types/orderStatus';
```

### 2. Показать прогресс доставки

```tsx
{deliveries.map(delivery => (
  <div key={delivery.id} className="border rounded-lg p-4">
    <h3>Заказ {delivery.orderNumber}</h3>
    
    {/* Timeline */}
    <OrderStatusTimeline
      currentStatus={delivery.status as OrderStatus}
      orderType={OrderType.DELIVERY}
      compact={true}
    />
    
    {/* Кнопки для курьера */}
    <div className="mt-4 space-y-2">
      {delivery.status === 'assigned' && (
        <button onClick={() => handlePickup(delivery.id)}>
          📦 Забрал заказ
        </button>
      )}
      {delivery.status === 'picked_up' && (
        <button onClick={() => handleOnTheWay(delivery.id)}>
          🛵 В пути
        </button>
      )}
      {delivery.status === 'on_the_way' && (
        <button onClick={() => handleDelivered(delivery.id)}>
          🎉 Доставлено
        </button>
      )}
    </div>
  </div>
))}
```

### 3. Обработчики

```typescript
const handlePickup = async (orderId: string) => {
  const result = await orderStatusService.markPickedUp(
    orderId,
    user!.uid,
    user!.email || ''
  );
  if (result.success) {
    loadDeliveries();
  }
};

const handleOnTheWay = async (orderId: string) => {
  const result = await orderStatusService.markOnTheWay(
    orderId,
    user!.uid,
    user!.email || ''
  );
  if (result.success) {
    loadDeliveries();
  }
};

const handleDelivered = async (orderId: string) => {
  const result = await orderStatusService.markDelivered(
    orderId,
    user!.uid,
    user!.email || ''
  );
  if (result.success) {
    loadDeliveries();
  }
};
```

---

## 📦 Интеграция с DeliveryManagement

### Фильтр заказов на доставку

```typescript
// Показываем только заказы со статусами, которые относятся к доставке
const deliveryOrders = orders.filter(order => 
  order.type === 'delivery' && 
  ['preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(order.status)
);
```

### Группировка по статусам

```typescript
const groupedOrders = {
  preparing: deliveryOrders.filter(o => o.status === 'preparing'),
  ready: deliveryOrders.filter(o => o.status === 'ready'),
  inTransit: deliveryOrders.filter(o => 
    ['assigned', 'picked_up', 'on_the_way'].includes(o.status)
  ),
};
```

---

## 🎨 Пример полного workflow

```typescript
// Бариста принимает заказ
await orderStatusService.acceptOrder(orderId, userId, userEmail);
// → Клиент получает: "Ваш заказ принят и скоро будет готов!"

// Бариста начинает готовку
await orderStatusService.startPreparing(orderId, userId, userEmail);

// Бариста отмечает готовность
await orderStatusService.markReady(orderId, userId, userEmail);
// → Клиент получает: "Ваш заказ готов!"

// Админ назначает курьера
await orderStatusService.assignCourier(orderId, courierId, userId, userEmail);
// → Клиент получает: "Курьер получил ваш заказ"

// Курьер забирает
await orderStatusService.markPickedUp(orderId, courierId, courierEmail);
// → Клиент получает: "Курьер забрал ваш заказ"

// Курьер едет
await orderStatusService.markOnTheWay(orderId, courierId, courierEmail);
// → Клиент получает: "Курьер едет к вам!"

// Курьер доставил
await orderStatusService.markDelivered(orderId, courierId, courierEmail);
// → Клиент получает: "Заказ доставлен. Приятного аппетита!"
```

---

## 🔥 Следующие шаги

1. **Интегрировать OrderStatusControl в OrderManagement.tsx**
   - Заменить текущие кнопки статусов на новый компонент

2. **Обновить CourierDashboard.tsx**
   - Добавить OrderStatusTimeline
   - Использовать orderStatusService для обновлений

3. **Настроить Firestore**
   - Убедиться что orders имеют поля: `type`, `status`, `courierId`
   - Создать подколлекцию `statusHistory`

4. **Создать Cloud Function**
   - Слушать изменения статуса
   - Отправлять push-уведомления

5. **Протестировать**
   - Создать тестовый заказ на доставку
   - Пройти весь цикл статусов
   - Проверить уведомления

---

## 📝 Заметки

- Все методы сервиса возвращают `{success: boolean, error?: string, notificationSent?: boolean}`
- Компоненты автоматически определяют доступные переходы
- История изменений сохраняется в `orders/{orderId}/statusHistory`
- Уведомления отправляются автоматически (требуется настройка)

---

**Создано**: 23 октября 2025
**Готово к интеграции**: ✅
