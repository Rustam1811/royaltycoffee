import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InstagramStoriesNew } from '../components/InstagramStoriesNew';
import { PromotionBanner } from '../components/PromotionBanner';
import { RoyalLoader } from '../components/RoyalLoader';
import { AchievementBadgeCompact, getCashbackPercent } from '../components/AchievementBadge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { 
  TrophyIcon, 
  SparklesIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  CakeIcon,
  FireIcon,
} from '@heroicons/react/24/solid';

// Ленивая загрузка 3D компонента
const Cup3D = lazy(() => import('../components/Cup3D'));

// Фон Royalty Coffee  
const ROYAL_BG = '/images/royal-bg.jpg';

interface LeaderboardUser {
  id: string;
  name: string;
  ordersCount: number;
  bonusBalance: number;
  totalSpent: number;
  position: number;
}

/* ─── Language flag picker with real SVG flags ─── */
const FlagRU: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 900 600" className={className}>
    <rect width="900" height="200" fill="#fff" />
    <rect y="200" width="900" height="200" fill="#0039A6" />
    <rect y="400" width="900" height="200" fill="#D52B1E" />
  </svg>
);
const FlagKZ: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 900 600" className={className}>
    <rect width="900" height="600" fill="#00AFCA" />
    <circle cx="450" cy="300" r="100" fill="#FFD700" />
    {/* rays */}
    {Array.from({ length: 32 }).map((_, i) => {
      const a = (i * 360) / 32;
      const r1 = 110, r2 = 150;
      const x1 = 450 + r1 * Math.cos((a * Math.PI) / 180);
      const y1 = 300 + r1 * Math.sin((a * Math.PI) / 180);
      const x2 = 450 + r2 * Math.cos((a * Math.PI) / 180);
      const y2 = 300 + r2 * Math.sin((a * Math.PI) / 180);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="4" />;
    })}
    {/* ornament stripe */}
    <rect x="0" y="0" width="60" height="600" fill="#FFD700" opacity="0.3" />
  </svg>
);
const FlagUS: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 912 600" className={className}>
    {/* stripes */}
    {Array.from({ length: 13 }).map((_, i) => (
      <rect key={i} y={i * 46.15} width="912" height="46.15" fill={i % 2 === 0 ? '#B22234' : '#fff'} />
    ))}
    {/* blue canton */}
    <rect width="365" height="323" fill="#3C3B6E" />
  </svg>
);

const LANG_FLAGS: { code: string; label: string; Flag: React.FC<{ className?: string }> }[] = [
  { code: 'ru', label: 'RU', Flag: FlagRU },
  { code: 'kz', label: 'KZ', Flag: FlagKZ },
  { code: 'en', label: 'EN', Flag: FlagUS },
];

