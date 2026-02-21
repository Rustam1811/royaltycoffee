import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, Badge, Button, PageLoader } from '@/components/ui';
import { getAllOrders, updateOrderStatus } from '@/services';
import { WorkshopOrder, OrderStatus, LocalizedString } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info'; icon: React.ElementType }> = {
  pending: { label: 'Ожидает', variant: 'warning', icon: ClockIcon },
  confirmed: { label: 'Подтверждён', variant: 'info', icon: CheckCircleIcon },
  in_production: { label: 'Готовится', variant: 'info', icon: PlayIcon },
  ready: { label: 'Готов', variant: 'success', icon: CheckCircleIcon },
  delivered: { label: 'Доставлен', variant: 'success', icon: TruckIcon },
  cancelled: { label: 'Отменён', variant: 'danger', icon: XCircleIcon },
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

type FilterStatus = 'all' | OrderStatus;

/**
 * Страница управления заказами для админа цеха
 */
const OrdersManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [_selectedOrder, _setSelectedOrder] = useState<WorkshopOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Suppress unused variable warnings - будет использоваться для модального просмотра заказа
  void _selectedOrder;
  void _setSelectedOrder;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'confirmed',
      confirmed: 'in_production',
      in_production: 'ready',
      ready: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return flow[current];
  };

  if (loading) {
    return <PageLoader text="Загрузка заказов..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <p className="text-workshop-100 mt-1">Управление заявками</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-4 bg-white border-b border-slate-200 overflow-x-auto">
        {(['pending', 'confirmed', 'in_production', 'ready', 'all'] as FilterStatus[]).map(s => {
          const count = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2
                ${filter === s 
                  ? 'bg-workshop-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s === 'all' ? 'Все' : STATUS_CONFIG[s].label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === s ? 'bg-white/20' : 'bg-slate-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="px-4 py-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-slate-500">Нет заказов</p>
            </CardBody>
          </Card>
        ) : (
          filteredOrders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const nextStatus = getNextStatus(order.status);
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card>
                  <CardBody>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{order.clientName}</h3>
                        <p className="text-sm text-slate-500">{order.outletName}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 py-3 border-y border-slate-100">
                      {order.items.map(item => (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {getLocalizedName(item.productName)} × <strong>{item.quantity}</strong>
                          </span>
                          <span className="text-slate-900 font-medium">
                            {item.subtotal.toLocaleString()} ₸
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="py-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 mt-2">
                        💬 {order.notes}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg font-bold text-slate-900">
                        {order.totalAmount.toLocaleString()} ₸
                      </span>
                      
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                            disabled={updatingStatus === order.id}
                          >
                            Отклонить
                          </Button>
                        )}
                        
                        {nextStatus && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, nextStatus)}
                            loading={updatingStatus === order.id}
                            disabled={updatingStatus === order.id}
                          >
                            {nextStatus === 'confirmed' && 'Подтвердить'}
                            {nextStatus === 'in_production' && 'В работу'}
                            {nextStatus === 'ready' && 'Готово'}
                            {nextStatus === 'delivered' && 'Доставлено'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersManagementPage;
