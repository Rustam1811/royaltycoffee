import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, ArrowPathIcon, TrophyIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import BottomSheet from '@/components/BottomSheet';
import { api } from '../services/api';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ListedUser {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  ordersCount: number;
  bonusBalance: number;
  totalSpent: number;
  lastOrderDate: string | null;
  level: string;
  levelRank: number;
  isCloseFriend?: boolean;
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
      console.log('📊 RAW response:', data);
      console.log('📊 Type of response:', typeof data);
      console.log('📊 Is array?', Array.isArray(data));
      console.log('👥 data.users:', data.users);
      console.log('👥 Type of data.users:', typeof data.users);
      console.log('👥 Is users array?', Array.isArray(data.users));
      console.log('📈 Количество пользователей:', data.users?.length || 0);
      
      if (!data || !data.users) {
        console.error('⚠️ Нет массива users в ответе!');
        setError('Нет данных пользователей в ответе API');
        setUsers([]);
      } else {
        console.log('✅ Устанавливаем', data.users.length, 'пользователей');
        setUsers(data.users);
      }
    } catch (e) {
      const err = e as Error;
      console.error('❌ Ошибка загрузки пользователей:', err);
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Error details:', (err as Error & { details?: unknown }).details);
      setError(err.message || 'Ошибка загрузки');
      setUsers([]);
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

  async function toggleCloseFriend(userId: string, currentValue: boolean) {
    try {
      console.log('🔄 Переключаем статус близкого друга для:', userId);
      console.log('📝 Текущее значение:', currentValue);
      console.log('📝 Новое значение:', !currentValue);
      
      // Попробуем найти пользователя по phone если ID не работает
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        isCloseFriend: !currentValue
      });
      
      console.log('✅ Firestore обновлён успешно');
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isCloseFriend: !currentValue } : u
      ));
      
      if (activeUser?.id === userId) {
        setActiveUser({ ...activeUser, isCloseFriend: !currentValue });
      }
      
      console.log('✅ Статус близкого друга обновлён:', !currentValue);
      
      // Показать уведомление
      alert(`✅ Пользователь ${!currentValue ? 'добавлен в' : 'удалён из'} список близких друзей!`);
    } catch (err) {
      console.error('❌ Ошибка обновления статуса:', err);
      console.error('❌ User ID:', userId);
      console.error('❌ Error details:', err);
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Не удалось обновить статус'}\n\nПроверьте консоль для деталей.`);
    }
  }

  function closeDrawer() { setActiveUser(null); }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-20">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-sans">Пользователи</h1>
              <p className="text-sm text-slate-600">Статусы и активность гостей</p>
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
          <div className="py-20 text-center text-slate-600">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-600">Нет данных</div>
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
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] hover:shadow-lg transition relative">
                  {/* Индикатор близкого друга */}
                  {u.isCloseFriend && (
                    <div className="absolute top-3 right-3">
                      <HeartIconSolid className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-3">
                    {/* Аватар */}
                    <div className="flex-shrink-0">
                      {u.avatar ? (
                        <img 
                          src={u.avatar} 
                          alt={u.name || 'User'} 
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                          <span className="text-xl font-bold text-slate-600">
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Имя и статус */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {u.name || u.email || u.id.slice(-6)}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 ${levelColors[u.level] || 'bg-slate-100 text-slate-700'}`}>
                          <TrophyIcon className="w-3.5 h-3.5" /> {u.level}
                        </div>
                      </div>
                      
                      {/* Email */}
                      {u.email && (
                        <p className="text-xs text-slate-600 truncate mb-1">
                          📧 {u.email}
                        </p>
                      )}
                      
                      {/* Телефон */}
                      {u.phone && (
                        <p className="text-xs text-slate-600 truncate">
                          📱 {u.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Статистика */}
                  <div className="text-xs text-slate-600 space-y-1 border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span>Заказов:</span>
                      <span className="font-semibold text-slate-900">{u.ordersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Бонусов:</span>
                      <span className="font-semibold text-amber-600">{u.bonusBalance || 0} ₸</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Потрачено:</span>
                      <span className="font-semibold text-emerald-600">{u.totalSpent || 0} ₸</span>
                    </div>
                    {u.lastOrderDate && (
                      <div className="text-[10px] text-slate-600 mt-2">
                        Последний заказ: {new Date(u.lastOrderDate).toLocaleDateString('ru-RU')} {new Date(u.lastOrderDate).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                      </div>
                    )}
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
                <p className="text-xs text-slate-600 break-all">ID: {activeUser.id}</p>
              </div>
              <button onClick={closeDrawer} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>

            {/* Статус близкого друга */}
            <div 
              onClick={() => toggleCloseFriend(activeUser.id, activeUser.isCloseFriend || false)}
              className="mb-6 p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-98"
              style={{
                borderColor: activeUser.isCloseFriend ? '#22c55e' : '#e2e8f0',
                backgroundColor: activeUser.isCloseFriend ? '#f0fdf4' : '#ffffff',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {activeUser.isCloseFriend ? (
                    <HeartIconSolid className="w-6 h-6 text-green-600" />
                  ) : (
                    <HeartIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: activeUser.isCloseFriend ? '#16a34a' : '#475569' }}>
                    Близкий друг
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {activeUser.isCloseFriend 
                      ? 'Видит все Stories, включая для избранных' 
                      : 'Видит только обычные Stories'}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div 
                    className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: activeUser.isCloseFriend ? '#22c55e' : '#cbd5e1',
                      backgroundColor: activeUser.isCloseFriend ? '#22c55e' : '#ffffff',
                    }}
                  >
                    {activeUser.isCloseFriend && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {detailLoading && <div className="text-sm text-slate-600 mb-4">Загрузка...</div>}

            <div className="space-y-6">
              <section>
                <h3 className="font-medium mb-2">Заказы <span className="text-xs text-slate-600">{userOrders?.length ?? 0}</span></h3>
                {userOrders && userOrders.length === 0 && <div className="text-xs text-slate-600">Нет заказов</div>}
                <ul className="space-y-2">
                  {userOrders?.map(o => (
                    <li key={o.id} className="p-3 rounded-xl bg-slate-100 text-xs">
                      <div className="flex justify-between">
                        <span className="truncate font-medium">{o.id.slice(-6)}</span>
                        <span className="font-semibold">{o.amount ?? o.totalAmount ?? 0}</span>
                      </div>
                      {!!o.items?.length && (
                        <ul className="mt-2 space-y-1">
                          {o.items.map((it, idx) => (
                            <li key={it.id || idx} className="flex justify-between text-[11px] text-slate-600">
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
                <h3 className="font-medium mb-2">Достижения <span className="text-xs text-slate-600">{userAchievements?.length ?? 0}</span></h3>
                {userAchievements && userAchievements.length === 0 && <div className="text-xs text-slate-600">Нет достижений</div>}
                <ul className="space-y-2">
                  {userAchievements?.map(a => (
                    <li key={a.id} className="p-3 rounded-xl bg-slate-100 text-xs flex justify-between">
                      <span className="truncate">{a.achievementId || a.id}</span>
                      {a.createdAt && <span className="text-[10px] text-slate-600">{new Date(a.createdAt).toLocaleDateString('ru-RU')}</span>}
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
