import React, { useState, useCallback, useEffect } from 'react';
import { motion, Variants, useReducedMotion } from 'framer-motion';
import { StarIcon, CurrencyDollarIcon, ShoppingBagIcon, PencilIcon } from '@heroicons/react/24/solid';
import { AchievementList } from '../components/AchievementList';
import { PromotionBanner } from '../components/PromotionBanner';
import { apiUrl } from '../config/api';

// Types for orders fetched from API
interface OrderItem {
  name: string;
  quantity: number;
}
interface Order {
  amount: number;
  items?: OrderItem[];
}

// Получаем данные пользователя из localStorage
const getUserData = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) return JSON.parse(userData);
  } catch (e) {
    console.warn('Failed to parse user data from localStorage', e);
  }
  return {
    id: '87053096206',
    name: 'Пользователь',
    phone: '87053096206',
    avatar:
      'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80',
  };
};

const saveUserData = (userData: { id: string; name: string; phone: string; avatar: string }) => {
  try {
    localStorage.setItem('user', JSON.stringify(userData));
  } catch (e) {
    console.warn('Failed to save user data to localStorage', e);
  }
};

const initialUserProfile = {
  name: 'Манарбек',
  avatar:
    'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80',
  stamps: 10,
  rarity: 'common',
  stampsToReward: 10,
  bonusData: {
    balance: 0,
    level: 'Новичок',
    nextLevel: 'Любитель',
    ordersToNextLevel: 10,
    totalOrders: 0,
    multiplier: 1.0,
  },
  recentOrders: [],
  orderStats: {
    totalSpent: 0,
    favoriteItem: 'Капучино',
    averageOrderValue: 0,
  },
};

interface StatsBarProps {
  bonusData: {
    balance: number;
    level: string;
    nextLevel: string;
    ordersToNextLevel: number;
    totalOrders: number;
    multiplier: number;
  };
}

const StatsBar: React.FC<StatsBarProps> = ({ bonusData }) => (
  <div className="space-y-4">
    {/* Card: progress to next level */}
    <div className="bg-surface rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-black text-white text-xs px-3 py-1 rounded-full font-semibold">{bonusData.level}</div>
          <div className="bg-black text-white text-xs px-3 py-1 rounded-full font-semibold">
            {bonusData.totalOrders} заказов
          </div>
        </div>
        <span className="text-xs text-gray-500">до {bonusData.nextLevel}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1">
        <motion.div
          className="bg-black h-1 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((bonusData.totalOrders / bonusData.ordersToNextLevel) * 100, 100)}%` }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>

    {/* Quick stats */}
    <div className="grid grid-cols-3 gap-3">
      <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card text-center">
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-lg mb-2">
          <CurrencyDollarIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-black">{bonusData.balance}</p>
        <p className="text-xs text-gray-600 font-medium">Бонусы</p>
      </motion.div>
      <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card text-center">
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-lg mb-2">
          <ShoppingBagIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-black">{bonusData.totalOrders}</p>
        <p className="text-xs text-gray-600 font-medium">Заказов</p>
      </motion.div>
      <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card text-center">
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-lg mb-2">
          <StarIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-black">x{bonusData.multiplier}</p>
        <p className="text-xs text-gray-600 font-medium">Множитель</p>
      </motion.div>
    </div>

    {/* Tip card */}
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="bg-surface rounded-2xl p-4 shadow-card">
      <h3 className="font-bold text-black mb-2">💡 Как использовать бонусы сегодня</h3>
      <p className="text-sm text-gray-600">
        Обменяй <span className="font-bold text-black">100 бонусов</span> → получи <span className="font-bold text-green-600">скидку 200 ₸</span> на капучино
      </p>
    </motion.div>
  </div>
);

