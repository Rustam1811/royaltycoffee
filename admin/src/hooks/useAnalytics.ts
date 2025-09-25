import { useState, useEffect, useCallback } from "react";
import {
  getOrders,
  aggregateOrders,
  projectAnalytics,
  Order,
  ProcessedAnalytics,
} from "@/services/analyticsService";

type Period = "day" | "week" | "month";

const MAX_RANGE: Record<Period, number> = {
  day: 30,
  week: 12,
  month: 12,
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const rangeForPeriod = (period: Period) => {
  const now = new Date();
  const days =
    period === "day"
      ? MAX_RANGE.day
      : period === "week"
      ? MAX_RANGE.week * 7
      : MAX_RANGE.month * 30;
  const from = new Date(now.getTime() - days * MS_IN_DAY);
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
      const { from, to } = rangeForPeriod(period);
      const fetched = await getOrders(from, to);
      const rawAggregated = aggregateOrders(fetched);
      const processed = projectAnalytics(rawAggregated, period);

      setOrders(fetched);
      setAggregated(processed);
    } catch (err) {
      console.error("Analytics load error", err);
      setError(err instanceof Error ? err.message : "?? ??????? ????????? ?????????");
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