const LangPicker: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANG_FLAGS.find(l => l.code === i18n.language) || LANG_FLAGS[0];
  const others = LANG_FLAGS.filter(l => l.code !== i18n.language);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
      >
        <current.Flag className="w-6 h-4 rounded-[2px] shadow-sm" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-12 right-0 z-50 flex flex-col gap-1 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-xl border border-white/10 p-1.5 shadow-xl"
          >
            {others.map(lang => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center active:scale-90 transition-all"
              >
                <lang.Flag className="w-6 h-4 rounded-[2px] shadow-sm" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Click-away overlay */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
};

// Компонент вращающегося термоса с прогресс-кругом
const LoyaltyCard: React.FC<{ 
  bonusBalance: number; 
  ordersToFree: number; 
  totalOrders: number;
  totalSpent: number;
}> = ({ totalSpent }) => {
  const cashback = getCashbackPercent(totalSpent);
  
  // Прогресс до следующего уровня
  const levelThresholds = [0, 5000, 15000, 25000];
  const levelNames = ['Бронза', 'Серебро', 'Золото', 'Платинум'];
  let currentLevelIdx = 0;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalSpent >= levelThresholds[i]) { currentLevelIdx = i; break; }
  }
  const isMaxLevel = currentLevelIdx >= levelThresholds.length - 1;
  const nextThreshold = isMaxLevel ? levelThresholds[currentLevelIdx] : levelThresholds[currentLevelIdx + 1];
  const currentThreshold = levelThresholds[currentLevelIdx];
  const progressPercent = isMaxLevel ? 100 : Math.min(((totalSpent - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100);
  const spentToNext = isMaxLevel ? 0 : nextThreshold - totalSpent;
  
  return (
    <div className="relative rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#4A1A2C] via-[#2D0F1A] to-[#1A0A10]" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-600/15 to-transparent rounded-full blur-xl" />
      
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Уровень */}
            <div className="flex items-center gap-2 mb-4">
              <AchievementBadgeCompact ordersCount={0} totalSpent={totalSpent} />
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                {cashback}% кешбэк
              </span>
            </div>

            {/* Сколько потрачено */}
            <div className="flex items-center gap-2 mb-4">
              <ArrowTrendingUpIcon className="w-4 h-4 text-amber-400" />
              <span className="text-white text-sm font-medium">
                Потрачено: <span className="text-amber-300 font-bold">{totalSpent.toLocaleString()} ₸</span>
              </span>
            </div>
            
            {/* Прогресс до следующего уровня */}
            {!isMaxLevel ? (
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-100/90 text-xs">До уровня {levelNames[currentLevelIdx + 1]}</span>
                  <span className="text-amber-300 text-xs font-bold">{spentToNext.toLocaleString()} ₸</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 rounded-xl p-3 backdrop-blur-sm border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">Максимальный уровень</span>
                </div>
              </div>
            )}
          </div>
          
          {/* 3D термос */}
          <div className="relative flex-shrink-0 ml-2" style={{ width: 140, height: 140 }}>
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <SparklesIcon className="w-10 h-10 text-amber-400/50" />
              </div>
            }>
              <Cup3D className="w-full h-full" />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Drink & Food category matching ─── */
interface CategoryLeaderUser {
  id: string;
  name: string;
  count: number;
  position: number;
}

const DRINK_CATS: readonly { key: string; label: string }[] = [
  { key: 'all_drinks', label: 'Все' },
  { key: 'americano', label: 'Американо' },
  { key: 'cappuccino', label: 'Капучино' },
  { key: 'latte', label: 'Латте' },
  { key: 'raf', label: 'Раф' },
  { key: 'flat_white', label: 'Флэт уайт' },
  { key: 'matcha', label: 'Матча' },
] as const;

const FOOD_CATS: readonly { key: string; label: string }[] = [
  { key: 'all_food', label: 'Все' },
  { key: 'croissant', label: 'Круассаны' },
  { key: 'bakery', label: 'Выпечка' },
  { key: 'sandwich', label: 'Сэндвичи' },
  { key: 'dessert', label: 'Десерты' },
] as const;

function matchDrinkCategory(n: string): string | null {
  const s = n.toLowerCase();
  if (/америк/i.test(s)) return 'americano';
  if (/капуч/i.test(s)) return 'cappuccino';
  if (/латте|latte/i.test(s)) return 'latte';
  if (/раф|raf/i.test(s)) return 'raf';
  if (/флэт|flat\s?white/i.test(s)) return 'flat_white';
  if (/матча|matcha/i.test(s)) return 'matcha';
  // generic drink match
  if (/кофе|эспрессо|мокк|фраппе|какао|чай|tea|coffee/i.test(s)) return 'all_drinks';
  return null;
}

function matchFoodCategory(n: string): string | null {
  const s = n.toLowerCase();
  if (/круассан|croissant/i.test(s)) return 'croissant';
  if (/синнабон|маффин|кекс|печенье|брауни|эклер|шу |тарт|булочк/i.test(s)) return 'bakery';
  if (/сэндвич|панини|sandwich|тост|багет|wrap/i.test(s)) return 'sandwich';
  if (/чизкейк|тирамису|наполеон|медовик|пирожн|торт|десерт|cake|mousse/i.test(s)) return 'dessert';
  // generic food match
  if (/боул|салат|bowl|каша|гранола|йогурт/i.test(s)) return 'all_food';
  return null;
}

/* ─── Shared helpers ─── */
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

/* ─── Leaderboard Carousel — 3 stunning cards, horizontal snap-scroll ─── */
const LeaderboardCarousel: React.FC<{
  leaders: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
  drinkLeaders: Record<string, CategoryLeaderUser[]>;
  foodLeaders: Record<string, CategoryLeaderUser[]>;
  currentUserId?: string;
}> = ({ leaders, currentUser, drinkLeaders, foodLeaders, currentUserId }) => {
  const [drinkCat, setDrinkCat] = useState(DRINK_CATS[0].key);
  const [foodCat, setFoodCat] = useState(FOOD_CATS[0].key);

  const top10Spent = leaders.slice(0, 10);
  const drinkList = drinkLeaders[drinkCat] || [];
  const foodList = foodLeaders[foodCat] || [];

  const spentVisible = currentUser ? top10Spent.some(u => u.id === currentUser.id) : true;

  /* Medal config */
  const medal = (p: number) => {
    if (p === 1) return { ring: 'ring-amber-400/60', bg: 'bg-amber-400/20', text: 'text-amber-400', glow: 'shadow-amber-400/30' };
    if (p === 2) return { ring: 'ring-slate-300/50', bg: 'bg-slate-300/15', text: 'text-slate-300', glow: 'shadow-slate-300/20' };
    if (p === 3) return { ring: 'ring-amber-600/50', bg: 'bg-amber-600/15', text: 'text-amber-600', glow: 'shadow-amber-600/20' };
    return { ring: 'ring-white/10', bg: 'bg-white/[0.05]', text: 'text-white/40', glow: '' };
  };

  /* Row component */
  const Row: React.FC<{ pos: number; name: string; value: string; isMe: boolean }> = ({ pos, name, value, isMe }) => {
    const m = medal(pos);
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: pos * 0.03 }}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
          isMe ? 'bg-amber-400/[0.10] ring-1 ring-amber-400/25' : 'hover:bg-white/[0.03]'
        }`}
      >
        {/* Position badge */}
        <div className={`w-8 h-8 rounded-lg ${m.bg} ring-1 ${m.ring} flex items-center justify-center flex-shrink-0 ${pos <= 3 ? `shadow-md ${m.glow}` : ''}`}>
          {pos <= 3
            ? <TrophyIcon className={`w-4 h-4 ${m.text}`} />
            : <span className="text-[11px] font-bold text-white/35">{pos}</span>
          }
        </div>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#2A1520] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white/50 text-[10px] font-bold">{getInitials(name)}</span>
        </div>
        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="text-white/80 text-[13px] font-medium truncate block leading-tight">
            {name.split(' ')[0]}
            {isMe && <span className="text-amber-400 text-[10px] ml-1 font-bold">(Вы)</span>}
          </span>
        </div>
        {/* Value */}
        <span className={`text-[13px] font-bold flex-shrink-0 ${isMe ? 'text-amber-300' : 'text-amber-300/70'}`}>{value}</span>
      </motion.div>
    );
  };

  /* Tab pill */
  const Tab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
        active
          ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25'
          : 'text-white/30 hover:text-white/50'
      }`}
    >
      {label}
    </button>
  );

  /* Card wrapper */
  const Card: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    accentColor: string;
    children: React.ReactNode;
  }> = ({ icon, title, subtitle, accentColor, children }) => (
    <div className="flex-shrink-0 w-[85vw] max-w-[360px] snap-center rounded-2xl overflow-hidden relative">
      {/* Card bg */}
      <div className="absolute inset-0 bg-[#150D11]" />
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-full ${accentColor} opacity-40`} />
      {/* Content */}
      <div className="relative">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] ring-1 ring-white/[0.08] flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-[14px] leading-tight">{title}</h3>
            <p className="text-white/25 text-[11px]">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  /* Empty state */
  const Empty: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
    <div className="text-center py-8 px-4">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <p className="text-white/20 text-xs">Пока нет данных</p>
    </div>
  );

  return (
    <div className="-mx-4">
      {/* Section title */}
      <div className="px-4 mb-3 flex items-center gap-2">
        <TrophyIcon className="w-4 h-4 text-amber-400/70" />
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Лидерборд</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-2">

        {/* ── Card 1: По сумме ── */}
        <Card
          icon={<TrophyIcon className="w-4 h-4 text-amber-400" />}
          title="По сумме"
          subtitle="Кто больше потратил"
          accentColor="bg-amber-400"
        >
          <div className="px-2 pb-4 space-y-1">
            {top10Spent.length > 0 ? top10Spent.map(u => (
              <Row
                key={u.id}
                pos={u.position}
                name={u.name}
                value={`${u.totalSpent >= 1000 ? `${(u.totalSpent / 1000).toFixed(1)}k` : u.totalSpent} ₸`}
                isMe={currentUserId === u.id}
              />
            )) : (
              <Empty icon={<TrophyIcon className="w-5 h-5 text-white/10" />} />
            )}
            {currentUser && !spentVisible && (
              <>
                <div className="mx-3 my-1.5 h-px bg-white/[0.06]" />
                <Row
                  pos={currentUser.position}
                  name={currentUser.name}
                  value={`${currentUser.totalSpent >= 1000 ? `${(currentUser.totalSpent / 1000).toFixed(1)}k` : currentUser.totalSpent} ₸`}
                  isMe
                />
              </>
            )}
          </div>
        </Card>

        {/* ── Card 2: По напиткам ── */}
        <Card
          icon={<FireIcon className="w-4 h-4 text-orange-400" />}
          title="По напиткам"
          subtitle="Кто больше пьёт кофе"
          accentColor="bg-orange-400"
        >
          <div className="px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
            {DRINK_CATS.map(cat => (
              <Tab key={cat.key} active={drinkCat === cat.key} label={cat.label} onClick={() => setDrinkCat(cat.key)} />
            ))}
          </div>
          <div className="px-2 pb-4 space-y-1">
            {drinkList.length > 0 ? drinkList.slice(0, 10).map(u => (
              <Row key={u.id + drinkCat} pos={u.position} name={u.name} value={`${u.count} шт`} isMe={currentUserId === u.id} />
            )) : (
              <Empty icon={<FireIcon className="w-5 h-5 text-white/10" />} />
            )}
          </div>
        </Card>

        {/* ── Card 3: По еде ── */}
        <Card
          icon={<CakeIcon className="w-4 h-4 text-rose-400" />}
          title="По еде"
          subtitle="Кто больше ест"
          accentColor="bg-rose-400"
        >
          <div className="px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
            {FOOD_CATS.map(cat => (
              <Tab key={cat.key} active={foodCat === cat.key} label={cat.label} onClick={() => setFoodCat(cat.key)} />
            ))}
          </div>
          <div className="px-2 pb-4 space-y-1">
            {foodList.length > 0 ? foodList.slice(0, 10).map(u => (
              <Row key={u.id + foodCat} pos={u.position} name={u.name} value={`${u.count} шт`} isMe={currentUserId === u.id} />
            )) : (
              <Empty icon={<CakeIcon className="w-5 h-5 text-white/10" />} />
            )}
          </div>
        </Card>

      </div>

      {/* Scroll indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        <div className="w-5 h-1 rounded-full bg-amber-400/40" />
        <div className="w-1.5 h-1 rounded-full bg-white/15" />
        <div className="w-1.5 h-1 rounded-full bg-white/15" />
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Гость');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [currentUserLeaderboard, setCurrentUserLeaderboard] = useState<LeaderboardUser | null>(null);
  const [drinkLeaders, setDrinkLeaders] = useState<Record<string, CategoryLeaderUser[]>>({});
  const [foodLeaders, setFoodLeaders] = useState<Record<string, CategoryLeaderUser[]>>({});

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Загружаем профиль
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name || userData.displayName || 'Гость');
          setUserAvatar(userData.avatar || user.photoURL || null);
          setTotalOrders(userData.ordersCount || 0);
        }

        // Подсчитываем общую сумму потраченных денег
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const ordersSnap = await getDocs(ordersQuery);
        let spent = 0;
        ordersSnap.forEach(d => {
          const o = d.data();
          spent += (o.amount || o.totalAmount || o.total || 0);
        });
        setTotalSpent(spent);

        // Загружаем бонусы
        let userBonusBalance = 0;
        const bonusDoc = await getDoc(doc(db, 'bonuses', user.uid));
        if (bonusDoc.exists()) {
          const bonusData = bonusDoc.data();
          userBonusBalance = bonusData.balance || 0;
          setBonusBalance(userBonusBalance);
        }

        // Загружаем лидерборд — ВСЕГДА из users, потом обогащаем бонусами
        const leaderboardData: LeaderboardUser[] = [];
        let currentUserData: LeaderboardUser | null = null;

        try {
          // 1. Загружаем пользователей (без orderBy чтобы не терять документы без поля ordersCount)
          const usersQuery = query(
            collection(db, 'users'),
            limit(100)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          const userIds: string[] = [];
          const usersMap = new Map<string, { name: string; ordersCount: number }>();
          
          usersSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const name = data.name || data.displayName || 'Пользователь';
            const ordersCount = data.ordersCount || 0;
            userIds.push(docSnap.id);
            usersMap.set(docSnap.id, { name, ordersCount });
          });

          // 2. Загружаем бонусы для этих пользователей
          const bonusMap = new Map<string, number>();
          try {
            // Загружаем бонусы пачками по 10 (ограничение Firestore in-query)
            for (let i = 0; i < userIds.length; i += 10) {
              const batch = userIds.slice(i, i + 10);
              const bonusDocs = await Promise.all(
                batch.map(uid => getDoc(doc(db, 'bonuses', uid)))
              );
              bonusDocs.forEach((bDoc) => {
                if (bDoc.exists()) {
                  bonusMap.set(bDoc.id, bDoc.data().balance || 0);
                }
              });
            }
          } catch {
            // Бонусы не загрузились — продолжаем без них
          }

          // 2.5. Загружаем все заказы для подсчёта totalSpent + drink/food лидерборды
          const spentMap = new Map<string, number>();
          // catMap: { catKey -> { userId -> count } }
          const drinkCatMap = new Map<string, Map<string, number>>();
          const foodCatMap = new Map<string, Map<string, number>>();
          // aggregate totals for "all_drinks" and "all_food"
          const drinkTotalMap = new Map<string, number>();
          const foodTotalMap = new Map<string, number>();

          try {
            const allOrdersSnap = await getDocs(collection(db, 'orders'));
            allOrdersSnap.forEach(d => {
              const o = d.data();
              const uid = o.userId;
              if (uid) {
                const orderAmount = o.amount || o.totalAmount || o.total || 0;
                spentMap.set(uid, (spentMap.get(uid) || 0) + orderAmount);
                // Parse items for drink/food categories
                const items = o.items as Array<{ name?: string; quantity?: number }> | undefined;
                if (items && Array.isArray(items)) {
                  items.forEach(item => {
                    if (!item.name) return;
                    const qty = item.quantity || 1;
                    const dCat = matchDrinkCategory(item.name);
                    if (dCat) {
                      drinkTotalMap.set(uid, (drinkTotalMap.get(uid) || 0) + qty);
                      if (dCat !== 'all_drinks') {
                        if (!drinkCatMap.has(dCat)) drinkCatMap.set(dCat, new Map());
                        const m = drinkCatMap.get(dCat)!;
                        m.set(uid, (m.get(uid) || 0) + qty);
                      }
                    }
                    const fCat = matchFoodCategory(item.name);
                    if (fCat) {
                      foodTotalMap.set(uid, (foodTotalMap.get(uid) || 0) + qty);
                      if (fCat !== 'all_food') {
                        if (!foodCatMap.has(fCat)) foodCatMap.set(fCat, new Map());
                        const m = foodCatMap.get(fCat)!;
                        m.set(uid, (m.get(uid) || 0) + qty);
                      }
                    }
                  });
                }
              }
            });
          } catch {
            // Если не удалось — используем 0
          }

          // Ensure current user's spent is at least what we computed individually
          if (user.uid && spent > 0) {
            const mapSpent = spentMap.get(user.uid) || 0;
            if (spent > mapSpent) {
              spentMap.set(user.uid, spent);
            }
          }

          // 3. Также проверяем бонусы текущего юзера если его нет в списке
          if (user.uid && !bonusMap.has(user.uid)) {
            try {
              const myBonusDoc = await getDoc(doc(db, 'bonuses', user.uid));
              if (myBonusDoc.exists()) {
                bonusMap.set(user.uid, myBonusDoc.data().balance || 0);
              }
            } catch {
              // ignore
            }
          }

          // 4. Собираем лидерборд — только активные пользователи (с бонусами или заказами)
          usersMap.forEach((userData, id) => {
            const bonus = bonusMap.get(id) || 0;
            const userTotalSpent = spentMap.get(id) || 0;
            if (bonus > 0 || userData.ordersCount > 0 || userTotalSpent > 0) {
              leaderboardData.push({
                id,
                name: userData.name,
                ordersCount: userData.ordersCount,
                bonusBalance: bonus,
                totalSpent: userTotalSpent,
                position: 0
              });
            }
          });

          // Если текущий юзер не в лидерборде — добавляем обязательно
          const currentInList = leaderboardData.some(u => u.id === user.uid);
          if (!currentInList && userDoc.exists()) {
            const uData = userDoc.data();
            const bonus = bonusMap.get(user.uid) || userBonusBalance;
            const oc = uData.ordersCount || 0;
            leaderboardData.push({
              id: user.uid,
              name: uData.name || uData.displayName || 'Вы',
              ordersCount: oc,
              bonusBalance: bonus,
              totalSpent: spentMap.get(user.uid) || spent,
              position: 0
            });
          }

          // 5. Сортируем: по сумме потраченных ₸ desc → заказы desc
          leaderboardData.sort((a, b) => {
            if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
            return b.ordersCount - a.ordersCount;
          });
          leaderboardData.forEach((u, i) => { u.position = i + 1; });

          // 6. Находим текущего юзера
          currentUserData = leaderboardData.find(u => u.id === user.uid) || null;

          // 7. Строим drink-category лидерборды
          const buildCatLeaderboards = (
            catMap: Map<string, Map<string, number>>,
            totalMap: Map<string, number>,
            allKey: string,
          ): Record<string, CategoryLeaderUser[]> => {
            const result: Record<string, CategoryLeaderUser[]> = {};
            // "all" tab
            const allList: CategoryLeaderUser[] = [];
            totalMap.forEach((count, uid) => {
              allList.push({ id: uid, name: usersMap.get(uid)?.name || 'Пользователь', count, position: 0 });
            });
            allList.sort((a, b) => b.count - a.count);
            allList.forEach((u, i) => { u.position = i + 1; });
            result[allKey] = allList.slice(0, 10);
            // per-category tabs
            catMap.forEach((userMap, catKey) => {
              const list: CategoryLeaderUser[] = [];
              userMap.forEach((count, uid) => {
                list.push({ id: uid, name: usersMap.get(uid)?.name || 'Пользователь', count, position: 0 });
              });
              list.sort((a, b) => b.count - a.count);
              list.forEach((u, i) => { u.position = i + 1; });
              result[catKey] = list.slice(0, 10);
            });
            return result;
          };

          setDrinkLeaders(buildCatLeaderboards(drinkCatMap, drinkTotalMap, 'all_drinks'));
          setFoodLeaders(buildCatLeaderboards(foodCatMap, foodTotalMap, 'all_food'));

        } catch (leaderError) {
          console.error('Leaderboard load error:', leaderError);
        }
        
        setLeaders(leaderboardData);
        
        if (!currentUserData && userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserLeaderboard({
            id: user.uid,
            name: userData.name || userData.displayName || 'Вы',
            ordersCount: userData.ordersCount || 0,
            bonusBalance: userBonusBalance,
            totalSpent: spent,
            position: leaderboardData.length + 1
          });
        } else {
          setCurrentUserLeaderboard(currentUserData);
        }

      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const getGreeting = () => {
    return 'Салем';
  };

  if (isLoading) {
    return <RoyalLoader fullScreen={false} />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Фоновое изображение */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${ROYAL_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

      {/* Контент */}
      <div className="relative z-10">
        {/* Header — аватар + приветствие слева, флаг-язык справа */}
        <header className="pt-safe px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#D4AF37]/40 shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#D4AF37]/20 ring-2 ring-[#D4AF37]/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#D4AF37] text-sm font-bold">{getInitials(userName)}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-white truncate">
                {getGreeting()}, {userName}
              </h1>
            </div>
            <LangPicker />
          </motion.div>
        </header>

        <main className="space-y-5 pb-28 px-4">
          {/* Сторис */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <InstagramStoriesNew />
          </motion.section>

          {/* Карточка лояльности с термосом */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <LoyaltyCard 
              bonusBalance={bonusBalance}
              ordersToFree={7 - (totalOrders % 7)}
              totalOrders={totalOrders}
              totalSpent={totalSpent}
            />
          </motion.section>

          {/* Акции */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="-mx-4"
          >
            <PromotionBanner showAll={true} />
          </motion.section>

          {/* Лидерборд — 3 карточки по горизонтали */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LeaderboardCarousel
              leaders={leaders}
              currentUser={currentUserLeaderboard}
              drinkLeaders={drinkLeaders}
              foodLeaders={foodLeaders}
              currentUserId={auth.currentUser?.uid}
            />
          </motion.section>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
