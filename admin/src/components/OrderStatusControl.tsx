import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { UserContext } from '@/contexts/UserContext';
import { 
  OrderStatus, 
  OrderType,
  ORDER_STATUS_META,
  getNextStatus,
  isFinalStatus,
} from '@/types/orderStatus';
import { orderStatusService } from '@/services/orderStatusService';

interface OrderStatusControlProps {
  orderId: string;
  currentStatus: OrderStatus;
  orderType: OrderType;
  courierId?: string;
  onStatusChanged?: () => void;
}

/**
 * Компонент управления статусом заказа
 * 
 * Отображает текущий статус и кнопку для перехода на следующий
 * Учитывает роль пользователя и тип заказа
 */
export const OrderStatusControl: React.FC<OrderStatusControlProps> = ({
  orderId,
  currentStatus,
  orderType,
  courierId,
  onStatusChanged,
}) => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = React.useState(false);
  
  const nextStatus = getNextStatus(currentStatus, orderType);
  const nextStatusMeta = nextStatus ? ORDER_STATUS_META[nextStatus] : null;
  
  const isDelivery = orderType === OrderType.DELIVERY;
  const isFinal = isFinalStatus(currentStatus);
  
  /**
   * Обработка смены статуса
   */
  const handleStatusChange = async () => {
    if (!nextStatus || !user) return;
    
    setLoading(true);
    
    try {
      let result;
      
      // Используем специфичные методы сервиса
      switch (nextStatus) {
        case OrderStatus.ACCEPTED:
          result = await orderStatusService.acceptOrder(orderId, user.uid, user.email || '');
          break;
          
        case OrderStatus.PREPARING:
          result = await orderStatusService.startPreparing(orderId, user.uid, user.email || '');
          break;
          
        case OrderStatus.READY:
          result = await orderStatusService.markReady(orderId, user.uid, user.email || '');
          break;
          
        case OrderStatus.PICKED_UP:
          if (!courierId) {
            alert('Ошибка: курьер не назначен');
            return;
          }
          result = await orderStatusService.markPickedUp(orderId, courierId, user.email || '');
          break;
          
        case OrderStatus.ON_THE_WAY:
          if (!courierId) {
            alert('Ошибка: курьер не назначен');
            return;
          }
          result = await orderStatusService.markOnTheWay(orderId, courierId, user.email || '');
          break;
          
        case OrderStatus.DELIVERED:
          if (!courierId) {
            alert('Ошибка: курьер не назначен');
            return;
          }
          result = await orderStatusService.markDelivered(orderId, courierId, user.email || '');
          break;
          
        case OrderStatus.COMPLETED:
          result = await orderStatusService.completePickup(orderId, user.uid, user.email || '');
          break;
          
        default:
          result = { success: false, error: 'Неизвестный статус' };
      }
      
      if (result.success) {
        if (result.notificationSent) {
          console.log('✅ Уведомление клиенту отправлено');
        }
        onStatusChanged?.();
      } else {
        alert(`Ошибка: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Ошибка смены статуса:', error);
      alert('Произошла ошибка при обновлении статуса');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Текст кнопки для следующего статуса
   */
  const getButtonText = () => {
    if (!nextStatusMeta) return '';
    
    switch (nextStatus) {
      case OrderStatus.ACCEPTED:
        return '✅ Принять заказ';
      case OrderStatus.PREPARING:
        return '👨‍🍳 Начать готовку';
      case OrderStatus.READY:
        return '✨ Готов';
      case OrderStatus.PICKED_UP:
        return '📦 Забрал заказ';
      case OrderStatus.ON_THE_WAY:
        return '🛵 В пути';
      case OrderStatus.DELIVERED:
        return '🎉 Доставлено';
      case OrderStatus.COMPLETED:
        return '✅ Завершить';
      default:
        return `→ ${nextStatusMeta.label}`;
    }
  };
  
  return (
    <div className="w-full">
      {/* Кнопка действия - на всю ширину */}
      {!isFinal && nextStatus && nextStatusMeta ? (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleStatusChange}
          disabled={loading}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${loading 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-black text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Обновление...</span>
            </>
          ) : (
            <span>{getButtonText()}</span>
          )}
        </motion.button>
      ) : (
        /* Финальный статус - компактный */
        <div className="text-center py-2 text-sm text-slate-500 font-medium">
          {currentStatus === OrderStatus.CANCELLED ? '❌ Отменён' : '✅ Завершено'}
        </div>
      )}
      
      {/* Бейдж доставки - отдельной строкой если нужен */}
      {isDelivery && !isFinal && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded border border-purple-200">
            🚚 Доставка
          </span>
        </div>
      )}
    </div>
  );
};
