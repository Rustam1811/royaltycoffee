import { apiUrl } from "@/config/api";

export interface OrderItem {
  productId?: string;
  productName?: string;
  category?: string;
  name?: string;
  price: number;
  qty?: number;
  quantity?: number;
}

export interface Order {
  id: string;
  createdAt: Date;
  date: Date;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  userId?: string;
  bonusEarned?: number;
}

export interface TopProduct {
  productName: string;
  quantity: number;
  totalRevenue: number;
}

export interface AggregatedOrders {
  revenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: TopProduct[];
  byHour: Record<string, number>;
  byDay: Array<{ date: string; orders: number; revenue: number }>;
  byWeek: Array<{ weekStart: string; orders: number; revenue: number }>;
  byMonth: Array<{ monthStart: string; orders: number; revenue: number }>;
}

export interface ChartPoint {
  name: string;
  orders: number;
  revenue: number;
  date?: string;
  weekStart?: string;
  monthStart?: string;
}

export interface ProcessedAnalytics extends AggregatedOrders {
  chartData: ChartPoint[];
  periodLabel: string;
  currentPeriod: "day" | "week" | "month";
}

type OrdersApiPayload = {
  orders?: Array<{
    id: string;
    createdAt?: string | { seconds: number };
    timestamp?: string;
    date?: string;
    items?: OrderItem[];
    amount?: number;
    totalPrice?: number;
    status?: string;
    userId?: string;
    bonusEarned?: number;
  }>;
};

function toDate(value: string | { seconds: number } | undefined): Date {
  if (!value) return new Date();
  if (typeof value === "string") return new Date(value);
  return new Date(value.seconds * 1000);
}

export async function getOrders(from: Date, to: Date): Promise<Order[]> {
  const url = apiUrl("orders", {
    action: "get",
    admin: true,
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const response = await fetch(url, { method: "GET", mode: "cors" });
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  const data = (await response.json()) as OrdersApiPayload;
  const source = Array.isArray(data.orders) ? data.orders : [];

  return source.map((order) => {
    const createdAt = toDate(order.createdAt ?? order.timestamp ?? order.date);
    return {
      id: order.id,
      createdAt,
      date: createdAt,
      items: Array.isArray(order.items) ? order.items : [],
      totalPrice: order.amount ?? order.totalPrice ?? 0,
      status: order.status ?? "completed",
      userId: order.userId,
      bonusEarned: order.bonusEarned ?? 0,
    } satisfies Order;
  });
}

export function aggregateOrders(orders: Order[]): AggregatedOrders {
  const byProduct: Record<string, TopProduct> = {};
  const byHour: Record<string, number> = {};
  const byDay: Record<string, { date: string; orders: number; revenue: number }> = {};
  const byWeek: Record<string, { weekStart: string; orders: number; revenue: number }> = {};
  const byMonth: Record<string, { monthStart: string; orders: number; revenue: number }> = {};

  let totalRevenue = 0;

  for (const order of orders) {
    if (!(order.createdAt instanceof Date) || Number.isNaN(order.createdAt.getTime())) {
      continue;
    }

    const hourKey = order.createdAt.getHours().toString();
    const dayKey = order.createdAt.toISOString().slice(0, 10);

    const weekStart = getWeekStart(order.createdAt).toISOString().slice(0, 10);
    const monthStart = new Date(order.createdAt.getFullYear(), order.createdAt.getMonth(), 1)
      .toISOString()
      .slice(0, 7);

    byHour[hourKey] = (byHour[hourKey] ?? 0) + 1;

    byDay[dayKey] ??= { date: dayKey, orders: 0, revenue: 0 };
    byDay[dayKey].orders += 1;
    byDay[dayKey].revenue += order.totalPrice;

    byWeek[weekStart] ??= { weekStart, orders: 0, revenue: 0 };
    byWeek[weekStart].orders += 1;
    byWeek[weekStart].revenue += order.totalPrice;

    byMonth[monthStart] ??= { monthStart, orders: 0, revenue: 0 };
    byMonth[monthStart].orders += 1;
    byMonth[monthStart].revenue += order.totalPrice;

    totalRevenue += order.totalPrice;

    for (const item of order.items) {
      const name = item.productName ?? item.name ?? "??? ????????";
      const quantity = item.quantity ?? item.qty ?? 1;
      const price = item.price ?? 0;

      byProduct[name] ??= { productName: name, quantity: 0, totalRevenue: 0 };
      byProduct[name].quantity += quantity;
      byProduct[name].totalRevenue += price * quantity;
    }
  }

  const totalOrders = orders.length;

  return {
    revenue: totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    topProducts: Object.values(byProduct).sort((a, b) => b.quantity - a.quantity).slice(0, 20),
    byHour,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    byWeek: Object.values(byWeek).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    byMonth: Object.values(byMonth).sort((a, b) => a.monthStart.localeCompare(b.monthStart)),
  };
}

export function projectAnalytics(raw: AggregatedOrders, period: "day" | "week" | "month"): ProcessedAnalytics {
  let chartData: ChartPoint[] = [];
  let periodLabel = "";

  if (period === "day") {
    chartData = raw.byDay.map((item) => ({
      name: new Date(item.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      orders: item.orders,
      revenue: item.revenue,
      date: item.date,
    }));
    periodLabel = "????";
  } else if (period === "week") {
    chartData = raw.byWeek.map((item) => ({
      name: `?????? ${new Date(item.weekStart).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`,
      orders: item.orders,
      revenue: item.revenue,
      weekStart: item.weekStart,
    }));
    periodLabel = "??????";
  } else {
    chartData = raw.byMonth.map((item) => ({
      name: new Date(`${item.monthStart}-01`).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
      orders: item.orders,
      revenue: item.revenue,
      monthStart: item.monthStart,
    }));
    periodLabel = "?????";
  }

  return {
    ...raw,
    chartData,
    periodLabel,
    currentPeriod: period,
  };
}

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

