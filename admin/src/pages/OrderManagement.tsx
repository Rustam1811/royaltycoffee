import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  QrCodeIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getUserRole, getCurrentUserId, UserRole } from '@/utils/userRoles';
import { safeApiRequestWithRetry } from '../utils/safeApi';

interface OrderItem { name: string; quantity: number; price: number; sizeKey?: string; milkKey?: string; syrupKey?: string; }
interface Order {
  id: string;
  orderNumberDisplay?: string;
  items: OrderItem[];
  amount: number;
  status: 'pending' | 'accepted' | 'ready' | 'completed';
  date: string;
  customerName?: string;
  customerPhone?: string;
  bonusUsed?: number;
  deliveryType?: 'pickup' | 'delivery';
}

// Types for API normalization to avoid any
type ApiOrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
  sizeKey?: string;
  milkKey?: string;
  syrupKey?: string;
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'ready'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const currentUserId = getCurrentUserId();
  const userRole = getUserRole(currentUserId);
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoading(true);
    try {
      const result = await safeApiRequestWithRetry('orders', { action: 'update' }, {
        method: 'POST',
        body: JSON.stringify({ orderId, status: newStatus })
      });
      
      if (result.success) {
        await fetchOrders();
      } else {
        setApiError(result.error || 'Ошибка обновления статуса заказа');
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Неизвестная ошибка при обновлении заказа');
    } finally {
      setLoading(false);
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
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'accepted': return <CheckCircleIcon className="w-4 h-4" />;
      case 'ready': return <BellIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Новый заказ';
      case 'accepted': return 'В процессе';
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
      className="bg-gradient-to-b from-slate-100 via-slate-100 to-white min-h-screen overflow-x-hidden w-full pb-20"
    >
      {apiError && (
        <div className="bg-red-500 text-white p-3 text-center text-sm font-medium">
          ⚠️ {apiError}
        </div>
      )}
      <div className="px-2 sm:px-5 py-3 w-full max-w-full sm:max-w-4xl mx-auto box-border">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900">
              📋 Заказы
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • Автообновление
            </p>
          </div>
          <motion.button
            onClick={handleManualRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 sm:p-3 bg-slate-900 text-white rounded-full shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] hover:bg-black transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={prefersReducedMotion ? { y: 0 } : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? { y: 0 } : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { delay: 0.05 }}
          className="flex gap-1.5 mb-3 overflow-x-auto pb-1 w-full scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {(['pending', 'accepted', 'ready'] as const).map((status) => {
            const count = orders.filter((o) => o.status === status).length;
            const isActive = activeTab === status;
            return (
              <motion.button
                key={status}
                onClick={() => setActiveTab(status)}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border font-semibold text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 shadow hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(status)}
                  <span>{getStatusText(status)}</span>
                  <span
                    className={`px-1 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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
            className="space-y-3"
          >
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-slate-600 py-10 bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)]"
              >
                <BellIcon className="w-10 h-10 mx-auto mb-3 opacity-50 text-slate-400" />
                <p className="text-xs sm:text-base">
                  Нет заказов со статусом "{getStatusText(activeTab)}"
                </p>
              </motion.div>
            ) : (
              filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] p-3 sm:p-5 hover:shadow-[0_20px_56px_-20px_rgba(0,0,0,0.45)] transition"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 break-all">
                        ☕ Заказ #{order.orderNumberDisplay || order.id.slice(-6)}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-slate-600">
                        {new Date(order.date).toLocaleString()}
                      </p>
                      {/* Информация о клиенте */}
                      {(order.customerName || order.customerPhone) && (
                        <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                          {order.customerName && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">👤</span>
                              <span>{order.customerName}</span>
                            </div>
                          )}
                          {order.customerPhone && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">📱</span>
                              <a 
                                href={`tel:${order.customerPhone}`} 
                                className="text-blue-600 hover:underline"
                              >
                                {order.customerPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Тип доставки */}
                      <div className="mt-1 text-xs font-semibold flex items-center gap-1">
                        {order.deliveryType === 'delivery' ? (
                          <>
                            <span>🚗</span>
                            <span className="text-blue-600">Доставка</span>
                          </>
                        ) : (
                          <>
                            <span>🏪</span>
                            <span className="text-emerald-600">Самовывоз</span>
                          </>
                        )}
                      </div>
                    </div>
                    <motion.div
                      className={`px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold ${getStatusColor(
                        order.status
                      )} whitespace-nowrap`}
                    >
                      {getStatusText(order.status)}
                    </motion.div>
                  </div>

                  <div className="mb-3 bg-slate-50 rounded-2xl p-2 sm:p-3">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1">
                      Позиции:
                    </h4>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs py-1 px-1 rounded-md hover:bg-white/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-900 truncate max-w-[60%]">
                              {item.name} × {item.quantity}
                            </div>
                            {(item.sizeKey || item.milkKey || item.syrupKey) && (
                              <div className="text-[10px] text-slate-600 truncate max-w-[80%]">
                                {[item.sizeKey && `Размер: ${item.sizeKey}`, item.milkKey && `Молоко: ${item.milkKey}`, item.syrupKey && `Сироп: ${item.syrupKey}`]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-900 font-semibold ml-2 whitespace-nowrap">
                            {item.price * item.quantity} ₸
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 mt-2 pt-1 flex justify-between font-bold text-xs sm:text-base">
                      <span className="text-slate-900">💰 Итого:</span>
                      <span className="text-slate-900 sm:text-lg font-bold">{order.amount} ₸</span>
                    </div>
                    {order.bonusUsed && order.bonusUsed > 0 && (
                      <div className="text-[10px] sm:text-xs text-amber-600 mt-1">
                        🎁 Использовано бонусов: -{order.bonusUsed} ₸
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 w-full">
                    {order.status === 'pending' && (
                      <motion.button
                        onClick={() => updateOrderStatus(order.id, 'accepted')}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 min-w-[120px] max-w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-2xl font-semibold shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] active:shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" /> ✅ Принять
                      </motion.button>
                    )}
                    {order.status === 'accepted' && (
                      <motion.button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 min-w-[120px] max-w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-2xl font-semibold shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] active:shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <BellIcon className="w-5 h-5" /> 🔔 Готово
                      </motion.button>
                    )}
                    {order.status === 'ready' && (
                      <div className="flex-1 min-w-[160px] space-y-2">
                        <div className="bg-slate-900 rounded-2xl p-2 text-center shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]">
                          <QrCodeIcon className="w-6 h-6 mx-auto mb-1 text-white" />
                          <div className="text-white font-bold text-xs sm:text-base">
                            QR: {order.id.slice(-4)}
                          </div>
                          <div className="text-[9px] text-white/80">Код для выдачи</div>
                        </div>
                        <motion.button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          disabled={loading}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-2xl font-semibold shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] active:shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <EyeIcon className="w-5 h-5" /> 📦 Выдать
                        </motion.button>
                      </div>
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
