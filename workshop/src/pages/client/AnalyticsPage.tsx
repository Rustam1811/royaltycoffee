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
import { Card, CardBody, CardHeader, WorkshopLoader } from '@/components/ui';
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
    return leaderboard.slice(0, 10).reduce((s, e) => s + getLeaderValue(e), 0);
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <h1 className="text-xl font-bold">Аналитика</h1>
        <p className="text-white/60 text-sm mt-0.5">{isAdmin ? 'Статистика всех заказов' : 'Статистика ваших заказов'}</p>
      </div>

      {/* Period */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto">
        {([
          { value: '7', label: '7 дней' },
          { value: '30', label: '30 дней' },
          { value: '90', label: '3 месяца' },
          { value: '180', label: '6 мес' },
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

      {/* Stat Cards */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <StatCard icon={ShoppingBagIcon} color="blue" value={totalOrders} label="Заказов" />
        <StatCard icon={CurrencyDollarIcon} color="green" value={`${(totalAmount / 1000).toFixed(totalAmount >= 1000 ? 0 : 1)}K`} label="Сумма (₸)" />
        <StatCard icon={ChartBarIcon} color="purple" value={avgCheck.toLocaleString()} label="Средний чек" />
        <StatCard icon={CalendarDaysIcon} color="amber" value={uniqueDays} label="Дней с заказами" />
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200">
        {(['summary', 'leaderboard', 'orders', 'products'] as const)
          .filter(tab => isAdmin || tab !== 'leaderboard')
          .map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-workshop-500 text-workshop-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'summary' ? 'Обзор' : tab === 'leaderboard' ? '🏆 Рейтинг' : tab === 'orders' ? 'История' : 'Продукты'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {/* ── Summary tab ── */}
          {activeTab === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Monthly breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-slate-900">По месяцам</h3>
                </CardHeader>
                <CardBody>
                  {monthlyData.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">Нет данных за период</p>
                  ) : (
                    <div className="space-y-3">
                      {monthlyData.map(m => {
                        const maxAmt = Math.max(...monthlyData.map(x => x.amount), 1);
                        const pct = (m.amount / maxAmt) * 100;
                        return (
                          <div key={m.month}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-slate-700">{m.month}</span>
                              <span className="text-slate-500">{m.orders} зак. · {m.amount.toLocaleString()} ₸</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full bg-workshop-500 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Status breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-slate-900">По статусам</h3>
                </CardHeader>
                <CardBody className="space-y-2">
                  {Object.entries(
                    filteredOrders.reduce<Record<string, number>>((acc, o) => {
                      acc[o.status] = (acc[o.status] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => {
                    const cfg = STATUS_LABELS[status as OrderStatus];
                    const Icon = cfg.icon;
                    return (
                      <div key={status} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cfg.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-slate-700">{cfg.label}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            </motion.div>
          )}

          {/* ── Orders history tab ── */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {ordersByDay.length === 0 ? (
                <p className="text-center text-slate-400 py-12">Нет заказов за период</p>
              ) : (
                ordersByDay.map(([dateKey, dayOrders]) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      {formatDayHeader(new Date(dateKey))}
                    </p>
                    <div className="space-y-2">
                      {dayOrders.map(order => {
                        const open = expandedOrder === order.id;
                        const cfg = STATUS_LABELS[order.status];
                        const Icon = cfg.icon;
                        return (
                          <Card key={order.id}>
                            <CardBody className="p-3">
                              <button
                                onClick={() => setExpandedOrder(open ? null : order.id)}
                                className="w-full flex items-center justify-between"
                              >
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                      <Icon className="w-3 h-3" />{cfg.label}
                                    </span>
                                    <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1">
                                    {isAdmin && order.clientName && (
                                      <span className="font-medium text-slate-800">{order.clientName} · </span>
                                    )}
                                    {order.outletName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{order.totalAmount.toLocaleString()} ₸</span>
                                  {open ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                                </div>
                              </button>
                              <AnimatePresence>
                                {open && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                                      {order.items.map(item => (
                                        <div key={item.productId} className="flex justify-between text-sm">
                                          <span className="text-slate-600">
                                            {getLocalizedName(item.productName)} × {item.quantity}
                                          </span>
                                          <span className="font-medium text-slate-900">{item.subtotal.toLocaleString()} ₸</span>
                                        </div>
                                      ))}
                                      {order.notes && (
                                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">💬 {order.notes}</p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* ── Leaderboard tab ── */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Sub-tabs: per category + По сумме */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryList.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setLeaderboardMode(cat.id); setExpandedLeader(null); }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      leaderboardMode === cat.id
                        ? 'bg-workshop-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
                <button
                  onClick={() => { setLeaderboardMode('amount'); setExpandedLeader(null); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    leaderboardMode === 'amount'
                      ? 'bg-workshop-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  💰 По сумме
                </button>
              </div>

              {/* Header stats — Top 10 total + user */}
              <div className="bg-gradient-to-r from-[#3D0A11] to-[#5A0D17] rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Топ 10 итого</p>
                    <p className="text-2xl font-bold mt-1">{getLeaderLabel(top10Total)}</p>
                  </div>
                  <div className="text-right">
                    {!isAdmin && myRank !== null && myRank <= leaderboard.length ? (
                      <>
                        <p className="text-white/60 text-xs">Вы · #{myRank}</p>
                        <p className="text-xl font-bold mt-1">
                          {getLeaderLabel(getLeaderValue(leaderboard[myRank - 1]))}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/60 text-xs">Участников</p>
                        <p className="text-xl font-bold mt-1">{leaderboard.length}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Top 10 label */}
              {leaderboard.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Топ 10 · {leaderboardMode === 'amount' ? 'по сумме' : categoryList.find(c => c.id === leaderboardMode)?.name || ''}
                </p>
              )}

              {/* Leaderboard list */}
              {leaderboard.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-center text-slate-400 py-8">Нет данных за выбранный период</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-3">
                  {/* Show top 10 */}
                  {leaderboard.slice(0, 10).map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.clientId === myClientId;
                    const val = getLeaderValue(entry);
                    const maxVal = getLeaderValue(leaderboard[0]) || 1;
                    const pct = (val / maxVal) * 100;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                    const isExpanded = expandedLeader === entry.clientId;
                    const avgCheck = entry.orderCount > 0 ? Math.round(entry.totalAmount / entry.orderCount) : 0;
                    const shareOfTotal = leaderboard.slice(0, 10).reduce((s, e) => s + getLeaderValue(e), 0);
                    const sharePct = shareOfTotal > 0 ? ((val / shareOfTotal) * 100).toFixed(1) : '0';

                    return (
                      <motion.div
                        key={entry.clientId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative"
                        style={{ zIndex: isExpanded ? 10 : 1 }}
                      >
                        <div className={`transition-transform duration-300 ease-out origin-center ${isExpanded ? 'scale-[1.03]' : 'scale-100'}`}>
                        <Card className={`transition-shadow duration-300 ${isMe ? 'ring-2 ring-workshop-400 shadow-md' : ''} ${isExpanded ? 'shadow-xl ring-2 ring-workshop-300' : ''}`}>
                          <CardBody className="!p-3">
                            <button
                              onClick={() => setExpandedLeader(isExpanded ? null : entry.clientId)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-transform duration-300 ${
                                  isExpanded ? 'scale-125' : ''
                                } ${
                                  rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                  rank === 2 ? 'bg-slate-100 text-slate-600' :
                                  rank === 3 ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-50 text-slate-400'
                                }`}>
                                  {medal || rank}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`text-sm font-semibold truncate ${isMe ? 'text-workshop-600' : 'text-slate-800'}`}>
                                        {entry.clientName || 'Без имени'}
                                      </span>
                                      {isMe && (
                                        <span className="text-[10px] bg-workshop-100 text-workshop-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">Вы</span>
                                      )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 flex-shrink-0 ml-2">
                                      {getLeaderLabel(val)}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.6, delay: i * 0.04 }}
                                      className={`h-full rounded-full ${
                                        rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-slate-400' : rank === 3 ? 'bg-orange-400' : 'bg-workshop-300'
                                      }`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                    <span>{entry.orderCount} {entry.orderCount === 1 ? 'заказ' : entry.orderCount < 5 ? 'заказа' : 'заказов'}</span>
                                    {entry.topProducts.length > 0 && (
                                      <span className="truncate">★ {entry.topProducts.slice(0, 2).map(p => `${p.name} (${p.qty})`).join(', ')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                            <div
                              className="overflow-hidden transition-all duration-300 ease-in-out"
                              style={{ maxHeight: isExpanded ? '600px' : '0px', opacity: isExpanded ? 1 : 0 }}
                            >
                              <div className="pt-3 mt-3 border-t border-slate-100 space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                    <p className="text-lg font-bold text-slate-900">{entry.orderCount}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight">заказов</p>
                                  </div>
                                  <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                    <p className="text-lg font-bold text-slate-900">{avgCheck.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight">средний чек ₸</p>
                                  </div>
                                  <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                    <p className="text-lg font-bold text-workshop-600">{sharePct}%</p>
                                    <p className="text-[10px] text-slate-400 leading-tight">доля от топ 10</p>
                                  </div>
                                </div>
                                {entry.topProducts.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Топ продукты</p>
                                    <div className="space-y-1.5">
                                      {entry.topProducts.slice(0, 5).map((p, pi) => {
                                        const maxQty = entry.topProducts[0]?.qty || 1;
                                        const productPct = (p.qty / maxQty) * 100;
                                        return (
                                          <div key={pi}>
                                            <div className="flex items-center justify-between text-xs mb-0.5">
                                              <span className="text-slate-600 truncate mr-2">{p.name}</span>
                                              <span className="font-semibold text-slate-800 flex-shrink-0">{p.qty} шт</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                              <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${productPct}%` }}
                                                transition={{ duration: 0.4, delay: pi * 0.05 }}
                                                className="h-full bg-workshop-200 rounded-full"
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between bg-workshop-50 rounded-xl px-3 py-2">
                                  <span className="text-xs font-medium text-workshop-600">Общая сумма</span>
                                  <span className="text-base font-bold text-workshop-700">{entry.totalAmount.toLocaleString()} ₸</span>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* If current user is NOT in top 10 — show separator + their row */}
                  {!isAdmin && myRank !== null && myRank > 10 && (() => {
                    const myEntry = leaderboard[myRank - 1];
                    const myVal = getLeaderValue(myEntry);
                    const maxVal = getLeaderValue(leaderboard[0]) || 1;
                    const pct = (myVal / maxVal) * 100;
                    const isMyExpanded = expandedLeader === myEntry.clientId;
                    const myAvgCheck = myEntry.orderCount > 0 ? Math.round(myEntry.totalAmount / myEntry.orderCount) : 0;
                    return (
                      <>
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 border-t border-dashed border-slate-300" />
                          <span className="text-xs text-slate-400 font-medium">···  ваше место  ···</span>
                          <div className="flex-1 border-t border-dashed border-slate-300" />
                        </div>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                          className="relative"
                          style={{ zIndex: isMyExpanded ? 10 : 1 }}
                        >
                          <div className={`transition-transform duration-300 ease-out origin-center ${isMyExpanded ? 'scale-[1.03]' : 'scale-100'}`}>
                          <Card className={`ring-2 ring-workshop-400 transition-shadow duration-300 ${isMyExpanded ? 'shadow-xl' : 'shadow-md'}`}>
                            <CardBody className="!p-3">
                              <button
                                onClick={() => setExpandedLeader(isMyExpanded ? null : myEntry.clientId)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold bg-workshop-100 text-workshop-600 transition-transform duration-300 ${isMyExpanded ? 'scale-125' : ''}`}>
                                    {myRank}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm font-semibold truncate text-workshop-600">
                                          {myEntry.clientName || 'Без имени'}
                                        </span>
                                        <span className="text-[10px] bg-workshop-100 text-workshop-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">Вы</span>
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 flex-shrink-0 ml-2">
                                        {getLeaderLabel(myVal)}
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        className="h-full rounded-full bg-workshop-400"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                      <span>{myEntry.orderCount} {myEntry.orderCount === 1 ? 'заказ' : myEntry.orderCount < 5 ? 'заказа' : 'заказов'}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                              <div
                                className="overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxHeight: isMyExpanded ? '600px' : '0px', opacity: isMyExpanded ? 1 : 0 }}
                              >
                                <div className="pt-3 mt-3 border-t border-slate-100 space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                      <p className="text-lg font-bold text-slate-900">{myEntry.orderCount}</p>
                                      <p className="text-[10px] text-slate-400 leading-tight">заказов</p>
                                    </div>
                                    <div className="text-center bg-slate-50 rounded-xl py-2 px-1">
                                      <p className="text-lg font-bold text-slate-900">{myAvgCheck.toLocaleString()}</p>
                                      <p className="text-[10px] text-slate-400 leading-tight">средний чек ₸</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between bg-workshop-50 rounded-xl px-3 py-2">
                                    <span className="text-xs font-medium text-workshop-600">Общая сумма</span>
                                    <span className="text-base font-bold text-workshop-700">{myEntry.totalAmount.toLocaleString()} ₸</span>
                                  </div>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
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
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-slate-900">Топ продуктов за период</h3>
                </CardHeader>
                <CardBody>
                  {topProducts.length === 0 ? (
                    <p className="text-center text-slate-400 py-6">Нет данных</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => {
                        const maxQty = topProducts[0]?.qty || 1;
                        const pct = (p.qty / maxQty) * 100;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-workshop-100 text-workshop-600 text-xs font-bold flex items-center justify-center">
                                  {i + 1}
                                </span>
                                <span className="text-sm font-medium text-slate-800">{p.name}</span>
                              </div>
                              <div className="text-right text-sm">
                                <span className="font-semibold text-slate-900">{p.qty} шт</span>
                                <span className="text-slate-400 ml-2">{p.amount.toLocaleString()} ₸</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="h-full bg-workshop-400 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
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
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardBody className="text-center">
          <div className={`w-10 h-10 rounded-full ${colors[color]} flex items-center justify-center mx-auto mb-2`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default AnalyticsPage;
