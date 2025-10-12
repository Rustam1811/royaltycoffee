import React, { useState, useCallback, useEffect } from 'react';
import { motion, Variants, useReducedMotion } from 'framer-motion';
import { StarIcon, CurrencyDollarIcon, ShoppingBagIcon, PencilIcon } from '@heroicons/react/24/solid';
import { AchievementList } from '../components/AchievementList';
import { PromotionBanner } from '../components/PromotionBanner';
import { EditProfileModal } from '../components/EditProfileModal';
import { useAuth } from '../auth/AuthContext';
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

// Default fallback avatar
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80';

const initialUserProfile = {
  bonusData: {
    balance: 0,
    level: 'Новичок',
    nextLevel: 'Любитель',
    ordersToNextLevel: 10,
    totalOrders: 0,
    multiplier: 1.0,
  },
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
  const [showEditModal, setShowEditModal] = useState(false);
  const prefersReduced = useReducedMotion();
  const { user, updateProfile } = useAuth();

  const fetchBonusData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await fetch(apiUrl('bonus', { action: 'user', userId: user.uid }));
      if (response.ok) {
        const bonusData = await response.json();
        setProfile((prev) => ({ ...prev, bonusData }));
      }
    } catch (e) {
      console.error('Failed to fetch bonus data', e);
    }
  }, [user?.uid]);

  const fetchOrderStats = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const url = apiUrl('orders', { action: 'get', userId: user.uid });
      console.log('[Profile] Fetching orders from:', url);
      console.log('[Profile] User ID:', user.uid);
      
      const response = await fetch(url);
      if (response.ok) {
        const orders: Order[] = await response.json();
        console.log('[Profile] Orders received:', orders.length, orders);
        
        const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
        const averageOrderValue = orders.length > 0 ? Math.round(totalSpent / orders.length) : 0;
        const itemCounts: Record<string, number> = {};
        orders.forEach((order: Order) => {
          order.items?.forEach((item: OrderItem) => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
          });
        });
        const favoriteItem = Object.keys(itemCounts).length > 0 
          ? Object.keys(itemCounts).reduce((a, b) => (itemCounts[a] > itemCounts[b] ? a : b), 'Капучино')
          : 'Капучино';
        setProfile((prev) => ({ ...prev, orderStats: { totalSpent, favoriteItem, averageOrderValue } }));
      } else {
        console.error('[Profile] Failed to fetch orders:', response.status, await response.text());
      }
    } catch (e) {
      console.error('Failed to fetch order stats', e);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      fetchBonusData();
      fetchOrderStats();
    }
  }, [user?.uid, fetchBonusData, fetchOrderStats]);

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
    <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white text-black">
      <header className="sticky top-0 z-10 bg-white p-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <h1 className="text-2xl font-extrabold text-black text-center">Профиль</h1>
      </header>

      <main className="p-4 space-y-8 pb-28">
        <motion.section custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="bg-surface rounded-3xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={user?.avatar || DEFAULT_AVATAR} 
                alt="Аватар" 
                className="w-20 h-20 rounded-full object-cover shadow-lg shadow-[0_0_0_4px_white]" 
              />
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900">{user?.name || 'Пользователь'}</h2>
                  <p className="text-slate-500 text-sm mt-1">{user?.phone || 'Добавьте номер телефона'}</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(true)} 
                  className="bg-slate-900 hover:bg-black text-white p-3 rounded-xl transition-colors shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={updateProfile}
      />
    </div>
  );
};

export default UltimateProfilePage;