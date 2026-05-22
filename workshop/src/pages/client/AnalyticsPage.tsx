import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { WorkshopLoader } from '@/components/ui';
import { getClientByUid, getClientOrders, getAllOrders, getAllCategories, getAllProducts } from '@/services';
import { WorkshopOrder, OrderStatus, LocalizedString } from '@/types';
import { format, subDays, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';

type Period = '7' | '30' | '90' | '180';

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Ожидает', color: 'text-amber-600 bg-amber-50', icon: ClockIcon },
  confirmed: { label: 'Подтверждён', color: 'text-blue-600 bg-blue-50', icon: CheckCircleIcon },
  in_production: { label: 'Готовится', color: 'text-indigo-600 bg-indigo-50', icon: ClockIcon },
  ready: { label: 'Готов', color: 'text-green-600 bg-green-50', icon: CheckCircleIcon },
  delivered: { label: 'Доставлен', color: 'text-green-700 bg-green-50', icon: TruckIcon },
  cancelled: { label: 'Отменён', color: 'text-red-600 bg-red-50', icon: XCircleIcon },
};

const getLocalizedName = (name: LocalizedString): string => name.ru || name.en || name.kz || '';

const formatDate = (date: Date): string =>
  format(date, 'd MMM, HH:mm', { locale: ru });

const formatDayHeader = (date: Date): string =>
  format(date, 'd MMMM yyyy', { locale: ru });

/**
 * Подробная аналитика — для клиента его заказы, для owner/admin — все заказы
 */
