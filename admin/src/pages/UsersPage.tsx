import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, ArrowPathIcon, TrophyIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet';
import { api } from '../services/api';

interface ListedUser {
  id: string;
  email: string | null;
  name: string | null;
  ordersCount: number;
  lastOrderDate: string | null;
  level: string;
  levelRank: number;
}

interface UserOrder { id: string; amount?: number; totalAmount?: number; items?: Array<{ id?: string; name?: string; price?: number; quantity?: number; sizeKey?: string; milkKey?: string; syrupKey?: string }>; }
interface UserAchievement { id: string; achievementId?: string; createdAt?: string; }

const levelColors: Record<string, string> = {
  'Новичок': 'bg-slate-100 text-slate-700',
  'Любитель': 'bg-emerald-100 text-emerald-700',
  'Эксперт': 'bg-indigo-100 text-indigo-700',
  'VIP': 'bg-amber-100 text-amber-700',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ListedUser | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[] | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Загружаем пользователей...');
      const data = await api.get<{ users: ListedUser[] }>('/users?action=list');
      console.log('📊 Получены данные пользователей:', data);
      console.log('👥 Массив пользователей:', data.users);
      console.log('📈 Количество пользователей:', data.users?.length || 0);
      setUsers(data.users || []);
    } catch (e) {
      const err = e as Error;
      console.error('❌ Ошибка загрузки пользователей:', err);
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setTimeout(() => setRefreshing(false), 400);
  };

  async function openUser(u: ListedUser) {
    setActiveUser(u);
    setDetailLoading(true);
    setUserOrders(null); setUserAchievements(null);
    try {
      const [ord, ach] = await Promise.all([
        api.get<UserOrder[] | { orders: UserOrder[] }>(`/orders?action=get&userId=${u.id}`),
        api.get<{ userAchievements: UserAchievement[] }>(`/promo?action=achievements&userId=${u.id}`)
      ]);
      setUserOrders(Array.isArray(ord) ? ord : (ord as { orders: UserOrder[] }).orders || []);
      setUserAchievements(ach.userAchievements || []);
    } catch {
      // ignore
    } finally {
        setDetailLoading(false);
    }
  }

  function closeDrawer() { setActiveUser(null); }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-family-heading)]">Пользователи</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Статусы и активность гостей</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold shadow hover:bg-black transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-[var(--color-text-secondary)]">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-secondary)]">Нет данных</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.map(u => (
              <motion.div
                key={u.id}
                onClick={() => openUser(u)}
                className="cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-5 shadow-card hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{u.name || u.email || u.id.slice(-6)}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">ID: {u.id}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 ${levelColors[u.level] || 'bg-slate-100 text-slate-700'}`}>
                      <TrophyIcon className="w-3.5 h-3.5" /> {u.level}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                    <div>Заказов: <span className="font-semibold text-[var(--color-text-primary)]">{u.ordersCount}</span></div>
                    {u.lastOrderDate && <div>Последний: {new Date(u.lastOrderDate).toLocaleDateString('ru-RU')} {new Date(u.lastOrderDate).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <BottomSheet open={!!activeUser} onClose={closeDrawer} variant="light">
        {activeUser && (
          <div className="px-4 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{activeUser.name || activeUser.email || activeUser.id}</h2>
                <p className="text-xs text-[var(--color-text-secondary)] break-all">ID: {activeUser.id}</p>
              </div>
              <button onClick={closeDrawer} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>

            {detailLoading && <div className="text-sm text-[var(--color-text-secondary)] mb-4">Загрузка...</div>}

            <div className="space-y-6">
              <section>
                <h3 className="font-medium mb-2">Заказы <span className="text-xs text-[var(--color-text-secondary)]">{userOrders?.length ?? 0}</span></h3>
                {userOrders && userOrders.length === 0 && <div className="text-xs text-[var(--color-text-secondary)]">Нет заказов</div>}
                <ul className="space-y-2">
                  {userOrders?.map(o => (
                    <li key={o.id} className="p-3 rounded-xl bg-[var(--color-bg-hover)] text-xs">
                      <div className="flex justify-between">
                        <span className="truncate font-medium">{o.id.slice(-6)}</span>
                        <span className="font-semibold">{o.amount ?? o.totalAmount ?? 0}</span>
                      </div>
                      {!!o.items?.length && (
                        <ul className="mt-2 space-y-1">
                          {o.items.map((it, idx) => (
                            <li key={it.id || idx} className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
                              <div className="min-w-0 pr-2">
                                <div className="truncate">{(it.name || 'Товар')} {it.quantity ? `×${it.quantity}` : ''}</div>
                                {(it.sizeKey || it.milkKey || it.syrupKey) && (
                                  <div className="truncate text-[10px] opacity-80">
                                    {[it.sizeKey && `Размер: ${it.sizeKey}`, it.milkKey && `Молоко: ${it.milkKey}`, it.syrupKey && `Сироп: ${it.syrupKey}`]
                                      .filter(Boolean)
                                      .join(' • ')}
                                  </div>
                                )}
                              </div>
                              {typeof it.price === 'number' && (
                                <span className="whitespace-nowrap">{it.quantity ? it.price * it.quantity : it.price}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-medium mb-2">Достижения <span className="text-xs text-[var(--color-text-secondary)]">{userAchievements?.length ?? 0}</span></h3>
                {userAchievements && userAchievements.length === 0 && <div className="text-xs text-[var(--color-text-secondary)]">Нет достижений</div>}
                <ul className="space-y-2">
                  {userAchievements?.map(a => (
                    <li key={a.id} className="p-3 rounded-xl bg-[var(--color-bg-hover)] text-xs flex justify-between">
                      <span className="truncate">{a.achievementId || a.id}</span>
                      {a.createdAt && <span className="text-[10px] text-[var(--color-text-secondary)]">{new Date(a.createdAt).toLocaleDateString('ru-RU')}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};

export default UsersPage;
