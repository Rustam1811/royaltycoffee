import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { UserContext } from '@/contexts/UserContext';
import { 
  ChartBarIcon, 
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface Stat {
  label: string;
  value: string | number;
  roles: Array<'owner' | 'admin'>;
}

const Dashboard: React.FC = () => {
  const { user, loading } = useContext(UserContext);
  const history = useHistory();

  const stats: Stat[] = [
    { label: 'Новые заказы сегодня', value: 24, roles: ['owner', 'admin'] },
    { label: 'Продажи сегодня', value: '₸34,000', roles: ['owner'] },
    { label: 'Общая выручка', value: '₸1,200,000', roles: ['owner'] },
  ];

  // Показываем индикатор загрузки в стиле Analytics
  if (loading) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  // Проверяем, что пользователь загружен
  if (!user) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-slate-600">Необходима авторизация</p>
            <p className="text-sm text-slate-500 mt-2">Пожалуйста, войдите в систему</p>
          </div>
        </div>
      </div>
    );
  }

  const shortcuts = [
    {
      id: 'analytics',
      title: 'Аналитика',
      description: 'Продажи, популярные товары, отчеты',
      icon: ChartBarIcon,
      color: 'from-admin-primary to-admin-info',
      route: '/admin/analytics',
      features: ['Продажи', 'Популярные товары', 'Отчеты'],
    },
    {
      id: 'orders',
      title: 'Управление заказами',
      description: 'Принятие заказов, обновление статусов',
      icon: ClipboardDocumentListIcon,
      color: 'from-admin-success to-admin-secondary',
      route: '/admin/orders',
      features: ['Новые заказы', 'Статусы', 'QR-коды'],
    },
  ];

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
      <div className="px-4 py-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-extrabold tracking-tight text-slate-900 mb-6"
        >
          ☕ Панель управления
        </motion.h1>

        {/* Статистика в стиле клиентского приложения */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          {stats
            .filter(stat => stat.roles.includes(user.role as 'owner' | 'admin'))
            .map((stat) => (
              <motion.div 
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-6"
              >
                <p className="text-xs text-slate-600 uppercase tracking-wide font-medium mb-2">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </motion.div>
            ))}
        </motion.div>

        {/* Последние заказы в стиле клиентского приложения */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
            Последние заказы
          </h2>
          <div className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-6">
            <div className="space-y-3">
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"
              >
                <span className="text-slate-900 font-medium">Заказ #1024</span>
                <span className="text-slate-900 font-semibold">₸450</span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"
              >
                <span className="text-slate-900 font-medium">Заказ #1023</span>
                <span className="text-slate-900 font-semibold">₸1,200</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Ссылки для быстрого доступа в стиле клиентского приложения */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
            Быстрый доступ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((shortcut) => (
              <motion.div
                key={shortcut.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => history.push(shortcut.route)}
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-6 cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-slate-100 rounded-2xl">
                    <shortcut.icon className="h-6 w-6 text-slate-700" />
                  </div>
                  <span className="ml-3 text-slate-900 font-bold text-lg tracking-tight">
                    {shortcut.title}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  {shortcut.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {shortcut.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;


// Как сделать ещё круче:
// 1. Извлечь карточку статистики в переиспользуемый компонент Card для консистентного стиля.
// 2. Подключить библиотеку Recharts или Chart.js для визуализации динамических графиков выручки.
// 3. Использовать React Query или SWR для асинхронной подгрузки данных и кеширования.
// 4. Добавить переключатель темной/светлой темы (dark mode) с сохранением в localStorage.
// 5. Внедрить WebSocket для реального обновления заказов и статистики в режиме реального времени.
