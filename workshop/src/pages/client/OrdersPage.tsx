import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Card, CardBody, Badge, PageLoader } from '@/components/ui';
import { getClientOrders, getClientByUid } from '@/services';
import { WorkshopOrder, OrderStatus, LocalizedString } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info'; icon: React.ElementType }> = {
  pending: { label: 'Ожидает', variant: 'warning', icon: ClockIcon },
  confirmed: { label: 'Подтверждён', variant: 'info', icon: CheckCircleIcon },
  in_production: { label: 'Готовится', variant: 'info', icon: ClipboardDocumentListIcon },
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

/**
 * Страница заказов клиента
 */
const OrdersPage: React.FC = () => {
  const { user } = useUser();
  const _history = useHistory();
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  // Suppress unused variable warning - может использоваться для навигации
  void _history;

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.uid) return;
      
      try {
        const client = await getClientByUid(user.uid);
        if (client) {
          const ordersData = await getClientOrders(client.id);
          setOrders(ordersData);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [user?.uid]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'active') {
      return ['pending', 'confirmed', 'in_production', 'ready'].includes(order.status);
    }
    if (filter === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  if (loading) {
    return <PageLoader text="Загрузка заказов..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <h1 className="text-2xl font-bold">Мои заказы</h1>
        <p className="text-workshop-100 mt-1">История заказов продукции</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${filter === f 
                ? 'bg-workshop-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Завершённые'}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 py-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <ClipboardDocumentListIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Нет заказов
              </h3>
              <p className="text-slate-500">
                {filter === 'active' ? 'Нет активных заказов' : 'История заказов пуста'}
              </p>
            </CardBody>
          </Card>
        ) : (
          filteredOrders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardBody>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-slate-500">
                          {formatDate(order.createdAt)}
                        </p>
                        <h3 className="font-semibold text-slate-900 mt-0.5">
                          {order.outletName}
                        </h3>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    {/* Items Preview */}
                    <div className="space-y-1 py-3 border-y border-slate-100">
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {getLocalizedName(item.productName)} × {item.quantity}
                          </span>
                          <span className="text-slate-900 font-medium">
                            {item.subtotal.toLocaleString()} ₸
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-slate-500">
                          +{order.items.length - 3} ещё...
                        </p>
                      )}
                    </div>
                    
                    {/* Total */}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-slate-600">Итого:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {order.totalAmount.toLocaleString()} ₸
                      </span>
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

export default OrdersPage;
