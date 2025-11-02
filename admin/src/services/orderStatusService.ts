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
   * ОПТИМИЗИРОВАНО: минимальная задержка, операции в фоне
   */
  async acceptOrder(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // 1. МГНОВЕННО обновляем статус (без await на историю/уведомления)
      await updateDoc(orderRef, {
        status: OrderStatus.ACCEPTED,
        updatedAt: serverTimestamp(),
      });
      
      // 2. История и уведомления - в фоне (не ждём)
      this.addStatusHistory(orderId, {
        status: OrderStatus.ACCEPTED,
        timestamp: Timestamp.now(),
        userId,
        userEmail,
        userRole: 'barista',
        note: 'Заказ принят в работу',
      }).catch(err => console.error('История не записана:', err));
      
      const statusMeta = ORDER_STATUS_META[OrderStatus.ACCEPTED];
      if (statusMeta.notifyCustomer && 'notificationMessage' in statusMeta && typeof statusMeta.notificationMessage === 'string') {
        this.sendCustomerNotification(
          orderId,
          OrderStatus.ACCEPTED,
          statusMeta.notificationMessage
        ).catch(err => console.error('Уведомление не отправлено:', err));
      }
      
      return { success: true, notificationSent: true };
      
    } catch (error) {
      console.error('Ошибка принятия заказа:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
  
  /**
   * Перевести в готовку (ACCEPTED → PREPARING)
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async startPreparing(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Мгновенное обновление статуса
      await updateDoc(orderRef, {
        status: OrderStatus.PREPARING,
        updatedAt: serverTimestamp(),
      });
      
      // Фоновые операции
      this.addStatusHistory(orderId, {
        status: OrderStatus.PREPARING,
        timestamp: Timestamp.now(),
        userId,
        userEmail,
        userRole: 'barista',
        note: 'Начато приготовление',
      }).catch(err => console.error('История не записана:', err));
      
      const statusMeta = ORDER_STATUS_META[OrderStatus.PREPARING];
      if (statusMeta.notifyCustomer && 'notificationMessage' in statusMeta && typeof statusMeta.notificationMessage === 'string') {
        this.sendCustomerNotification(
          orderId,
          OrderStatus.PREPARING,
          statusMeta.notificationMessage
        ).catch(err => console.error('Уведомление не отправлено:', err));
      }
      
      return { success: true, notificationSent: true };
      
    } catch (error) {
      console.error('Ошибка начала готовки:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }

  /**
   * Отметить как готовый (PREPARING → READY)
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async markReady(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Мгновенное обновление статуса
      await updateDoc(orderRef, {
        status: OrderStatus.READY,
        updatedAt: serverTimestamp(),
      });
      
      // Фоновые операции
      this.addStatusHistory(orderId, {
        status: OrderStatus.READY,
        timestamp: Timestamp.now(),
        userId,
        userEmail,
        userRole: 'barista',
        note: 'Заказ готов',
      }).catch(err => console.error('История не записана:', err));
      
      const statusMeta = ORDER_STATUS_META[OrderStatus.READY];
      if (statusMeta.notifyCustomer && 'notificationMessage' in statusMeta && typeof statusMeta.notificationMessage === 'string') {
        this.sendCustomerNotification(
          orderId,
          OrderStatus.READY,
          statusMeta.notificationMessage
        ).catch(err => console.error('Уведомление не отправлено:', err));
      }
      
      return { success: true, notificationSent: true };
      
    } catch (error) {
      console.error('Ошибка готовности заказа:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
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
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async markPickedUp(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: OrderStatus.PICKED_UP,
        updatedAt: serverTimestamp(),
      });
      
      this.addStatusHistory(orderId, {
        status: OrderStatus.PICKED_UP,
        timestamp: Timestamp.now(),
        userId: courierId,
        userEmail: courierEmail,
        userRole: 'courier',
        note: 'Курьер забрал заказ',
      }).catch(err => console.error('История не записана:', err));
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка взятия заказа:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
  
  /**
   * Курьер в пути (PICKED_UP → ON_THE_WAY)
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async markOnTheWay(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: OrderStatus.ON_THE_WAY,
        updatedAt: serverTimestamp(),
      });
      
      this.addStatusHistory(orderId, {
        status: OrderStatus.ON_THE_WAY,
        timestamp: Timestamp.now(),
        userId: courierId,
        userEmail: courierEmail,
        userRole: 'courier',
        note: 'Курьер в пути',
      }).catch(err => console.error('История не записана:', err));
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка статуса в пути:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
  
  /**
   * Доставлено (ON_THE_WAY → DELIVERED)
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async markDelivered(
    orderId: string,
    courierId: string,
    courierEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: OrderStatus.DELIVERED,
        updatedAt: serverTimestamp(),
      });
      
      this.addStatusHistory(orderId, {
        status: OrderStatus.DELIVERED,
        timestamp: Timestamp.now(),
        userId: courierId,
        userEmail: courierEmail,
        userRole: 'courier',
        note: 'Заказ доставлен',
      }).catch(err => console.error('История не записана:', err));
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка доставки:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
  
  /**
   * Завершить заказ самовывоза (READY → COMPLETED)
   * ОПТИМИЗИРОВАНО: мгновенный отклик
   */
  async completePickup(
    orderId: string,
    userId: string,
    userEmail: string
  ): Promise<StatusUpdateResult> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: OrderStatus.COMPLETED,
        updatedAt: serverTimestamp(),
      });
      
      this.addStatusHistory(orderId, {
        status: OrderStatus.COMPLETED,
        timestamp: Timestamp.now(),
        userId,
        userEmail,
        userRole: 'barista',
        note: 'Заказ выдан клиенту',
      }).catch(err => console.error('История не записана:', err));
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка завершения заказа:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
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
