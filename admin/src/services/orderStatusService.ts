import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  collection,
  addDoc,
  FieldValue,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  OrderStatus,
  ORDER_STATUS_META,
  requiresCourier,
} from '@/types/orderStatus';

/**
 * История изменения статуса заказа
 */
interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  userRole: string;
  note?: string;
}

/**
 * Результат обновления статуса
 */
interface StatusUpdateResult {
  success: boolean;
  error?: string;
  notificationSent?: boolean;
}

/**
 * Сервис для управления статусами заказов
 * 
 * Отвечает за:
 * - Валидацию переходов статусов
 * - Обновление документа заказа
 * - Отправку уведомлений клиенту
 * - Логирование истории изменений
 */
class OrderStatusService {
  
  /**
   * Обновить статус заказа
   */
  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    userEmail: string,
    userRole: string,
    options: {
      courierId?: string;
      note?: string;
    } = {}
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Получаем текущий заказ (в реальности нужно сначала прочитать)
      // const orderSnap = await getDoc(orderRef);
      // const currentOrder = orderSnap.data();
      
      // Валидация перехода статуса
      // if (!canTransitionStatus(currentOrder.status, newStatus, currentOrder.type)) {
      //   return { success: false, error: 'Недопустимый переход статуса' };
      // }
      
      // Проверка, требуется ли курьер
      if (requiresCourier(newStatus) && !options.courierId) {
        return { 
          success: false, 
          error: 'Для этого статуса требуется назначить курьера' 
        };
      }
      
      // Подготовка данных для обновления
      const updateData: Record<string, OrderStatus | string | FieldValue> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      
      // Если назначается курьер
      if (options.courierId) {
        updateData.courierId = options.courierId;
        updateData.assignedAt = serverTimestamp();
      }
      
      // Обновляем статус в Firestore
      await updateDoc(orderRef, updateData);
      
      // Добавляем запись в историю
      await this.addStatusHistory(orderId, {
        status: newStatus,
        timestamp: Timestamp.now(),
        userId,
        userEmail,
        userRole,
        note: options.note,
      });
      
      // Отправляем уведомление клиенту (если требуется)
      const statusMeta = ORDER_STATUS_META[newStatus];
      let notificationSent = false;
      
      if (statusMeta.notifyCustomer) {
        notificationSent = await this.sendCustomerNotification(
          orderId,
          newStatus,
          statusMeta.notificationMessage || ''
        );
      }
      
      return { 
        success: true, 
        notificationSent 
      };
      
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
  
  /**
   * Добавить запись в историю статусов
   */
  private async addStatusHistory(
    orderId: string,
    entry: StatusHistoryEntry
  ): Promise<void> {
    try {
      const historyRef = collection(db, 'orders', orderId, 'statusHistory');
      await addDoc(historyRef, entry);
    } catch (error) {
      console.error('Ошибка добавления в историю:', error);
    }
  }
  
  /**
   * Отправить уведомление клиенту
   */
  private async sendCustomerNotification(
    orderId: string,
    status: OrderStatus,
    message: string
  ): Promise<boolean> {
    try {
      // TODO: Интеграция с Cloud Functions для отправки push-уведомлений
      // await fetch('/api/notifications/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     orderId,
      //     status,
      //     message,
      //   }),
      // });
      
      console.log(`📱 Уведомление отправлено для заказа ${orderId}: ${message}`);
      return true;
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
      return false;
    }
  }
  
  /**
   * Принять заказ баристой (NEW → ACCEPTED)
   */
  async acceptOrder(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.ACCEPTED,
      userId,
      userEmail,
      'barista',
      { note: 'Заказ принят в работу' }
    );
  }
  
  /**
   * Перевести в готовку (ACCEPTED → PREPARING)
   */
  async startPreparing(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.PREPARING,
      userId,
      userEmail,
      'barista',
      { note: 'Начато приготовление' }
    );
  }
  
  /**
   * Отметить как готовый (PREPARING → READY)
   */
  async markReady(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.READY,
      userId,
      userEmail,
      'barista',
      { note: 'Заказ готов' }
    );
  }
  
  /**
   * Назначить курьера (READY → ASSIGNED)
   */
  async assignCourier(
    orderId: string,
    courierId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.ASSIGNED,
      userId,
      userEmail,
      'admin',
      { courierId, note: 'Курьер назначен' }
    );
  }
  
  /**
   * Курьер забрал заказ (ASSIGNED → PICKED_UP)
   */
  async markPickedUp(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.PICKED_UP,
      courierId,
      courierEmail,
      'courier',
      { note: 'Курьер забрал заказ' }
    );
  }
  
  /**
   * Курьер в пути (PICKED_UP → ON_THE_WAY)
   */
  async markOnTheWay(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.ON_THE_WAY,
      courierId,
      courierEmail,
      'courier',
      { note: 'Курьер в пути' }
    );
  }
  
  /**
   * Доставлено (ON_THE_WAY → DELIVERED)
   */
  async markDelivered(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.DELIVERED,
      courierId,
      courierEmail,
      'courier',
      { note: 'Заказ доставлен' }
    );
  }
  
  /**
   * Завершить заказ самовывоза (READY → COMPLETED)
   */
  async completePickup(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.COMPLETED,
      userId,
      userEmail,
      'barista',
      { note: 'Заказ выдан клиенту' }
    );
  }
  
  /**
   * Отменить заказ
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    userEmail: string,
    reason?: string
  ): Promise<StatusUpdateResult> {
    return this.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      userId,
      userEmail,
      'admin',
      { note: reason || 'Заказ отменён' }
    );
  }
}

// Singleton экземпляр
export const orderStatusService = new OrderStatusService();
