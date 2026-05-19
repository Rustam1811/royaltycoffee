import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  ArrowPathIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { UserContext, type Role } from '@/contexts/UserContext';
import { db } from '../firebase';
import { 
  formatOrderItemModifiers, 
  getOrderDisplayNumber 
} from '../utils/orderLocalization';
import { OrderStatusControl } from '@/components/OrderStatusControl';
import { OrderStatus, OrderType } from '@/types/orderStatus';
import { useLocation, ALL_LOCATIONS_ID } from '@/contexts/LocationContext';

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
  status: 'pending' | 'accepted' | 'ready' | 'completed' | 'preparing' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled' | 'awaiting_approval';
  date: string;
  customerName?: string;
  customerPhone?: string;
  bonusUsed?: number;
  deliveryType?: 'pickup' | 'delivery' | 'dine_in';
  courierId?: string;
  locationId?: string;
  needsApproval?: boolean;
  approvedBy?: string;
  totalPrice?: number;
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
    'awaiting_approval': OrderStatus.NEW,
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
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'awaiting_approval'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<Date>(new Date());
  
  const { user } = useContext(UserContext);
  const userRole: Role = user?.role || 'user';
  const prefersReducedMotion = useReducedMotion();
  const { locations, selectedLocationId, selectLocation, isOwner, isAllLocationsSelected } = useLocation();

  // Handle order approval/rejection
  const handleApproval = async (orderId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/order-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action,
          approvedBy: user?.name || user?.email || 'owner',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ошибка');
      }
      // Real-time listener will update UI automatically
    } catch (err: any) {
      setApiError(`Ошибка одобрения: ${err.message}`);
    }
  };

  // Real-time Firestore listener (replaces polling)
  useEffect(() => {
    console.log('🔥 Setting up real-time orders listener...');
    setApiError(null);

    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log(`📦 Real-time update: ${snapshot.docs.length} orders received`);
        
        const normalized: Order[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Normalize Firestore Timestamp to ISO string
          let dateStr = new Date().toISOString();
          if (data.createdAt instanceof Timestamp) {
            dateStr = data.createdAt.toDate().toISOString();
          } else if (data.createdAt && typeof data.createdAt === 'string') {
            dateStr = new Date(data.createdAt).toISOString();
          } else if (data.date && typeof data.date === 'string') {
            dateStr = new Date(data.date).toISOString();
          }

          return {
            id: doc.id,
            orderNumberDisplay: data.orderNumberDisplay || doc.id.substring(0, 8),
            items: (data.items || []).map((it: any) => ({
              name: it.name || '',
              quantity: it.quantity || 0,
              price: it.price || 0,
              sizeKey: it.sizeKey,
              milkKey: it.milkKey,
              syrupKey: it.syrupKey,
              temperatureKey: it.temperatureKey,
              intensityKey: it.intensityKey,
            })),
            amount: data.amount || 0,
            status: (data.status === 'NEW' ? 'pending' : data.status) || 'pending',
            date: dateStr,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            bonusUsed: data.bonusUsed,
            deliveryType: data.deliveryType || 'pickup',
            courierId: data.courierId,
            locationId: data.locationId,
            needsApproval: data.needsApproval || false,
            approvedBy: data.approvedBy || null,
            totalPrice: data.totalPrice || data.amount || 0,
          };
        });

        setOrders(normalized);
        setLastSuccessfulUpdate(new Date());
        setApiError(null);
      },
      (error) => {
        console.error('❌ Firestore listener error:', error);
        setApiError(`Real-time sync error: ${error.message}`);
      }
    );

    return () => {
      console.log('🔥 Cleaning up real-time listener');
      unsubscribe();
    };
  }, []); // Run once on mount

  // Manual refresh for UI feedback (real-time listener handles auto-updates)
  const handleManualRefresh = () => {
    setRefreshing(true);
    console.log('🔄 Manual refresh triggered (real-time listener active)');
    setTimeout(() => setRefreshing(false), 500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'preparing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ready': return 'bg-green-50 text-green-700 border-green-200';
      case 'completed': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'awaiting_approval': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-5 h-5" />;
      case 'preparing': return <CheckCircleIcon className="w-5 h-5" />;
      case 'ready': return <BellIcon className="w-5 h-5" />;
      case 'awaiting_approval': return <ShieldExclamationIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Новый';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      case 'completed': return 'Выдан';
      case 'awaiting_approval': return '⚠️ Одобрение';
      default: return status;
    }
  };

  // Filter by location first, then by status tab
  const locationFilteredOrders = useMemo(() => {
    if (isAllLocationsSelected) return orders;
    return orders.filter(o => o.locationId === selectedLocationId);
  }, [orders, isAllLocationsSelected, selectedLocationId]);

  const filteredOrders = locationFilteredOrders.filter(order => order.status === activeTab);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen overflow-x-hidden w-full pb-20"
    >
      {apiError && !apiError.includes('network') && !apiError.includes('Bad Request') && (
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
      <div className="px-3 sm:px-4 py-4 w-full max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              Заказы
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {userRole === 'admin' ? 'Администратор' : userRole === 'courier' ? 'Курьер' : 'Бариста'} · Обновление каждые 5 сек
              {lastSuccessfulUpdate && (
                <span className="ml-2 text-green-600">
                  ● Подключено
                </span>
              )}
            </p>
          </div>
          <motion.button
            onClick={handleManualRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </motion.div>

        {/* Фильтр по точкам (owner/superowner) */}
        {isOwner && locations.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <motion.button
                onClick={() => selectLocation(ALL_LOCATIONS_ID)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                  isAllLocationsSelected
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <BuildingStorefrontIcon className="h-4 w-4" />
                Все точки
              </motion.button>
              {locations.map(loc => (
                <motion.button
                  key={loc.id}
                  onClick={() => selectLocation(loc.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                    selectedLocationId === loc.id
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <MapPinIcon className="h-4 w-4" />
                  {loc.name}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <motion.div
          initial={prefersReducedMotion ? { y: 0 } : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? { y: 0 } : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { delay: 0.05 }}
          className="flex gap-2 mb-4 overflow-x-auto pb-2 w-full"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Awaiting approval tab — only for owner/superowner */}
          {isOwner && (() => {
            const approvalCount = locationFilteredOrders.filter((o) => o.status === 'awaiting_approval').length;
            const isActive = activeTab === 'awaiting_approval';
            return (
              <motion.button
                onClick={() => setActiveTab('awaiting_approval')}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg'
                    : approvalCount > 0
                      ? 'bg-red-50 text-red-700 border border-red-300 shadow-sm hover:shadow-md animate-pulse'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldExclamationIcon className="w-5 h-5" />
                  <span>Одобрение</span>
                  {approvalCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {approvalCount}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })()}
          {(['pending', 'preparing', 'ready'] as const).map((status) => {
            const count = locationFilteredOrders.filter((o) => o.status === status).length;
            const isActive = activeTab === status;
            return (
              <motion.button
                key={status}
                onClick={() => setActiveTab(status)}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span>{getStatusText(status)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
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
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full text-center text-slate-500 py-12 bg-white rounded-xl border border-slate-200 shadow-sm"
              >
                <BellIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-base font-medium text-slate-700">
                  Нет заказов со статусом "{getStatusText(activeTab)}"
                </p>
                <p className="text-xs text-slate-500 mt-1">Заказы появятся здесь автоматически</p>
              </motion.div>
            ) : (
              filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-md hover:border-slate-300 transition-all"
                >
                  {/* Заголовок заказа */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Заказ #{getOrderDisplayNumber(order)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(order.date).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    
                    {/* Статус заказа */}
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)}`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Информация о клиенте */}
                  {(order.customerName || order.customerPhone) && (
                    <div className="mb-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {order.customerName && (
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {order.customerName}
                            </div>
                          )}
                          {order.customerPhone && (
                            <a 
                              href={`tel:${order.customerPhone}`} 
                              className="text-xs text-slate-600 hover:text-slate-900"
                            >
                              {order.customerPhone}
                            </a>
                          )}
                        </div>
                        
                        {/* Тип доставки */}
                        <div className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                          {order.deliveryType === 'delivery' ? '🚗 Доставка' : '🏃 Самовывоз'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Позиции заказа */}
                  <div className="mb-3">
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {order.items.map((item, idx) => {
                        const modifiers = formatOrderItemModifiers(item);
                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-start gap-2 py-2 border-b border-slate-50 last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">
                                <span className="text-slate-500 mr-1.5">×{item.quantity}</span>
                                {item.name}
                              </div>
                              {modifiers && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {modifiers}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-slate-900 font-semibold whitespace-nowrap">
                              {item.price * item.quantity} ₸
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Итого */}
                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-900">Итого</span>
                      <span className="text-xl font-bold text-slate-900">
                        {order.amount} ₸
                      </span>
                    </div>
                    
                    {/* Использованные бонусы */}
                    {order.bonusUsed && order.bonusUsed > 0 && (
                      <div className="mt-2 text-xs text-amber-700">
                        Бонусы: <span className="font-semibold">−{order.bonusUsed} ₸</span>
                      </div>
                    )}
                  </div>

                  {/* Status Control / Approval Buttons */}
                  <div className="mt-3">
                    {order.status === 'awaiting_approval' && isOwner ? (
                      <div className="space-y-2">
                        <div className="text-center text-sm text-red-600 font-medium mb-2">
                          ⚠️ Сумма заказа: {order.totalPrice || order.amount} ₸ — требуется одобрение
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApproval(order.id, 'approve')}
                            className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            ✅ Одобрить
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApproval(order.id, 'reject')}
                            className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            ❌ Отклонить
                          </motion.button>
                        </div>
                      </div>
                    ) : order.status === 'awaiting_approval' ? (
                      <div className="text-center text-sm text-amber-600 font-medium py-3 bg-amber-50 rounded-lg">
                        ⏳ Ожидает одобрения владельца
                      </div>
                    ) : (
                      <OrderStatusControl
                        orderId={order.id}
                        currentStatus={mapToOrderStatus(order.status)}
                        orderType={mapToOrderType(order.deliveryType)}
                        courierId={order.courierId}
                        onOptimisticUpdate={(nextStatus) => {
                          setOrders(prevOrders => 
                            prevOrders.map(o => 
                              o.id === order.id 
                                ? { ...o, status: nextStatus.toLowerCase() as Order['status'] }
                                : o
                            )
                          );
                        }}
                        onStatusChanged={() => {
                          console.log('✅ Status updated - real-time listener will sync');
                        }}
                      />
                    )}
                  </div>
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