const AnalyticsPage: React.FC = () => {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>('30');
  const [allOrders, setAllOrders] = useState<WorkshopOrder[]>([]);
  const [globalOrders, setGlobalOrders] = useState<WorkshopOrder[]>([]); // все заказы для лидерборда
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'products' | 'leaderboard'>('summary');
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<string>('amount');
  const [productCategoryMap, setProductCategoryMap] = useState<Map<string, string>>(new Map());
  const [categoryList, setCategoryList] = useState<{ id: string; name: string; icon: string }[]>([]);

  const isAdmin = !!user && (user.role === 'workshop_admin' || user.role === 'workshop_owner' || user.role === 'superowner');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        // Загружаем категории и продукты для лидерборда по напиткам/еде
        const [allGlobal, categories, products] = await Promise.all([
          getAllOrders(),
          getAllCategories(),
          getAllProducts(),
        ]);

        // Строим карту productId → categoryId
        const catMap = new Map<string, string>();
        products.forEach(p => {
          if (p.categoryId) catMap.set(p.id, p.categoryId);
        });
        setProductCategoryMap(catMap);

        // Собираем список категорий для табов лидерборда
        const catList = categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(c => ({ id: c.id, name: c.name.ru || c.name.en || c.name.kz || '?', icon: c.icon || '📦' }));
        setCategoryList(catList);

        // По умолчанию первая категория
        if (catList.length > 0) {
          setLeaderboardMode(catList[0].id);
        }

        setGlobalOrders(allGlobal);

        if (isAdmin) {
          setAllOrders(allGlobal);
        } else {
          const client = await getClientByUid(user.uid);
          if (client) {
            setMyClientId(client.id);
            const orders = await getClientOrders(client.id);
            setAllOrders(orders);
          }
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.uid, isAdmin]);

  // Фильтруем по периоду
  const filteredOrders = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(period));
    return allOrders.filter(o => isAfter(o.createdAt, cutoff));
  }, [allOrders, period]);

  // Только доставленные/завершённые для статистики сумм (клиент)
  // Для админа — все не-отменённые
  const completedOrders = useMemo(() =>
    isAdmin
      ? filteredOrders.filter(o => o.status !== 'cancelled')
      : filteredOrders.filter(o => o.status === 'delivered' || o.status === 'ready'),
  [filteredOrders, isAdmin]);

  // Агрегаты
  const totalOrders = filteredOrders.length;
  const totalCompleted = completedOrders.length;
  const totalAmount = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
  const avgCheck = totalCompleted > 0 ? Math.round(totalAmount / totalCompleted) : 0;

  // Уникальные дни с заказами
  const uniqueDays = useMemo(() => {
    const days = new Set(filteredOrders.map(o => format(o.createdAt, 'yyyy-MM-dd')));
    return days.size;
  }, [filteredOrders]);

  // Топ продуктов
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        const key = item.productId;
        const prev = map.get(key);
        if (prev) {
          prev.qty += item.quantity;
          prev.amount += item.subtotal;
        } else {
          map.set(key, { name: getLocalizedName(item.productName), qty: item.quantity, amount: item.subtotal });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [completedOrders]);

  // ── Лидерборд — по ВСЕМ заказам ВСЕХ клиентов ──
  const leaderboard = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(period));
    const periodGlobal = globalOrders.filter(o =>
      isAfter(o.createdAt, cutoff) && o.status !== 'cancelled'
    );

    // Агрегация по клиентам
    const clientMap = new Map<string, {
      clientId: string; clientName: string;
      totalAmount: number; orderCount: number;
      categoryQty: Map<string, number>; // categoryId → total qty
      products: Map<string, { name: string; qty: number }>;
    }>();
    periodGlobal.forEach(o => {
      let entry = clientMap.get(o.clientId);
      if (!entry) {
        entry = { clientId: o.clientId, clientName: o.clientName, totalAmount: 0, orderCount: 0, categoryQty: new Map(), products: new Map() };
        clientMap.set(o.clientId, entry);
      }
      entry.totalAmount += o.totalAmount;
      entry.orderCount += 1;
      o.items.forEach(item => {
        const catId = productCategoryMap.get(item.productId) || '_unknown';
        entry!.categoryQty.set(catId, (entry!.categoryQty.get(catId) || 0) + item.quantity);
        const prev = entry!.products.get(item.productId);
        if (prev) {
          prev.qty += item.quantity;
        } else {
          entry!.products.set(item.productId, { name: getLocalizedName(item.productName), qty: item.quantity });
        }
      });
    });

    const all = Array.from(clientMap.values()).map(c => ({
      ...c,
      topProducts: Array.from(c.products.values()).sort((a, b) => b.qty - a.qty).slice(0, 5),
    }));

    // Сортировка по выбранному режиму
    if (leaderboardMode === 'amount') {
      return all.sort((a, b) => b.totalAmount - a.totalAmount);
    }
    // По категории — сортируем по количеству товаров этой категории
    return all
      .filter(c => (c.categoryQty.get(leaderboardMode) || 0) > 0)
      .sort((a, b) => (b.categoryQty.get(leaderboardMode) || 0) - (a.categoryQty.get(leaderboardMode) || 0));
  }, [globalOrders, period, leaderboardMode, productCategoryMap]);

  // Моя позиция в лидерборде
  const myRank = useMemo(() => {
    if (!myClientId) return null;
    const idx = leaderboard.findIndex(c => c.clientId === myClientId);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, myClientId]);

  // Получить значение для лидерборда в зависимости от режима
  const getLeaderValue = (entry: typeof leaderboard[0]): number => {
    if (leaderboardMode === 'amount') return entry.totalAmount;
    return entry.categoryQty.get(leaderboardMode) || 0;
  };

  const getLeaderLabel = (value: number): string => {
    if (leaderboardMode === 'amount') return `${value.toLocaleString()} ₸`;
    return `${value} шт`;
  };

  // Сумма топ-10
  const top10Total = useMemo(() => {
    return leaderboard.slice(0, 10).reduce((s, e) => {
      if (leaderboardMode === 'amount') return s + e.totalAmount;
      return s + (e.categoryQty.get(leaderboardMode) || 0);
    }, 0);
  }, [leaderboard, leaderboardMode]);

  // Группировка заказов по дням
  const ordersByDay = useMemo(() => {
    const map = new Map<string, WorkshopOrder[]>();
    filteredOrders.forEach(o => {
      const key = format(o.createdAt, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredOrders]);

  // Данные по месяцам для графика
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; orders: number; amount: number }>();
    completedOrders.forEach(o => {
      const key = format(o.createdAt, 'yyyy-MM');
      const label = format(o.createdAt, 'MMM yyyy', { locale: ru });
      if (!map.has(key)) map.set(key, { month: label, orders: 0, amount: 0 });
      const m = map.get(key)!;
      m.orders += 1;
      m.amount += o.totalAmount;
    });
    return Array.from(map.values());
  }, [completedOrders]);

  if (loading) {
    return <WorkshopLoader text="Загрузка аналитики..." />;
  }

  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: '7', label: '7 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
    { value: '180', label: '6 мес' },
  ];

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '40px 20px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Аналитика</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 }}>{isAdmin ? 'Статистика всех заказов' : 'Статистика ваших заказов'}</p>
      </div>

      {/* Period */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {PERIOD_OPTIONS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            style={{ padding: '8px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: period === p.value ? '#92400e' : '#f1f5f9', color: period === p.value ? '#fff' : '#475569', flexShrink: 0 }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <StatCard icon={ShoppingBagIcon} color="blue" value={totalOrders} label="Заказов" />
        <StatCard icon={CurrencyDollarIcon} color="green" value={`${(totalAmount / 1000).toFixed(totalAmount >= 1000 ? 0 : 1)}K`} label="Сумма (₸)" />
        <StatCard icon={ChartBarIcon} color="purple" value={avgCheck.toLocaleString()} label="Средний чек" />
        <StatCard icon={CalendarDaysIcon} color="amber" value={uniqueDays} label="Дней с заказами" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        {(['summary', 'leaderboard', 'orders', 'products'] as const)
          .filter(tab => isAdmin || tab !== 'leaderboard')
          .map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '12px 4px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${activeTab === tab ? '#92400e' : 'transparent'}`, color: activeTab === tab ? '#92400e' : '#64748b' }}>
              {tab === 'summary' ? 'Обзор' : tab === 'leaderboard' ? '🏆 Рейтинг' : tab === 'orders' ? 'История' : 'Продукты'}
            </button>
          ))}
      </div>

      <div style={{ padding: '16px' }}>
        <AnimatePresence mode="wait">
          {/* ── Summary tab ── */}
          {activeTab === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Monthly breakdown */}
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>По месяцам</h3>
                </div>
                <div style={{ padding: 16 }}>
                  {monthlyData.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', margin: 0 }}>Нет данных за период</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {monthlyData.map(m => {
                        const maxAmt = Math.max(...monthlyData.map(x => x.amount), 1);
                        const pct = (m.amount / maxAmt) * 100;
                        return (
                          <div key={m.month}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                              <span style={{ fontWeight: 500, color: '#374151' }}>{m.month}</span>
                              <span style={{ color: '#64748b' }}>{m.orders} зак. · {m.amount.toLocaleString()} ₸</span>
                            </div>
                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{ height: '100%', background: '#92400e', borderRadius: 9999 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>По статусам</h3>
                </div>
                <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(
                    filteredOrders.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
                  ).map(([status, count]) => {
                    const cfg = STATUS_LABELS[status as OrderStatus];
                    const Icon = cfg.icon;
                    const colorMap: Record<string, { bg: string; text: string }> = {
                      'text-amber-600 bg-amber-50': { bg: '#fffbeb', text: '#d97706' },
                      'text-blue-600 bg-blue-50': { bg: '#eff6ff', text: '#2563eb' },
                      'text-indigo-600 bg-indigo-50': { bg: '#eef2ff', text: '#4338ca' },
                      'text-green-600 bg-green-50': { bg: '#f0fdf4', text: '#16a34a' },
                      'text-green-700 bg-green-50': { bg: '#f0fdf4', text: '#15803d' },
                      'text-red-600 bg-red-50': { bg: '#fef2f2', text: '#dc2626' },
                    };
                    const c = colorMap[cfg.color] || { bg: '#f8fafc', text: '#475569' };
                    return (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ padding: 6, borderRadius: 8, background: c.bg, color: c.text, display: 'flex', alignItems: 'center' }}>
                            <Icon style={{ width: 16, height: 16 }} />
                          </div>
                          <span style={{ fontSize: 14, color: '#374151' }}>{cfg.label}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Orders history tab ── */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ordersByDay.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0', margin: 0 }}>Нет заказов за период</p>
              ) : ordersByDay.map(([dateKey, dayOrders]) => (
                <div key={dateKey}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {formatDayHeader(new Date(dateKey))}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayOrders.map(order => {
                      const open = expandedOrder === order.id;
                      const cfg = STATUS_LABELS[order.status];
                      const Icon = cfg.icon;
                      const colorMap: Record<string, { bg: string; text: string }> = {
                        'text-amber-600 bg-amber-50': { bg: '#fffbeb', text: '#d97706' },
                        'text-blue-600 bg-blue-50': { bg: '#eff6ff', text: '#2563eb' },
                        'text-indigo-600 bg-indigo-50': { bg: '#eef2ff', text: '#4338ca' },
                        'text-green-600 bg-green-50': { bg: '#f0fdf4', text: '#16a34a' },
                        'text-green-700 bg-green-50': { bg: '#f0fdf4', text: '#15803d' },
                        'text-red-600 bg-red-50': { bg: '#fef2f2', text: '#dc2626' },
                      };
                      const c = colorMap[cfg.color] || { bg: '#f8fafc', text: '#475569' };
                      return (
                        <div key={order.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 12 }}>
                          <button onClick={() => setExpandedOrder(open ? null : order.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: c.bg, color: c.text }}>
                                  <Icon style={{ width: 12, height: 12 }} />{cfg.label}
                                </span>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(order.createdAt)}</span>
                              </div>
                              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                                {isAdmin && order.clientName && <span style={{ fontWeight: 500, color: '#0f172a' }}>{order.clientName} · </span>}
                                {order.outletName}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.totalAmount.toLocaleString()} ₸</span>
                              {open ? <ChevronUpIcon style={{ width: 16, height: 16, color: '#94a3b8' }} /> : <ChevronDownIcon style={{ width: 16, height: 16, color: '#94a3b8' }} />}
                            </div>
                          </button>
                          <AnimatePresence>
                            {open && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {order.items.map(item => (
                                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                      <span style={{ color: '#64748b' }}>{getLocalizedName(item.productName)} × {item.quantity}</span>
                                      <span style={{ fontWeight: 500, color: '#0f172a' }}>{item.subtotal.toLocaleString()} ₸</span>
                                    </div>
                                  ))}
                                  {order.notes && <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, background: '#f8fafc', padding: '6px 10px', borderRadius: 8, margin: '8px 0 0' }}>💬 {order.notes}</p>}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── Leaderboard tab ── */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {categoryList.map(cat => (
                  <button key={cat.id} onClick={() => { setLeaderboardMode(cat.id); setExpandedLeader(null); }}
                    style={{ padding: '8px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: leaderboardMode === cat.id ? '#92400e' : '#f1f5f9', color: leaderboardMode === cat.id ? '#fff' : '#475569', flexShrink: 0 }}>
                    {cat.icon} {cat.name}
                  </button>
                ))}
                <button onClick={() => { setLeaderboardMode('amount'); setExpandedLeader(null); }}
                  style={{ padding: '8px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: leaderboardMode === 'amount' ? '#92400e' : '#f1f5f9', color: leaderboardMode === 'amount' ? '#fff' : '#475569', flexShrink: 0 }}>
                  💰 По сумме
                </button>
              </div>

              {/* Header stats */}
              <div style={{ background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', borderRadius: 16, padding: 16, color: '#fff', boxShadow: '0 4px 16px rgba(61,10,17,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Топ 10 итого</p>
                    <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, marginBottom: 0 }}>{getLeaderLabel(top10Total)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {!isAdmin && myRank !== null && myRank <= leaderboard.length ? (
                      <>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Вы · #{myRank}</p>
                        <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4, marginBottom: 0 }}>{getLeaderLabel(getLeaderValue(leaderboard[myRank - 1]))}</p>
                      </>
                    ) : (
                      <>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Участников</p>
                        <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4, marginBottom: 0 }}>{leaderboard.length}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {leaderboard.length > 0 && (
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Топ 10 · {leaderboardMode === 'amount' ? 'по сумме' : categoryList.find(c => c.id === leaderboardMode)?.name || ''}
                </p>
              )}

              {/* Leaderboard list */}
              {leaderboard.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', margin: 0 }}>Нет данных за выбранный период</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {leaderboard.slice(0, 10).map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.clientId === myClientId;
                    const val = getLeaderValue(entry);
                    const maxVal = getLeaderValue(leaderboard[0]) || 1;
                    const pct = (val / maxVal) * 100;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                    const isExpanded = expandedLeader === entry.clientId;
                    const avgCheckVal = entry.orderCount > 0 ? Math.round(entry.totalAmount / entry.orderCount) : 0;
                    const shareOfTotal = leaderboard.slice(0, 10).reduce((s, e) => s + getLeaderValue(e), 0);
                    const sharePct = shareOfTotal > 0 ? ((val / shareOfTotal) * 100).toFixed(1) : '0';
                    const rankBg = rank === 1 ? '#fef9c3' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#fff7ed' : '#f8fafc';
                    const rankColor = rank === 1 ? '#a16207' : rank === 2 ? '#475569' : rank === 3 ? '#c2410c' : '#94a3b8';
                    const barColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#fb923c' : '#d4a574';

                    return (
                      <motion.div key={entry.clientId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <div style={{ background: '#fff', borderRadius: 16, boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.12)' : '0 1px 8px rgba(0,0,0,0.07)', border: isMe ? '2px solid #d4a574' : '2px solid transparent', overflow: 'hidden', transform: isExpanded ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.3s, box-shadow 0.3s' }}>
                          <div style={{ padding: 12 }}>
                            <button onClick={() => setExpandedLeader(isExpanded ? null : entry.clientId)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: rankBg, color: rankColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, transform: isExpanded ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.3s' }}>
                                  {medal || rank}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                      <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isMe ? '#92400e' : '#0f172a' }}>{entry.clientName || 'Без имени'}</span>
                                      {isMe && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 9999, fontWeight: 700, flexShrink: 0 }}>Вы</span>}
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flexShrink: 0, marginLeft: 8 }}>{getLeaderLabel(val)}</span>
                                  </div>
                                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} style={{ height: '100%', background: barColor, borderRadius: 9999 }} />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                                    <span>{entry.orderCount} {entry.orderCount === 1 ? 'заказ' : entry.orderCount < 5 ? 'заказа' : 'заказов'}</span>
                                    {entry.topProducts.length > 0 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>★ {entry.topProducts.slice(0, 2).map(p => `${p.name} (${p.qty})`).join(', ')}</span>}
                                  </div>
                                </div>
                              </div>
                            </button>
                            <div style={{ maxHeight: isExpanded ? 600 : 0, opacity: isExpanded ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease-in-out, opacity 0.3s' }}>
                              <div style={{ paddingTop: 12, marginTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                  {[{ v: entry.orderCount.toString(), l: 'заказов' }, { v: avgCheckVal.toLocaleString(), l: 'средний чек ₸' }, { v: `${sharePct}%`, l: 'доля от топ 10' }].map((s, si) => (
                                    <div key={si} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 12, padding: '8px 4px' }}>
                                      <p style={{ fontSize: 18, fontWeight: 700, color: si === 2 ? '#92400e' : '#0f172a', margin: 0 }}>{s.v}</p>
                                      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>{s.l}</p>
                                    </div>
                                  ))}
                                </div>
                                {entry.topProducts.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Топ продукты</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {entry.topProducts.slice(0, 5).map((p, pi) => {
                                        const maxQty = entry.topProducts[0]?.qty || 1;
                                        const productPct = (p.qty / maxQty) * 100;
                                        return (
                                          <div key={pi}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                                              <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{p.name}</span>
                                              <span style={{ fontWeight: 600, color: '#0f172a', flexShrink: 0 }}>{p.qty} шт</span>
                                            </div>
                                            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                                              <motion.div initial={{ width: 0 }} animate={{ width: `${productPct}%` }} transition={{ duration: 0.4, delay: pi * 0.05 }} style={{ height: '100%', background: '#e2c4a0', borderRadius: 9999 }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef3c7', borderRadius: 12, padding: '8px 12px' }}>
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#92400e' }}>Общая сумма</span>
                                  <span style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>{entry.totalAmount.toLocaleString()} ₸</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* User outside top 10 */}
                  {!isAdmin && myRank !== null && myRank > 10 && (() => {
                    const myEntry = leaderboard[myRank - 1];
                    const myVal = getLeaderValue(myEntry);
                    const maxVal = getLeaderValue(leaderboard[0]) || 1;
                    const pct = (myVal / maxVal) * 100;
                    const isMyExpanded = expandedLeader === myEntry.clientId;
                    const myAvgCheck = myEntry.orderCount > 0 ? Math.round(myEntry.totalAmount / myEntry.orderCount) : 0;
                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                          <div style={{ flex: 1, borderTop: '1px dashed #cbd5e1' }} />
                          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>··· ваше место ···</span>
                          <div style={{ flex: 1, borderTop: '1px dashed #cbd5e1' }} />
                        </div>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', border: '2px solid #d4a574', overflow: 'hidden' }}>
                            <div style={{ padding: 12 }}>
                              <button onClick={() => setExpandedLeader(isMyExpanded ? null : myEntry.clientId)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{myRank}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myEntry.clientName || 'Без имени'}</span>
                                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 9999, fontWeight: 700, flexShrink: 0 }}>Вы</span>
                                      </div>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flexShrink: 0, marginLeft: 8 }}>{getLeaderLabel(myVal)}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.5 }} style={{ height: '100%', background: '#d4a574', borderRadius: 9999 }} />
                                    </div>
                                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{myEntry.orderCount} {myEntry.orderCount === 1 ? 'заказ' : myEntry.orderCount < 5 ? 'заказа' : 'заказов'}</p>
                                  </div>
                                </div>
                              </button>
                              <div style={{ maxHeight: isMyExpanded ? 300 : 0, opacity: isMyExpanded ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.3s, opacity 0.3s' }}>
                                <div style={{ paddingTop: 12, marginTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                    {[{ v: myEntry.orderCount.toString(), l: 'заказов' }, { v: myAvgCheck.toLocaleString(), l: 'средний чек ₸' }].map((s, si) => (
                                      <div key={si} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 12, padding: '8px 4px' }}>
                                        <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.v}</p>
                                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{s.l}</p>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef3c7', borderRadius: 12, padding: '8px 12px' }}>
                                    <span style={{ fontSize: 12, fontWeight: 500, color: '#92400e' }}>Общая сумма</span>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>{myEntry.totalAmount.toLocaleString()} ₸</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Products tab ── */}
          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Топ продуктов за период</h3>
                </div>
                <div style={{ padding: 16 }}>
                  {topProducts.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', margin: 0 }}>Нет данных</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {topProducts.map((p, i) => {
                        const maxQty = topProducts[0]?.qty || 1;
                        const pct = (p.qty / maxQty) * 100;
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{p.name}</span>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 14, flexShrink: 0, marginLeft: 8 }}>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.qty} шт</span>
                                <span style={{ color: '#94a3b8', marginLeft: 8 }}>{p.amount.toLocaleString()} ₸</span>
                              </div>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} style={{ height: '100%', background: '#d4a574', borderRadius: 9999 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Stat card component ───
const StatCard: React.FC<{
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'amber';
  value: string | number;
  label: string;
}> = ({ icon: Icon, color, value, label }) => {
  const colors = {
    blue: { bg: '#dbeafe', text: '#2563eb' },
    green: { bg: '#dcfce7', text: '#16a34a' },
    purple: { bg: '#f3e8ff', text: '#9333ea' },
    amber: { bg: '#fef3c7', text: '#d97706' },
  };
  const c = colors[color];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: 16, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
          <Icon style={{ width: 20, height: 20 }} />
        </div>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>{value}</p>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{label}</p>
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
