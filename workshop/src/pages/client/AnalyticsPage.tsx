import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Card, CardBody, CardHeader, PageLoader } from '@/components/ui';
import { getClientAnalyticsLastDays, getClientMonthlyAnalytics, getClientByUid } from '@/services';
import { DailyAnalytics, MonthlyAnalytics } from '@/types';

type Period = '7' | '30' | '90' | '180';

/**
 * Страница аналитики клиента
 */
const AnalyticsPage: React.FC = () => {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>('30');
  const [dailyData, setDailyData] = useState<DailyAnalytics[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [_clientId, setClientId] = useState<string>('');
  
  // Suppress unused variable warning - может использоваться в будущем
  void _clientId;

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      
      try {
        const client = await getClientByUid(user.uid);
        if (client) {
          setClientId(client.id);
          
          const [daily, monthly] = await Promise.all([
            getClientAnalyticsLastDays(client.id, parseInt(period)),
            getClientMonthlyAnalytics(client.id, 6),
          ]);
          
          setDailyData(daily);
          setMonthlyData(monthly);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.uid, period]);

  const totalOrders = dailyData.reduce((sum, d) => sum + d.totalOrders, 0);
  const totalAmount = dailyData.reduce((sum, d) => sum + d.totalAmount, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;

  if (loading) {
    return <PageLoader text="Загрузка аналитики..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-workshop-100 mt-1">Статистика ваших заказов</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 px-4 py-4 bg-white border-b border-slate-200 overflow-x-auto">
        {([
          { value: '7', label: '7 дней' },
          { value: '30', label: '30 дней' },
          { value: '90', label: '3 месяца' },
          { value: '180', label: '6 месяцев' },
        ] as { value: Period; label: string }[]).map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${period === p.value 
                ? 'bg-workshop-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardBody className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
              <p className="text-sm text-slate-500">Заказов</p>
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
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {(totalAmount / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-slate-500">Сумма (₸)</p>
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
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {avgOrderValue.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">Средний чек (₸)</p>
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
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <CalendarDaysIcon className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{dailyData.length}</p>
              <p className="text-sm text-slate-500">Дней с заказами</p>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Breakdown */}
      <div className="px-4 py-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">По месяцам</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {monthlyData.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Нет данных</p>
            ) : (
              monthlyData.map((month, index) => (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{month.month}</p>
                    <p className="text-sm text-slate-500">{month.totalOrders} заказов</p>
                  </div>
                  <p className="font-bold text-workshop-600">
                    {month.totalAmount.toLocaleString()} ₸
                  </p>
                </motion.div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top Products */}
      {monthlyData.length > 0 && monthlyData[0].topProducts.length > 0 && (
        <div className="px-4 py-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Топ продуктов (текущий месяц)</h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {monthlyData[0].topProducts.slice(0, 5).map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-8 h-8 rounded-full bg-workshop-100 flex items-center justify-center text-workshop-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{product.productName}</p>
                    <p className="text-sm text-slate-500">{product.quantity} шт</p>
                  </div>
                  <p className="font-medium text-slate-900">
                    {product.amount.toLocaleString()} ₸
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
