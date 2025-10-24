import React, { useState, useEffect, useContext } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  QrCodeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { UserContext, type Role } from '@/contexts/UserContext';
import { safeApiRequestWithRetry } from '../utils/safeApi';
import { 
  formatOrderItemModifiers, 
  getOrderDisplayNumber 
} from '../utils/orderLocalization';
import { OrderStatusControl } from '@/components/OrderStatusControl';
import { OrderStatus, OrderType } from '@/types/orderStatus';

interface OrderItem { 
  name: string; 
  quantity: number; 
  price: number; 
  sizeKey?: string; 
  milkKey?: string; 
  syrupKey?: string;
  temperatureKey?: string;
  intensityKey?: string;
}

interface Order {
  id: string;
  orderNumberDisplay?: string;
  items: OrderItem[];
  amount: number;
  status: 'pending' | 'accepted' | 'ready' | 'completed' | 'preparing' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  date: string;
  customerName?: string;
  customerPhone?: string;
  bonusUsed?: number;
  deliveryType?: 'pickup' | 'delivery' | 'dine_in';
  courierId?: string;
}

/**
 * Map legacy status to new OrderStatus enum
 */
const mapToOrderStatus = (status: string): OrderStatus => {
  const mapping: Record<string, OrderStatus> = {
    'pending': OrderStatus.NEW,
    'accepted': OrderStatus.ACCEPTED,
    'preparing': OrderStatus.PREPARING,
    'ready': OrderStatus.READY,
    'assigned': OrderStatus.ASSIGNED,
    'picked_up': OrderStatus.PICKED_UP,
    'on_the_way': OrderStatus.ON_THE_WAY,
    'delivered': OrderStatus.DELIVERED,
    'completed': OrderStatus.COMPLETED,
    'cancelled': OrderStatus.CANCELLED,
  };
  return mapping[status] || OrderStatus.NEW;
};

/**
 * Map OrderType from deliveryType
 */
const mapToOrderType = (deliveryType?: 'pickup' | 'delivery' | 'dine_in'): OrderType => {
  const mapping: Record<string, OrderType> = {
    'pickup': OrderType.PICKUP,
    'delivery': OrderType.DELIVERY,
    'dine_in': OrderType.DINE_IN,
  };
  return mapping[deliveryType || 'pickup'] || OrderType.PICKUP;
};

// Types for API normalization to avoid any
type ApiOrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
  sizeKey?: string;
  milkKey?: string;
  syrupKey?: string;
  temperatureKey?: string;
  intensityKey?: string;
};

type ApiOrder = {
  id: string;
  orderNumberDisplay?: string;
  items?: ApiOrderItem[];
  amount?: number;
  status?: string;
  date?: string;
  createdAt?: { seconds?: number } | string | number | null;
  customerName?: string;
  customerPhone?: string;
  bonusUsed?: number;
  deliveryType?: 'pickup' | 'delivery';
}

/**
 * Мобильная версия управления заказами
 * Оптимизировано для работы на телефонах и планшетах
 */
