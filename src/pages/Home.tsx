import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingBagIcon } from '@heroicons/react/24/solid';
import { InstagramStoriesNew } from '../components/InstagramStoriesNew';
import { PromotionBanner } from '../components/PromotionBanner';
import { AchievementList } from '../components/AchievementList';
import { useHistory } from 'react-router-dom';
import { drinkCategories } from './menu/data/drinksData';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../config/api';
import { listContainer, listItem } from '../ui/motion';

interface OrderItem { name: string; quantity: number }
interface Order { amount?: number; items?: OrderItem[] }

const getUserData = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        name: user.name || 'Гость',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80',
        isNew: user.isNew || false,
        favoriteDrink: user.favoriteDrink || {
          name: 'Капучино',
          image: 'https://images.unsplash.com/photo-1557006034-834c6c0d49c2?auto=format&fit=crop&w=800&q=80',
        },
      };
    }
  } catch {}
  return {
    name: 'Гость',
    avatar: 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80',
    isNew: false,
    favoriteDrink: {
      name: 'Капучино',
      image: 'https://images.unsplash.com/photo-1557006034-834c6c0d49c2?auto=format&fit=crop&w=800&q=80',
    },
  };
};

const curatedListData = {
  title: 'Идеально к вашему утру',
  items: [
    { id: 1, name: 'Двойной эспрессо', image: 'https://images.unsplash.com/photo-1608079635298-c2693a43c64e?auto=format&fit=crop&w=800&q=80' },
    { id: 2, name: 'Свежий круассан', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80' },
    { id: 3, name: 'Фильтр-кофе', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80' },
  ],
};

const ProfilePill = ({ name, avatar }: { name: string; avatar: string }) => (
  <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl rounded-full p-1 pr-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]">
    <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
    <span className="font-semibold text-slate-800 text-sm">Привет, {name}</span>
  </div>
);

const HomePage: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const [user] = useState(getUserData());
  const prefersReduced = useReducedMotion();

  const drinkImages: Record<string, string> = useMemo(() => ({
    Капучино: 'https://images.unsplash.com/photo-1557006034-834c6c0d49c2?auto=format&fit=crop&w=800&q=80',
    Латте: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=800&q=80',
    Эспрессо: 'https://images.unsplash.com/photo-1608079635298-c2693a43c64e?auto=format&fit=crop&w=800&q=80',
    Американо: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=800&q=80',
    Мокко: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80',
  }), []);
  const getDrinkImage = useCallback((name: string) => drinkImages[name] || drinkImages['Капучино'], [drinkImages]);

  const getMenuItemByName = useCallback((itemName: string) => {
    for (const category of drinkCategories) {
      const item = category.products.find((product) => t(product.name) === itemName);
      if (item) {
        return {
          id: item.id,
          name: itemName,
          price: item.price,
          image: item.image.startsWith('/') ? `${window.location.origin}${item.image}` : item.image,
        };
      }
    }
    return { id: Date.now(), name: itemName, price: 1500, image: getDrinkImage(itemName) };
  }, [t, getDrinkImage]);

  const [favoriteItem, setFavoriteItem] = useState<{ id: number | string; name: string; price?: number; image: string }>({
    name: user.favoriteDrink?.name || 'Капучино',
    price: 1500,
    image: user.favoriteDrink?.image || drinkImages['Капучино'],
    id: 0,
  });

  const getUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        return u.phone || u.id || u.userId || '87053096206';
      }
    } catch {}
    return '87053096206';
  };

  useEffect(() => {
    (async () => {
      try {
        const userId = getUserId();
        const response = await fetch(apiUrl('orders', { action: 'get', userId }));
        if (response.ok) {
          const orders: Order[] = await response.json();
          const counts: Record<string, number> = {};
          orders.forEach((order) => order.items?.forEach((it) => { counts[it.name] = (counts[it.name] || 0) + it.quantity; }));
          if (Object.keys(counts).length > 0) {
            const favName = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
            const menuItem = getMenuItemByName(favName);
            setFavoriteItem(menuItem);
            const u = getUserData();
            localStorage.setItem('user', JSON.stringify({ ...u, favoriteDrink: menuItem }));
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [getMenuItemByName]);

  const handleQuickOrder = () => {
    history.push('/order', { quickOrder: true, selectedItem: { id: favoriteItem.id, name: favoriteItem.name, image: favoriteItem.image, price: favoriteItem.price || 1500 } });
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white">
      <header className="sticky top-0 z-30 px-4 py-3 bg-white/65 backdrop-blur-md shadow-[0_8px_20px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Coffee Addict</h1>
          <ProfilePill name={user.name} avatar={user.avatar} />
        </div>
      </header>

      <main className="p-4 space-y-8 pb-28">
        {/* Stories — теперь без серого блюра внутри колец и крупнее */}
        <section>
          <InstagramStoriesNew />
        </section>

        {/* Акции */}
        <section>
          <PromotionBanner maxItems={2} />
        </section>

        {/* Быстрый заказ — ЧИСТО БЕЛАЯ карточка */}
        <section>
          <div className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-[0_12px_32px_-16px_rgba(0,0,0,0.45)]">
                  <img src={favoriteItem.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 truncate">С возвращением, {user.name}!</h2>
                  <p className="text-sm text-slate-600">Ваш любимый {favoriteItem.name} ждёт.</p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleQuickOrder}
                className="mt-4 w-full h-12 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] active:shadow-none hover:bg-black transition-colors"
              >
                <ShoppingBagIcon className="w-5 h-5" />
                Заказать в 1 клик
              </motion.button>
            </div>
          </div>
        </section>

        {/* Достижения */}
        <section>
          <AchievementList />
        </section>

        {/* Подборка */}
        <section>
          <div className="px-5 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold tracking-tight">{curatedListData.title}</h2>
              <button className="text-sm text-slate-500">Смотреть все</button>
            </div>
            <motion.div
              variants={listContainer(0.25)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-3 gap-3"
            >
              {curatedListData.items.map((it) => (
                <motion.div key={it.id} variants={listItem(!!prefersReduced)} className="rounded-xl overflow-hidden bg-white shadow-card">
                  <img src={it.image} alt="" className="w-full h-24 object-cover" />
                  <div className="p-2 text-[12px] font-medium line-clamp-2">{it.name}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
