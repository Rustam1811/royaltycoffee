import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHistory, useLocation } from 'react-router-dom';
import { 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, WorkshopLoader } from '@/components/ui';
import { getAllOrders, getAllClients } from '@/services';
import { WorkshopOrder, WorkshopClient, OrderStatus } from '@/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Ожидают',
  confirmed: 'Подтверждены',
  in_production: 'В работе',
  ready: 'Готовы',
  delivered: 'Доставлены',
  cancelled: 'Отменены',
};

// Используем STATUS_LABELS для экспорта
export { STATUS_LABELS };

/**
 * Главная страница админки цеха
 */
const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/owner';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, clientsData] = await Promise.all([
          getAllOrders(),
          getAllClients(),
        ]);
        setOrders(ordersData);
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const todayOrders = orders.filter(o => {
    const today = new Date();
    const orderDate = o.createdAt;
    return orderDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  if (loading) {
    return <WorkshopLoader text="Загрузка..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Панель управления</h1>
            <p className="text-white/60 text-sm mt-0.5">Цех · Производство</p>
          </div>
          <button
            onClick={() => history.push(`${prefix}/settings`)}
            className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardBody className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <ClipboardDocumentListIcon className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{pendingOrders.length}</p>
              <p className="text-sm text-slate-500">Новых заявок</p>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardBody className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {(todayRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-slate-500">Сегодня (₸)</p>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardBody className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{todayOrders.length}</p>
              <p className="text-sm text-slate-500">Заказов сегодня</p>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardBody className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
              <p className="text-sm text-slate-500">Клиентов</p>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="px-4 py-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Новые заявки</h3>
              <span className="text-sm text-workshop-600 font-medium">
                {pendingOrders.length} шт
              </span>
            </CardHeader>
            <CardBody className="space-y-3">
              {pendingOrders.slice(0, 5).map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{order.clientName}</p>
                    <p className="text-sm text-slate-500">{order.outletName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-workshop-600">
                      {order.totalAmount.toLocaleString()} ₸
                    </p>
                    <p className="text-sm text-slate-500">
                      {order.items.length} позиций
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
