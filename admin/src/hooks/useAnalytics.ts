import { useState, useEffect, useCallback } from "react";
import {
  getOrders,
  aggregateOrders,
  projectAnalytics,
  Order,
  ProcessedAnalytics,
} from "@/services/analyticsService";

type Period = "day" | "week" | "month" | "all";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const rangeForPeriod = (period: Period) => {
  const now = new Date();
  let from: Date;
  
  if (period === "day") {
    // День = с 00:00:00 сегодняшнего дня
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    console.log('📅 Period DAY:', { from: from.toISOString(), to: now.toISOString(), fromHour: from.getHours() });
  } else if (period === "week") {
    // Неделя = последние 7 дней с 00:00:00
    const weekStart = new Date(now.getTime() - 7 * MS_IN_DAY);
    from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0);
    console.log('📅 Period WEEK:', { from: from.toISOString(), to: now.toISOString() });
  } else if (period === "month") {
    // Текущий месяц с 1-го числа
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    console.log('📅 Period MONTH:', { from: from.toISOString(), to: now.toISOString() });
  } else {
    // Все время - создаём дату явно (год, месяц-1, день)
    from = new Date(2000, 0, 1, 0, 0, 0, 0);
    console.log('📅 Period ALL:', { from: from.toISOString(), to: now.toISOString() });
  }
  
  return { from, to: now };
};

export function useAnalytics(period: Period) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [aggregated, setAggregated] = useState<ProcessedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Загружаем аналитику для периода:', period);
      const { from, to } = rangeForPeriod(period);
      console.log('📅 Диапазон дат:', { from: from.toISOString(), to: to.toISOString() });
      
      const fetched = await getOrders(from, to);
      console.log('📦 Получены заказы:', fetched);
      console.log('📊 Количество заказов:', fetched.length);
      
      const rawAggregated = aggregateOrders(fetched);
      console.log('🔢 Агрегированные данные:', rawAggregated);
      
      const processed = projectAnalytics(rawAggregated, period);
      console.log('📈 Обработанная аналитика:', processed);

      // Добавляем сырые данные для детального анализа
      processed.rawOrders = fetched;

      setOrders(fetched);
      setAggregated(processed);
    } catch (err) {
      console.error("❌ Analytics load error", err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    orders,
    aggregated,
    loading,
    error,
    refresh,
  };
}
