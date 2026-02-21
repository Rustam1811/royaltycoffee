/**
 * Extended Analytics Page
 * Расширенная аналитика с пиковыми часами и популярными продуктами
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  MapPinIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { locationService } from '@/services/locationService';

interface PeakHour {
  hour: string;
  orders: number;
  revenue: number;
}

interface PopularProduct {
  name: string;
  count: number;
  revenue: number;
}

interface BestDay {
  day: string;
  dayIndex: number;
  count: number;
  revenue: number;
}

interface HourlyData {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

interface AnalyticsData {
  period: string;
  locationId: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageCheck: number;
  };
  peakHours: PeakHour[];
  popularProducts: PopularProduct[];
  bestDays: BestDay[];
  hourlyDistribution: HourlyData[];
}

interface Location {
  id: string;
  name: string;
  address?: string;
}

const ExtendedAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [locations, setLocations] = useState<Location[]>([]);

  // Загрузка точек через API (не через клиентский Firestore, чтобы избежать проблем с правами)
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locs = await locationService.getLocations();
        setLocations(locs.map(loc => ({
          id: loc.id,
          name: loc.name || 'Без названия',
          address: loc.address
        })));
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };
    loadLocations();
  }, []);

  // Загрузка аналитики
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period });
        if (selectedLocation !== 'all') {
          params.append('locationId', selectedLocation);
        }
        
        const res = await fetch(`/api/analytics/extended?${params}`);
        const data = await res.json();
        
        if (data.ok) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Ошибка загрузки');
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Ошибка соединения');
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, [period, selectedLocation]);

  // Макс значение для графика часов
  const maxHourlyOrders = useMemo(() => {
    if (!analytics?.hourlyDistribution) return 1;
    return Math.max(...analytics.hourlyDistribution.map(h => h.orders), 1);
  }, [analytics]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-amber-500" />
            Расширенная аналитика
          </h1>
          <p className="text-slate-500 mt-1">Пиковые часы и популярные продукты</p>
        </div>
        
        {/* Фильтры */}
        <div className="flex flex-wrap gap-3">
          {/* Выбор точки */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">Все точки</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          
          {/* Выбор периода */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBagIcon className="w-6 h-6 opacity-80" />
            <span className="text-amber-100">Всего заказов</span>
          </div>
          <div className="text-3xl font-bold">{analytics?.summary.totalOrders.toLocaleString() || 0}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <ArrowTrendingUpIcon className="w-6 h-6 opacity-80" />
            <span className="text-emerald-100">Выручка</span>
          </div>
          <div className="text-3xl font-bold">{(analytics?.summary.totalRevenue || 0).toLocaleString()} ₸</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="w-6 h-6 opacity-80" />
            <span className="text-purple-100">Средний чек</span>
          </div>
          <div className="text-3xl font-bold">{(analytics?.summary.averageCheck || 0).toLocaleString()} ₸</div>
        </motion.div>
      </div>

      {/* Peak Hours & Popular Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <ClockIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Пиковые часы</h2>
          </div>
          
          <div className="space-y-3">
            {analytics?.peakHours.slice(0, 5).map((hour, index) => (
              <div key={hour.hour} className="flex items-center gap-4">
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
                    <span className="font-medium text-slate-900">{hour.hour}</span>
                    <span className="text-sm text-slate-500">{hour.orders} заказов</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                      style={{ width: `${(hour.orders / (analytics?.peakHours[0]?.orders || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Popular Products */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <FireIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-slate-900">Популярные продукты</h2>
          </div>
          
          <div className="space-y-3">
            {analytics?.popularProducts.slice(0, 7).map((product, index) => (
              <div key={product.name} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-red-100 text-red-700' :
                  index === 1 ? 'bg-orange-100 text-orange-700' :
                  index === 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{product.name}</div>
                  <div className="text-sm text-slate-500">{product.count} шт · {product.revenue.toLocaleString()} ₸</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Hourly Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <CalendarDaysIcon className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-900">Распределение по часам</h2>
        </div>
        
        <div className="flex items-end gap-1 h-48">
          {analytics?.hourlyDistribution.map((hour) => (
            <div key={hour.hour} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-500"
                style={{ 
                  height: `${(hour.orders / maxHourlyOrders) * 100}%`,
                  minHeight: hour.orders > 0 ? '4px' : '0'
                }}
                title={`${hour.label}: ${hour.orders} заказов`}
              />
              <span className="text-xs text-slate-400 mt-2 rotate-45 origin-left">
                {hour.hour % 3 === 0 ? hour.label : ''}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Best Days */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <MapPinIcon className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-900">Лучшие дни недели</h2>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {analytics?.bestDays.sort((a, b) => a.dayIndex - b.dayIndex).map((day) => {
            const maxCount = Math.max(...(analytics?.bestDays.map(d => d.count) || [1]));
            const intensity = day.count / maxCount;
            
            return (
              <div 
                key={day.day}
                className="text-center p-4 rounded-xl transition-colors"
                style={{
                  backgroundColor: `rgba(16, 185, 129, ${intensity * 0.3 + 0.05})`
                }}
              >
                <div className="text-sm font-medium text-slate-700">{day.day.slice(0, 2)}</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{day.count}</div>
                <div className="text-xs text-slate-500">заказов</div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default ExtendedAnalyticsPage;