const UltimateProfilePage: React.FC = () => {
  const [profile, setProfile] = useState(initialUserProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  const prefersReduced = useReducedMotion();

  const fetchBonusData = useCallback(async () => {
    try {
      const userId = getUserId();
      const response = await fetch(apiUrl('bonus', { action: 'user', userId }));
      if (response.ok) {
        const bonusData = await response.json();
        setProfile((prev) => ({ ...prev, bonusData }));
      }
    } catch (e) {
      console.error('Failed to fetch bonus data', e);
    }
  }, []);

  const fetchOrderStats = useCallback(async () => {
    try {
      const userId = getUserId();
      const response = await fetch(apiUrl('orders', { action: 'get', userId }));
      if (response.ok) {
        const orders: Order[] = await response.json();
        const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
        const averageOrderValue = orders.length > 0 ? Math.round(totalSpent / orders.length) : 0;
        const itemCounts: Record<string, number> = {};
        orders.forEach((order: Order) => {
          order.items?.forEach((item: OrderItem) => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
          });
        });
        const favoriteItem = Object.keys(itemCounts).reduce((a, b) => (itemCounts[a] > itemCounts[b] ? a : b), 'Капучино');
        setProfile((prev) => ({ ...prev, orderStats: { totalSpent, favoriteItem, averageOrderValue } }));
      }
    } catch (e) {
      console.error('Failed to fetch order stats', e);
    }
  }, []);

  useEffect(() => {
    fetchBonusData();
    fetchOrderStats();
    const userData = getUserData();
    setTempUserName(userData.name || 'Пользователь');
  }, [fetchBonusData, fetchOrderStats]);

  const getUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.phone || user.id || user.userId || '87053096206';
      }
    } catch (e) {
      console.warn('Failed to read user id from localStorage', e);
    }
    return '87053096206';
  };

  const handleSaveProfile = () => {
    const userData = getUserData();
    const updatedUserData = { ...userData, name: tempUserName };
    saveUserData(updatedUserData);
    setProfile((prev) => ({ ...prev, name: tempUserName }));
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    const userData = getUserData();
    setTempUserName(userData.name || 'Пользователь');
    setIsEditingProfile(false);
  };

  const sectionVariants: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: prefersReduced
        ? { duration: 0 }
        : { delay: i * 0.25 + 0.4, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  };

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      <header className="sticky top-0 z-10 bg-white p-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <h1 className="text-2xl font-extrabold text-black text-center">Профиль</h1>
      </header>

      <main className="p-4 space-y-8 pb-28">
        <motion.section custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="bg-surface rounded-3xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <img src={getUserData().avatar} alt="Аватар" className="w-20 h-20 rounded-full object-cover shadow-lg shadow-[0_0_0_4px_white]" />
              {isEditingProfile ? (
                <div className="flex-1">
                  <input
                    type="text"
                    value={tempUserName}
                    onChange={(e) => setTempUserName(e.target.value)}
                    className="text-3xl font-extrabold text-slate-900 bg-transparent shadow-[inset_0_-2px_0_rgba(59,130,246,1)] focus:shadow-[inset_0_-2px_0_rgba(37,99,235,1)] w-full"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleSaveProfile} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold">
                      Сохранить
                    </button>
                    <button onClick={handleCancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">{getUserData().name}</h2>
                    <p className="text-slate-500 text-sm mt-1">Нажмите на карандаш для редактирования</p>
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-colors shadow-lg">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
          <StatsBar bonusData={profile.bonusData} />
        </motion.section>

        <motion.section custom={2} initial="hidden" animate="visible" variants={sectionVariants}>
          <h3 className="text-lg font-bold text-black mb-4">Ваша статистика</h3>
          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-xl">☕</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-black">Любимый напиток</h4>
                <p className="text-gray-600 text-sm">{profile.orderStats.favoriteItem}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-black">Средний чек</h4>
                <p className="text-gray-600 text-sm">{profile.orderStats.averageOrderValue} ₸</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-surface p-4 rounded-2xl shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-xl">📊</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-black">Всего потрачено</h4>
                <p className="text-gray-600 text-sm">{profile.orderStats.totalSpent} ₸</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
          <AchievementList />
        </motion.section>

        <motion.section custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
          <PromotionBanner showAll={false} maxItems={2} />
        </motion.section>
      </main>
    </div>
  );
};

export default UltimateProfilePage;