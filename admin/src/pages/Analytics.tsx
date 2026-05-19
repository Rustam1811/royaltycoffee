import React, { useState, useEffect, useContext } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ChartBarIcon, ClockIcon, FireIcon, ArrowPathIcon, CurrencyDollarIcon, ShoppingBagIcon, CalendarDaysIcon, MapPinIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { OrdersLineChart, OrdersByHourBarChart } from '@/components/AnalyticsCharts';
import { motion } from 'framer-motion';
import { UserContext } from '@/contexts/UserContext';
import { useLocation, ALL_LOCATIONS_ID } from '@/contexts/LocationContext';

const periodOptions = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Все время' }
];

/**
 * Мобильная версия аналитики для продакшна
 * Полностью рабочая с красивым интерфейсом
 */
const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const { aggregated, loading, error, refresh } = useAnalytics(period);
  const [refreshing, setRefreshing] = useState(false);
  const { user, loading: authLoading } = useContext(UserContext);
  const { locations, selectedLocation, selectedLocationId, selectLocation, isOwner, isAllLocationsSelected } = useLocation();

  useEffect(() => {
    if (aggregated) {
      console.log('📊 Analytics: рендерим aggregated:', aggregated);
      console.log('📊 Analytics: chartData:', aggregated.chartData);
      console.log('📊 Analytics: chartData length:', aggregated.chartData?.length);
    }
  }, [aggregated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getPeakHours = (byHour: Record<string, number>) => {
    if (!byHour) return 'Нет данных';
    const entries = Object.entries(byHour);
    if (entries.length === 0) return 'Нет данных';
    const peak = entries.reduce((a, b) => byHour[a[0]] > byHour[b[0]] ? a : b);
    return `${peak[0]}:00 (${peak[1]} заказов)`;
  };

  useEffect(() => {
    console.log('Аналитика загружена для периода:', period);
  }, [period]);

  // Проверяем авторизацию
  if (authLoading) {
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

  if (!user) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-slate-600">Необходима авторизация</p>
            <p className="text-sm text-slate-500 mt-2">Пожалуйста, войдите в систему для доступа к аналитике</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
      <div className="px-4 py-6">
        {/* Заголовок в стиле клиентского приложения */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Аналитика</h1>
            <p className="text-sm text-slate-600">Статистика продаж и заказов</p>
          </div>
          <motion.button 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-3 bg-slate-900 text-white rounded-full shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] disabled:opacity-50 hover:bg-black transition-colors active:shadow-none"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Переключатель точки (owner/superowner) */}
        {isOwner && locations.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <motion.button
                onClick={() => selectLocation(ALL_LOCATIONS_ID)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                  isAllLocationsSelected
                    ? 'bg-slate-900 text-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]'
                    : 'bg-white text-slate-700 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]'
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
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                    selectedLocationId === loc.id
                      ? 'bg-slate-900 text-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]'
                      : 'bg-white text-slate-700 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <MapPinIcon className="h-4 w-4" />
                  {loc.name}
                </motion.button>
              ))}
            </div>
            {!isAllLocationsSelected && selectedLocation && (
              <p className="text-xs text-slate-500 mt-2 ml-1">
                📍 {selectedLocation.address || selectedLocation.name}
              </p>
            )}
          </div>
        )}

        {/* Переключатель периода в стиле клиентского приложения */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {periodOptions.map(opt => (
            <motion.button
              key={opt.key}
              onClick={() => setPeriod(opt.key as 'day' | 'week' | 'month' | 'all')}
              className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold transition-all ${
                period === opt.key 
                  ? 'bg-slate-900 text-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]' 
                  : 'bg-white text-slate-700 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>

        {/* Состояния загрузки и ошибки */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Загрузка данных...</p>
          </div>
        )}

        {error && (
          <motion.div 
            className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4 mb-4 border-l-4 border-red-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-600 font-semibold">Ошибка загрузки: {error}</p>
          </motion.div>
        )}

        {/* Основной контент */}
        {!loading && !error && aggregated && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Информация о периоде */}
            <div className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-2xl">
                  <ClockIcon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">
                    Период: {aggregated.periodLabel || periodOptions.find(p => p.key === period)?.label}
                  </p>
                  {aggregated.chartData && (
                    <p className="text-slate-600 text-sm">
                      Показано {aggregated.chartData.length} {period === 'day' ? 'дней' : period === 'week' ? 'недель' : 'месяцев'} с данными
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Карточки со статистикой в стиле клиентского приложения */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-2xl">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">
                      Выручка за {period === 'day' ? 'день' : period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : 'все время'}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{aggregated.revenue?.toLocaleString() || 0} ₸</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">
                      Заказов за {period === 'day' ? 'день' : period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : 'все время'}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{aggregated.totalOrders || 0}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <CurrencyDollarIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Средний чек</p>
                    <p className="text-lg font-bold text-slate-900">{Math.round(aggregated.avgOrderValue || 0)} ₸</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-2xl">
                    <FireIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Лучший товар</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {aggregated.topProducts?.[0]?.productName || 'Нет данных'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Топ товаров в стиле клиентского приложения */}
            <motion.div 
              className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-100 rounded-2xl">
                  <FireIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Топ товаров</h2>
                  <p className="text-xs text-slate-600">
                    за {period === 'day' ? 'день' : period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : 'все время'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {aggregated.topProducts && aggregated.topProducts.length > 0 ? (
                  aggregated.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25)]">
                          <span className="text-orange-600 font-bold text-sm">{index + 1}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{product.productName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{product.quantity} шт</p>
                        <p className="text-xs text-slate-600">{(product.totalRevenue || 0).toLocaleString()} ₸</p>
                      </div>
                    </div>
                  )) 
                ) : (
                  <p className="text-slate-600 text-center py-4">Нет данных о продажах</p>
                )}
              </div>
            </motion.div>

            {/* Активность по часам в стиле клиентского приложения */}
            <motion.div 
              className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Активность по часам</h2>
              </div>
              <div className="mb-6 p-4 bg-blue-50 rounded-2xl">
                <p className="text-sm text-blue-800">
                  Пиковое время: <span className="font-semibold">{getPeakHours(aggregated.byHour || {})}</span>
                </p>
              </div>
              {aggregated.byHour && Object.keys(aggregated.byHour).length > 0 && <OrdersByHourBarChart data={aggregated.byHour} />}
            </motion.div>

            {/* Пиковые часы — Топ 5 */}
            {(() => {
              const peakHours = Object.entries(aggregated.byHour || {})
                .map(([hour, count]) => ({ hour: parseInt(hour), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
              if (peakHours.length === 0) return null;
              const maxCount = peakHours[0]?.count || 1;
              return (
                <motion.div 
                  className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                      <ClockIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Топ-5 пиковых часов</h2>
                  </div>
                  <div className="space-y-3">
                    {peakHours.map((ph, index) => (
                      <div key={ph.hour} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-slate-100 text-slate-600' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900">{ph.hour}:00 – {ph.hour + 1}:00</span>
                            <span className="text-sm text-slate-500">{ph.count} заказов</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                              style={{ width: `${(ph.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            {/* Лучшие дни недели */}
            {(() => {
              const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              const dayStats: Record<number, number> = {};
              for (let i = 0; i < 7; i++) dayStats[i] = 0;
              (aggregated.rawOrders || []).forEach(order => {
                if (order.createdAt instanceof Date && !Number.isNaN(order.createdAt.getTime())) {
                  dayStats[order.createdAt.getDay()]++;
                }
              });
              const maxDay = Math.max(...Object.values(dayStats), 1);
              const hasDayData = Object.values(dayStats).some(v => v > 0);
              if (!hasDayData) return null;
              return (
                <motion.div 
                  className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-100 rounded-2xl">
                      <CalendarDaysIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Заказы по дням недели</h2>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                      const count = dayStats[dayIndex];
                      const intensity = count / maxDay;
                      return (
                        <div 
                          key={dayIndex}
                          className="text-center p-3 rounded-2xl transition-colors"
                          style={{
                            backgroundColor: `rgba(16, 185, 129, ${intensity * 0.3 + 0.05})`
                          }}
                        >
                          <div className="text-sm font-medium text-slate-700">{dayNames[dayIndex]}</div>
                          <div className="text-lg font-bold text-slate-900 mt-1">{count}</div>
                          <div className="text-[10px] text-slate-500">заказов</div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}

            {/* Графики в стиле клиентского приложения */}
            {aggregated.chartData && aggregated.chartData.length > 0 && (
              <motion.div 
                className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-green-100 rounded-2xl">
                    <ChartBarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Динамика заказов по {period === 'day' ? 'дням' : period === 'week' ? 'неделям' : 'месяцам'}
                  </h2>
                </div>
                <OrdersLineChart 
                  data={aggregated.chartData}
                  periodLabel={aggregated.periodLabel}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
