/**
 * Статусы заказа - полный жизненный цикл
 */
export enum OrderStatus {
  // Начальные статусы
  NEW = 'new',                    // Новый заказ от клиента
  ACCEPTED = 'accepted',          // Принят баристой
  
  // Процесс приготовления
  PREPARING = 'preparing',        // Готовится (попадает в доставку)
  READY = 'ready',               // Готов (ждёт курьера)
  
  // Процесс доставки (только для delivery orders)
  ASSIGNED = 'assigned',          // Назначен курьеру
  PICKED_UP = 'picked_up',       // Курьер забрал
  ON_THE_WAY = 'on_the_way',     // В пути к клиенту
  DELIVERED = 'delivered',        // Доставлено
  
  // Финальные статусы
  COMPLETED = 'completed',        // Завершено (для самовывоза)
  CANCELLED = 'cancelled',        // Отменено
}

/**
 * Тип заказа
 */
export enum OrderType {
  DELIVERY = 'delivery',    // Доставка
  PICKUP = 'pickup',        // Самовывоз
  DINE_IN = 'dine_in',     // В заведении
}

/**
 * Переходы статусов для разных типов заказов
 */
export const ORDER_STATUS_FLOW = {
  [OrderType.DELIVERY]: [
    OrderStatus.NEW,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.ASSIGNED,
    OrderStatus.PICKED_UP,
    OrderStatus.ON_THE_WAY,
    OrderStatus.DELIVERED,
  ],
  [OrderType.PICKUP]: [
    OrderStatus.NEW,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
  ],
  [OrderType.DINE_IN]: [
    OrderStatus.NEW,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
  ],
};

/**
 * Метаданные статусов
 */
export const ORDER_STATUS_META = {
  [OrderStatus.NEW]: {
    label: 'Новый',
    color: 'blue',
    icon: '🆕',
    description: 'Новый заказ от клиента',
    notifyCustomer: false,
  },
  [OrderStatus.ACCEPTED]: {
    label: 'Принят',
    color: 'green',
    icon: '✅',
    description: 'Заказ принят в работу',
    notifyCustomer: true,
    notificationMessage: 'Ваш заказ принят и скоро будет готов!',
  },
  [OrderStatus.PREPARING]: {
    label: 'Готовится',
    color: 'yellow',
    icon: '👨‍🍳',
    description: 'Заказ готовится',
    notifyCustomer: false,
  },
  [OrderStatus.READY]: {
    label: 'Готов',
    color: 'purple',
    icon: '✨',
    description: 'Заказ готов к выдаче',
    notifyCustomer: true,
    notificationMessage: 'Ваш заказ готов!',
  },
  [OrderStatus.ASSIGNED]: {
    label: 'Назначен курьеру',
    color: 'indigo',
    icon: '🚚',
    description: 'Курьер получил заказ',
    notifyCustomer: true,
    notificationMessage: 'Курьер получил ваш заказ',
  },
  [OrderStatus.PICKED_UP]: {
    label: 'Забрал курьер',
    color: 'orange',
    icon: '📦',
    description: 'Курьер забрал заказ',
    notifyCustomer: true,
    notificationMessage: 'Курьер забрал ваш заказ',
  },
  [OrderStatus.ON_THE_WAY]: {
    label: 'В пути',
    color: 'cyan',
    icon: '🛵',
    description: 'Курьер едет к клиенту',
    notifyCustomer: true,
    notificationMessage: 'Курьер едет к вам!',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Доставлено',
    color: 'green',
    icon: '🎉',
    description: 'Заказ доставлен клиенту',
    notifyCustomer: true,
    notificationMessage: 'Заказ доставлен. Приятного аппетита!',
  },
  [OrderStatus.COMPLETED]: {
    label: 'Завершено',
    color: 'green',
    icon: '✅',
    description: 'Заказ завершён',
    notifyCustomer: false,
  },
  [OrderStatus.CANCELLED]: {
    label: 'Отменено',
    color: 'red',
    icon: '❌',
    description: 'Заказ отменён',
    notifyCustomer: true,
    notificationMessage: 'Заказ отменён',
  },
} as const;

/**
 * Роли, которые могут изменять статус
 */
export const STATUS_PERMISSIONS = {
  [OrderStatus.NEW]: [],  // Автоматически при создании
  [OrderStatus.ACCEPTED]: ['admin', 'barista'],
  [OrderStatus.PREPARING]: ['admin', 'barista'],
  [OrderStatus.READY]: ['admin', 'barista'],
  [OrderStatus.ASSIGNED]: ['admin'],
  [OrderStatus.PICKED_UP]: ['admin', 'courier'],
  [OrderStatus.ON_THE_WAY]: ['admin', 'courier'],
  [OrderStatus.DELIVERED]: ['admin', 'courier'],
  [OrderStatus.COMPLETED]: ['admin', 'barista'],
  [OrderStatus.CANCELLED]: ['admin'],
} as const;

/**
 * Проверка возможности перехода между статусами
 */
export function canTransitionStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: OrderType
): boolean {
  const flow = ORDER_STATUS_FLOW[orderType];
  const currentIndex = flow.indexOf(currentStatus);
  const newIndex = flow.indexOf(newStatus);
  
  // Можно перейти только на следующий статус или отменить
  if (newStatus === OrderStatus.CANCELLED) return true;
  if (currentIndex === -1 || newIndex === -1) return false;
  
  return newIndex === currentIndex + 1;
}

/**
 * Получить следующий доступный статус
 */
export function getNextStatus(
  currentStatus: OrderStatus,
  orderType: OrderType
): OrderStatus | null {
  const flow = ORDER_STATUS_FLOW[orderType];
  const currentIndex = flow.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex === flow.length - 1) {
    return null;
  }
  
  return flow[currentIndex + 1];
}

/**
 * Проверка, требует ли статус курьера
 */
export function requiresCourier(status: OrderStatus): boolean {
  return [
    OrderStatus.ASSIGNED,
    OrderStatus.PICKED_UP,
    OrderStatus.ON_THE_WAY,
    OrderStatus.DELIVERED,
  ].includes(status);
}

/**
 * Проверка, является ли статус финальным
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return [
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ].includes(status);
}
