import { useState, useEffect, useCallback } from 'react';
import { getOrders, aggregateOrders, Order } from '../services/analyticsService';

export function useAnalytics(period: 'day' | 'week' | 'month') {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregated, setAggregated] = useState<any>(null);

  const getPeriodRange = useCallback(() => {
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case 'day':
        // Берем данные за последние 30 дней для дневной статистики
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
        // Берем данные за последние 12 недель
        from = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Берем данные за последние 12 месяцев
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    console.log('📊 Analytics: период', period, 'от', from, 'до', now);
    return { from, to: now };
  }, [period]);

  const processDataForPeriod = useCallback((rawData: any) => {
    if (!rawData) return null;
    
    // Выбираем нужные данные в зависимости от периода
    let chartData = [];
    let periodLabel = '';
    
    switch (period) {
      case 'day':
        chartData = rawData.byDay.map((item: any) => ({
          name: new Date(item.date).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          orders: item.orders,
          revenue: item.revenue,
          date: item.date
        }));
        periodLabel = 'День';
        break;
        
      case 'week':
        chartData = rawData.byWeek.map((item: any) => ({
          name: `Неделя ${new Date(item.weekStart).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit' 
          })}`,
          orders: item.orders,
          revenue: item.revenue,
          weekStart: item.weekStart
        }));
        periodLabel = 'Неделя';
        break;
        
      case 'month':
        chartData = rawData.byMonth.map((item: any) => ({
          name: new Date(item.monthStart + '-01').toLocaleDateString('ru-RU', { 
            month: 'long', 
            year: 'numeric' 
          }),
          orders: item.orders,
          revenue: item.revenue,
          monthStart: item.monthStart
        }));
        periodLabel = 'Месяц';
        break;
    }
    
    return {
      ...rawData,
      chartData,
      periodLabel,
      currentPeriod: period
    };
  }, [period]);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getPeriodRange();
        const orders = await getOrders(from, to);
        
        if (!isMounted) return;
        
        setOrders(orders);
        const rawAggregated = aggregateOrders(orders);
        const processedData = processDataForPeriod(rawAggregated);
        setAggregated(processedData);
        
        console.log('📊 Analytics: обработано для периода', period, 'данных:', processedData?.chartData?.length);
        console.log('📊 Analytics: rawAggregated:', rawAggregated);
        console.log('📊 Analytics: processedData:', processedData);
      } catch (err) {
        if (!isMounted) return;
        
        console.error('Analytics fetch error:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [period, getPeriodRange, processDataForPeriod]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getPeriodRange();
      const orders = await getOrders(from, to);
      setOrders(orders);
      const rawAggregated = aggregateOrders(orders);
      const processedData = processDataForPeriod(rawAggregated);
      setAggregated(processedData);
    } catch (err) {
      console.error('Analytics refresh error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка обновления данных');
    } finally {
      setLoading(false);
    }
  }, [getPeriodRange, processDataForPeriod]);

  return {
    orders,
    loading,
    error,
    aggregated,
    refresh
  };
}