const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'ready'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { user } = useContext(UserContext);
  const userRole: Role = user?.role || 'user';
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    fetchOrders();
    // Обновляем заказы каждые 5 секунд
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const result = await safeApiRequestWithRetry<{ orders: ApiOrder[] }>('orders', { action: 'get', admin: 'true' });
      
      if (!result.success) {
        setApiError(result.error || 'Неизвестная ошибка');
        return;
      }

      setApiError(null);
      const data = result.data;
      if (!data) {
        setOrders([]);
        return;
      }
        
        // Универсальная нормализация времени:
        const toIso = (o: Record<string, unknown>) => {
          // Firestore Timestamp -> ISO
          if (o?.createdAt && typeof o.createdAt === 'object' && 'seconds' in o.createdAt) {
            return new Date((o.createdAt as { seconds: number }).seconds * 1000).toISOString();
          }
          // Строка / число -> дата
          if (o?.createdAt && typeof o.createdAt === 'string') return new Date(o.createdAt).toISOString();
          if (o?.date && typeof o.date === 'string') return new Date(o.date).toISOString();
          return new Date().toISOString();
        };
        
        const normalized: Order[] = ((data.orders || []) as ApiOrder[]).map((o) => ({
          id: o.id,
          orderNumberDisplay: o.orderNumberDisplay,
          items: (o.items ?? []).map((it) => ({
            name: it.name ?? '',
            quantity: it.quantity ?? 0,
            price: it.price ?? 0,
            sizeKey: it.sizeKey,
            milkKey: it.milkKey,
            syrupKey: it.syrupKey,
            temperatureKey: it.temperatureKey,
            intensityKey: it.intensityKey,
          })),
          amount: o.amount ?? 0,
          status: (o.status as Order['status']) || 'pending',
          date: o.date || toIso(o as unknown as Record<string, unknown>),
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          bonusUsed: o.bonusUsed,
          deliveryType: o.deliveryType || 'pickup',
        }));
        
        setOrders(normalized);
      } catch (error) {
        if (error instanceof Error && error.message === 'NON_JSON_RESPONSE') {
          setApiError('Ошибка API: получен HTML вместо JSON');
        } else {
          setApiError(error instanceof Error ? error.message : 'Ошибка загрузки заказов');
        }
      }
  };

  /**
   * Ручное обновление списка заказов
   */
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'accepted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ready': return 'bg-green-50 text-green-700 border-green-200';
      case 'completed': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-5 h-5" />;
      case 'accepted': return <CheckCircleIcon className="w-5 h-5" />;
      case 'ready': return <BellIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Новый';
      case 'accepted': return 'В работе';
      case 'ready': return 'Готов';
      case 'completed': return 'Выдан';
      default: return status;
    }
  };

  const filteredOrders = orders.filter(order => order.status === activeTab);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-50 min-h-screen overflow-x-hidden w-full pb-20"
    >
      {apiError && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-red-600 text-white p-4 text-center text-sm font-medium"
        >
          <div className="max-w-4xl mx-auto">
            {apiError}
          </div>
        </motion.div>
      )}
      <div className="px-4 sm:px-6 py-8 w-full max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
              Заказы
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {userRole === 'admin' ? 'Администратор' : userRole === 'courier' ? 'Курьер' : 'Бариста'} · Автообновление каждые 5 сек
            </p>
          </div>
          <motion.button
            onClick={handleManualRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={prefersReducedMotion ? { y: 0 } : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? { y: 0 } : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { delay: 0.05 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-2 w-full"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {(['pending', 'accepted', 'ready'] as const).map((status) => {
            const count = orders.filter((o) => o.status === status).length;
            const isActive = activeTab === status;
            return (
              <motion.button
                key={status}
                onClick={() => setActiveTab(status)}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                className={`flex-shrink-0 px-6 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span>{getStatusText(status)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Orders */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full text-center text-slate-500 py-20 bg-white rounded-lg border border-slate-200"
              >
                <BellIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">
                  Нет заказов со статусом "{getStatusText(activeTab)}"
                </p>
                <p className="text-sm text-slate-500 mt-2">Заказы появятся здесь автоматически</p>
              </motion.div>
            ) : (
              filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  {/* Заголовок заказа */}
                  <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        Заказ #{getOrderDisplayNumber(order)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {new Date(order.date).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    
                    {/* Статус заказа */}
                    <div className={`px-3 py-1.5 rounded-md text-xs font-medium border ${getStatusColor(order.status)}`}>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Информация о клиенте */}
                  {(order.customerName || order.customerPhone) && (
                    <div className="mb-6 pb-4 border-b border-slate-100">
                      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                        Клиент
                      </h4>
                      <div className="space-y-2">
                        {order.customerName && (
                          <div className="text-sm text-slate-700">
                            {order.customerName}
                          </div>
                        )}
                        {order.customerPhone && (
                          <a 
                            href={`tel:${order.customerPhone}`} 
                            className="text-sm text-slate-900 hover:text-slate-700 font-medium"
                          >
                            {order.customerPhone}
                          </a>
                        )}
                      </div>
                      
                      {/* Тип доставки */}
                      <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                        {order.deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}
                      </div>
                    </div>
                  )}

                  {/* Позиции заказа */}
                  <div className="mb-6">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                      Состав заказа
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {order.items.map((item, idx) => {
                        const modifiers = formatOrderItemModifiers(item);
                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-start gap-4 py-3 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 mb-1">
                                <span className="text-slate-500 mr-2">×{item.quantity}</span>
                                {item.name}
                              </div>
                              {modifiers && (
                                <div className="text-xs text-slate-500 leading-relaxed">
                                  {modifiers}
                                </div>
                              )}
                            </div>
                            <span className="text-slate-900 font-semibold whitespace-nowrap">
                              {item.price * item.quantity} ₸
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Итого */}
                    <div className="mt-4 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                      <span className="font-semibold text-slate-900">Итого</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {order.amount} ₸
                      </span>
                    </div>
                    
                    {/* Использованные бонусы */}
                    {order.bonusUsed && order.bonusUsed > 0 && (
                      <div className="mt-3 text-sm text-amber-700">
                        Использовано бонусов: <span className="font-semibold">−{order.bonusUsed} ₸</span>
                      </div>
                    )}
                  </div>

                  {/* Status Control - Smart Action Button */}
                  <div className="mt-4">
                    <OrderStatusControl
                      orderId={order.id}
                      currentStatus={mapToOrderStatus(order.status)}
                      orderType={mapToOrderType(order.deliveryType)}
                      courierId={order.courierId}
                      onStatusChanged={async () => {
                        // Refresh orders after status change
                        await fetchOrders();
                      }}
                    />
                  </div>

                  {/* QR Code for Ready Orders (Pickup only) */}
                  {order.status === 'ready' && order.deliveryType === 'pickup' && (
                    <div className="mt-4 bg-slate-900 rounded-lg p-4 text-center">
                      <QrCodeIcon className="w-8 h-8 mx-auto mb-2 text-white" />
                      <div className="text-white font-bold text-lg">
                        {order.id.slice(-4).toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Код выдачи</div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default OrderManagement;
