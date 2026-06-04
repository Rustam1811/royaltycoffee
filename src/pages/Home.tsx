import React, { useState, useEffect, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InstagramStoriesNew } from '../components/InstagramStoriesNew';
import { PromotionBanner } from '../components/PromotionBanner';
import { getCashbackPercent } from '../components/AchievementBadge';
import { usePersonalDiscounts } from '../hooks/usePersonalDiscounts';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../auth/AuthContext';
import { API_CONFIG } from '../services/apiConfig';
import { doc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { 
  TrophyIcon, 
  StarIcon,
  CakeIcon,
  FireIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  GiftIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/solid';

const Cup3D = lazy(() => import('../components/Cup3D'));

/** Local error boundary for 3D content */
class Cup3DErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Cup3D] 3D rendering failed:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <span className="text-2xl">☕</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LeaderboardUser {
  id: string;
  name: string;
  ordersCount: number;
  bonusBalance: number;
  totalSpent: number;
  position: number;
  avatar?: string;
}

/* ─── Language picker with text labels ─── */
const LANGS: { code: string; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'kz', label: 'KAZ' },
  { code: 'en', label: 'ENG' },
];

const LangPicker: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];
  const others = LANGS.filter(l => l.code !== i18n.language);

  const [pos, setPos] = useState({ top: 0, right: 0 });
  React.useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="relative z-10 h-10 px-3 rounded-xl bg-white/10 border border-white/15 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
      >
        <span className="text-white/80 text-xs font-bold tracking-wide">{current.label}</span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[9999] flex flex-col gap-1 bg-[#5A0D17] backdrop-blur-xl rounded-xl border border-white/15 p-1.5 shadow-xl"
                style={{ top: pos.top, right: pos.right }}
              >
                {others.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                    className="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <span className="text-white text-xs font-bold tracking-wide">{lang.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// ── SVG кольцо прогресса вокруг термоса ──
const ThermosProgressRing: React.FC<{ percent: number; size: number; stroke: number; earned: boolean }> = ({ percent, size, stroke, earned }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      {/* фоновое кольцо */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={stroke} />
      {/* прогресс */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={earned ? '#D4AF37' : '#D4AF37'}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.6, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  );
};

/* ── Bonus info bottom-sheet / modal ── */
const BonusInfoSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const levels = [
    { name: 'Бронза',     from: 'приветственный',  cashback: '3%',  color: '#CD7F32' },
    { name: 'Серебро',    from: 'от 50 напитков',  cashback: '5%',  color: '#C0C0C0' },
    { name: 'Золото',     from: 'от 80 напитков',  cashback: '8%',  color: '#D4AF37' },
    { name: 'Платина',    from: 'от 100 напитков', cashback: '10%', color: '#87CEEB' },
    { name: 'Бриллиант',  from: 'от 250 напитков', cashback: '12%', color: '#7DD3FC' },
    { name: 'VIP',        from: 'от 400 напитков', cashback: '15%', color: '#A855F7' },
  ];
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl overflow-hidden md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[440px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="bg-[#5A0D17] max-h-[85vh] overflow-y-auto">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              
              <div className="px-5 pb-24 space-y-5">
                <h2 className="text-white text-lg font-bold text-center">Как работают бонусы?</h2>

                {/* Levels */}
                <div className="space-y-2">
                  <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Уровни кешбэка</h3>
                  {levels.map((lvl) => (
                    <div key={lvl.name} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: lvl.color + '20' }}>
                        <StarIcon className="w-4 h-4" style={{ color: lvl.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-[13px] font-semibold">{lvl.name}</span>
                        <p className="text-white/40 text-[11px]">от {lvl.from}</p>
                      </div>
                      <span className="text-[#D4AF37] text-sm font-bold">{lvl.cashback}</span>
                    </div>
                  ))}
                </div>

                {/* How it works */}
                <div className="space-y-2">
                  <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Как начисляются</h3>
                  <div className="bg-white/5 rounded-xl p-3 space-y-2">
                    {[
                      { icon: <ShoppingBagIcon className="w-4 h-4 text-[#D4AF37]" />, text: 'Делайте заказы — бонусы начисляются автоматически' },
                      { icon: <CurrencyDollarIcon className="w-4 h-4 text-[#D4AF37]" />, text: 'Кешбэк зачисляется от суммы каждого заказа' },
                      { icon: <ArrowTrendingUpIcon className="w-4 h-4 text-[#D4AF37]" />, text: 'Чем больше покупок — тем выше уровень и % кешбэка' },
                      { icon: <GiftIcon className="w-4 h-4 text-[#D4AF37]" />, text: 'Бонусы можно тратить на любой заказ' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
                        <span className="text-white/70 text-[12px] leading-snug">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thermos goal */}
                <div className="space-y-2">
                  <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Приз — термос</h3>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="leading-none mt-0.5 flex-shrink-0"><TrophyIcon className="w-4 h-4 text-[#D4AF37]" /></span>
                      <span className="text-white/70 text-[12px] leading-snug">
                        Потратьте <span className="text-[#D4AF37] font-bold">70 000 ₸</span> суммарно и получите фирменный термос Royalty Coffee в подарок!
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#3D0A11] font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  Понятно
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Компонент карточки лояльности — компактный, с 3D термосом
const LoyaltyCard: React.FC<{ 
  bonusBalance: number; 
  ordersToFree: number; 
  totalOrders: number;
  totalSpent: number;
  userName: string;
}> = ({ totalOrders, totalSpent, userName }) => {
  const [showInfo, setShowInfo] = useState(false);
  // Уровни считаем по количеству напитков (totalOrders ≈ количество заказов/напитков)
  const drinks = totalOrders || 0;
  const cashback = getCashbackPercent(drinks);

  const levelThresholds = [0, 50, 80, 100, 250, 400];
  const levelNames = ['Бронза', 'Серебро', 'Золото', 'Платина', 'Бриллиант', 'VIP'];
  const levelColors = ['#CD7F32', '#C0C0C0', '#D4AF37', '#87CEEB', '#7DD3FC', '#A855F7'];
  let currentLevelIdx = 0;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (drinks >= levelThresholds[i]) { currentLevelIdx = i; break; }
  }
  const isMaxLevel = currentLevelIdx >= levelThresholds.length - 1;
  const nextThreshold = isMaxLevel ? levelThresholds[currentLevelIdx] : levelThresholds[currentLevelIdx + 1];
  const currentThreshold = levelThresholds[currentLevelIdx];
  const progressPercent = isMaxLevel ? 100 : Math.min(((drinks - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100);
  const drinksToNext = isMaxLevel ? 0 : nextThreshold - drinks;

  const THERMOS_GOAL = 70000;
  const thermosPercent = Math.min((totalSpent / THERMOS_GOAL) * 100, 100);
  const thermosEarned = totalSpent >= THERMOS_GOAL;
  const thermosRemaining = Math.max(THERMOS_GOAL - totalSpent, 0);

  const RING_SIZE = 100;
  const RING_STROKE = 3;
  
  return (
    <>
      <div
        className="relative active:scale-[0.98] transition-transform cursor-pointer"
        onClick={() => setShowInfo(true)}
      >
        {/* Контент карточки — на белом фоне */}
        <div className="relative">
          {/* Two-column layout: Level info | Thermos */}
          <div className="flex gap-4">
            
            {/* ── LEFT: Level & cashback ── */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              {/* User name */}
              <h3 className="text-[#3D0A11] text-[15px] font-bold mb-1.5 truncate">{userName.split(' ')[0]}</h3>

              {/* Level name + badge */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: levelColors[currentLevelIdx] + '20' }}
                >
                  <StarIcon className="w-3.5 h-3.5" style={{ color: levelColors[currentLevelIdx] }} />
                </div>
                <span className="text-[#3D0A11] text-[13px] font-bold">{levelNames[currentLevelIdx]}</span>
              </div>

              {/* Cashback % — hero number */}
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-[#D4AF37] text-[32px] font-extrabold leading-none">{cashback}%</span>
                <span className="text-[#3D0A11]/40 text-[11px] font-medium">кешбэк</span>
              </div>

              {/* Level progress bar */}
              {!isMaxLevel ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#3D0A11]/50 text-[10px]">До {levelNames[currentLevelIdx + 1]}</span>
                    <span className="text-[#3D0A11]/60 text-[10px] font-semibold">ещё {drinksToNext} 🥤</span>
                  </div>
                  <div className="w-full bg-[#3D0A11]/10 rounded-full h-1.5">
                    <motion.div
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: levelColors[currentLevelIdx + 1] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[#3D0A11]/25 text-[9px]">{drinks} 🥤</span>
                    <span className="text-[#3D0A11]/25 text-[9px]">{nextThreshold} 🥤</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <StarIcon className="w-3 h-3 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] text-[10px] font-bold">Макс. уровень</span>
                </div>
              )}
            </div>

            {/* ── RIGHT: Thermos with ring ── */}
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
                <ThermosProgressRing percent={thermosPercent} size={RING_SIZE} stroke={RING_STROKE} earned={thermosEarned} />
                <div
                  className="absolute overflow-hidden rounded-full"
                  style={{ inset: RING_STROKE + 2 }}
                >
                  <Cup3DErrorBoundary>
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 animate-pulse" />
                      </div>
                    }>
                      <Cup3D className="w-full h-full" />
                    </Suspense>
                  </Cup3DErrorBoundary>
                </div>
              </div>
              {/* Thermos progress text */}
              <span className="text-[#D4AF37] text-[10px] font-semibold mt-1">{Math.round(thermosPercent)}%</span>
              <span className="text-[#D4AF37]/50 text-[9px] mt-0.5 text-center leading-tight flex items-center justify-center gap-0.5">
                {thermosEarned ? <><TrophyIcon className="w-3 h-3 text-[#D4AF37]" /> Получен!</> : `ещё ${thermosRemaining.toLocaleString()} ₸`}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom-sheet with bonus info — portal to body so it's above everything */}
      {createPortal(
        <BonusInfoSheet open={showInfo} onClose={() => setShowInfo(false)} />,
        document.body
      )}
    </>
  );
};

/* ─── Drink & Food category matching ─── */
interface CategoryLeaderUser {
  id: string;
  name: string;
  count: number;
  position: number;
  avatar?: string;
}

// Маппинг categoryId → читабельное название для табов
const DRINK_CAT_LABELS: Record<string, string> = {
  coffee: 'Кофе', ice_coffee: 'Ice', lemonade: 'Лимонады', milkshake: 'Milkshake', raf_royal: 'Раф Royal',
};
const FOOD_CAT_LABELS: Record<string, string> = {
  croissants: 'Круассаны', bakery: 'Выпечка', desserts: 'Десерты', sandwiches: 'Сэндвичи',
};

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
  const [drinkCat, setDrinkCat] = useState('all_drinks');
  const [foodCat, setFoodCat] = useState('all_food');

  // Динамические табы из данных
  const drinkCatTabs = [{ key: 'all_drinks', label: 'Все' }, ...Object.keys(drinkLeaders).filter(k => k !== 'all_drinks').map(k => ({ key: k, label: DRINK_CAT_LABELS[k] || k }))];
  const foodCatTabs = [{ key: 'all_food', label: 'Все' }, ...Object.keys(foodLeaders).filter(k => k !== 'all_food').map(k => ({ key: k, label: FOOD_CAT_LABELS[k] || k }))];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const top10Spent = leaders.slice(0, 10);
  const drinkList = drinkLeaders[drinkCat] || [];
  const foodList = foodLeaders[foodCat] || [];

  const spentVisible = currentUser ? top10Spent.some(u => u.id === currentUser.id) : true;

  /* Medal config — dark text on white cards */
  const medal = (p: number) => {
    if (p === 1) return { ring: 'ring-[#D4AF37]/60', bg: 'bg-[#D4AF37]/15', text: 'text-[#D4AF37]', glow: 'shadow-[#D4AF37]/20' };
    if (p === 2) return { ring: 'ring-slate-400/40', bg: 'bg-slate-200/40', text: 'text-slate-500', glow: 'shadow-slate-300/15' };
    if (p === 3) return { ring: 'ring-amber-400/40', bg: 'bg-amber-100/40', text: 'text-amber-600', glow: 'shadow-amber-400/15' };
    return { ring: 'ring-[#3D0A11]/10', bg: 'bg-[#3D0A11]/5', text: 'text-[#3D0A11]/40', glow: '' };
  };

  /* Row component — expandable on tap, dark text on white */
  const Row: React.FC<{
    pos: number; name: string; value: string; isMe: boolean;
    uid: string;
    avatar?: string;
    extra?: { ordersCount?: number; totalSpent?: number; bonusBalance?: number; count?: number };
  }> = ({ pos, name, value, isMe, uid, avatar, extra }) => {
    const m = medal(pos);
    const isOpen = expandedId === uid;
    const toggle = () => setExpandedId(prev => prev === uid ? null : uid);

    return (
      <div
        className={`transition-transform duration-300 ease-out origin-center ${isOpen ? 'scale-[1.03]' : 'scale-100'}`}
        style={{ zIndex: isOpen ? 10 : 1, position: 'relative' }}
      >
        <button onClick={toggle} className="w-full text-left">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: pos * 0.03 }}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              isMe ? 'bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/30' : 'hover:bg-[#3D0A11]/5'
            } ${isOpen ? 'bg-[#3D0A11]/5 ring-1 ring-[#3D0A11]/10 shadow-sm' : ''}`}
          >
            {/* Position badge */}
            <div className={`w-8 h-8 rounded-lg ${m.bg} ring-1 ${m.ring} flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${pos <= 3 ? `shadow-md ${m.glow}` : ''} ${isOpen ? 'scale-110' : ''}`}>
              {pos <= 3
                ? <TrophyIcon className={`w-4 h-4 ${m.text}`} />
                : <span className="text-[11px] font-bold text-[#3D0A11]/40">{pos}</span>
              }
            </div>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#3D0A11]/10 flex-shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).classList.add('bg-[#3D0A11]/10', 'items-center', 'justify-center', 'flex'); }}
                />
              ) : (
                <div className="w-full h-full bg-[#3D0A11]/10 flex items-center justify-center">
                  <span className="text-[#3D0A11]/60 text-[11px] font-bold">{getInitials(name)}</span>
                </div>
              )}
            </div>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="text-[#3D0A11] text-[13px] font-medium truncate block leading-tight">
                {name.split(' ')[0]}
                {isMe && <span className="text-[#D4AF37] text-[10px] ml-1 font-bold">(Вы)</span>}
              </span>
            </div>
            {/* Value */}
            <span className={`text-[13px] font-bold flex-shrink-0 ${isMe ? 'text-[#D4AF37]' : 'text-[#3D0A11]/70'}`}>{value}</span>
            {/* Chevron */}
            <svg className={`w-3.5 h-3.5 text-[#3D0A11]/30 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </motion.div>
        </button>

        {/* Expandable details */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: isOpen ? '200px' : '0px',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="px-3 pb-3 pt-1">
            <div className="bg-[#3D0A11]/5 rounded-xl p-3 ring-1 ring-[#3D0A11]/10 space-y-2">
              {extra?.totalSpent != null && (
                <div className="flex justify-between items-center">
                  <span className="text-[#3D0A11]/40 text-[11px]">Потрачено</span>
                  <span className="text-[#3D0A11] text-[12px] font-semibold">{extra.totalSpent.toLocaleString()} ₸</span>
                </div>
              )}
              {extra?.ordersCount != null && (
                <div className="flex justify-between items-center">
                  <span className="text-[#3D0A11]/40 text-[11px]">Заказов</span>
                  <span className="text-[#3D0A11] text-[12px] font-semibold">{extra.ordersCount}</span>
                </div>
              )}
              {extra?.bonusBalance != null && (
                <div className="flex justify-between items-center">
                  <span className="text-[#3D0A11]/40 text-[11px]">Бонусы</span>
                  <span className="text-[#D4AF37] text-[12px] font-semibold">{extra.bonusBalance.toLocaleString()} ₸</span>
                </div>
              )}
              {extra?.count != null && (
                <div className="flex justify-between items-center">
                  <span className="text-[#3D0A11]/40 text-[11px]">Кол-во</span>
                  <span className="text-[#3D0A11] text-[12px] font-semibold">{extra.count} шт</span>
                </div>
              )}
              {extra?.ordersCount != null && extra?.totalSpent != null && extra.ordersCount > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-[#3D0A11]/5">
                  <span className="text-[#3D0A11]/40 text-[11px]">Средний чек</span>
                  <span className="text-[#3D0A11] text-[12px] font-semibold">{Math.round(extra.totalSpent / extra.ordersCount).toLocaleString()} ₸</span>
                </div>
              )}
              {/* Progress bar — how this user compares to #1 */}
              {leaders.length > 0 && extra?.totalSpent != null && (
                <div className="pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[#3D0A11]/30 text-[10px]">Доля от #1</span>
                    <span className="text-[#3D0A11]/40 text-[10px]">{Math.round((extra.totalSpent / (leaders[0]?.totalSpent || 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#3D0A11]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/60 transition-all duration-500"
                      style={{ width: `${Math.min(100, (extra.totalSpent / (leaders[0]?.totalSpent || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* Tab pill — on white card */
  const Tab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
        active
          ? 'bg-[#D4AF37]/15 text-[#D4AF37] ring-1 ring-[#D4AF37]/30'
          : 'text-[#3D0A11]/40 hover:text-[#3D0A11]/60'
      }`}
    >
      {label}
    </button>
  );

  /* Card wrapper — white card */
  const Card: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    accentColor: string;
    children: React.ReactNode;
  }> = ({ icon, title, subtitle, accentColor, children }) => (
    <div className="flex-shrink-0 w-[85vw] max-w-[360px] snap-center rounded-2xl overflow-hidden relative shadow-sm ring-1 ring-[#3D0A11]/5">
      {/* Card bg — white */}
      <div className="absolute inset-0 bg-white" />
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-full ${accentColor} opacity-40`} />
      {/* Content */}
      <div className="relative">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#3D0A11]/5 ring-1 ring-[#3D0A11]/10 flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#3D0A11] text-[14px] leading-tight">{title}</h3>
            <p className="text-[#3D0A11]/40 text-[11px]">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  /* Empty state */
  const Empty: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
    <div className="text-center py-8 px-4">
      <div className="w-10 h-10 rounded-xl bg-[#3D0A11]/5 ring-1 ring-[#3D0A11]/10 flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <p className="text-[#3D0A11]/40 text-xs">Пока нет данных</p>
    </div>
  );

  return (
    <div className="-mx-4">
      {/* Section title */}
      <div className="px-4 mb-3 flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#D4AF37]/10">
          <TrophyIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
        </span>
        <span className="text-[15px] font-bold text-[#3D0A11] tracking-wide uppercase">Лидерборд</span>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-2">

        {/* ── Card 1: По напиткам ── */}
        <Card
          icon={<FireIcon className="w-4 h-4 text-orange-400" />}
          title="По напиткам"
          subtitle="Кто больше пьёт кофе"
          accentColor="bg-orange-400"
        >
          <div className="px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
            {drinkCatTabs.map(cat => (
              <Tab key={cat.key} active={drinkCat === cat.key} label={cat.label} onClick={() => setDrinkCat(cat.key)} />
            ))}
          </div>
          <div className="px-2 pb-4 space-y-1">
            {drinkList.length > 0 ? drinkList.slice(0, 10).map(u => (
              <Row key={u.id + drinkCat} pos={u.position} name={u.name} value={`${u.count} шт`} isMe={currentUserId === u.id} uid={u.id + '_drink_' + drinkCat} avatar={u.avatar} extra={{ count: u.count }} />
            )) : (
              <Empty icon={<FireIcon className="w-5 h-5 text-gray-300" />} />
            )}
          </div>
        </Card>

        {/* ── Card 2: По еде ── */}
        <Card
          icon={<CakeIcon className="w-4 h-4 text-rose-400" />}
          title="По еде"
          subtitle="Кто больше ест"
          accentColor="bg-rose-400"
        >
          <div className="px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
            {foodCatTabs.map(cat => (
              <Tab key={cat.key} active={foodCat === cat.key} label={cat.label} onClick={() => setFoodCat(cat.key)} />
            ))}
          </div>
          <div className="px-2 pb-4 space-y-1">
            {foodList.length > 0 ? foodList.slice(0, 10).map(u => (
              <Row key={u.id + foodCat} pos={u.position} name={u.name} value={`${u.count} шт`} isMe={currentUserId === u.id} uid={u.id + '_food_' + foodCat} avatar={u.avatar} extra={{ count: u.count }} />
            )) : (
              <Empty icon={<CakeIcon className="w-5 h-5 text-gray-300" />} />
            )}
          </div>
        </Card>

        {/* ── Card 3: По сумме ── */}
        <Card
          icon={<TrophyIcon className="w-4 h-4 text-[#D4AF37]" />}
          title="По сумме"
          subtitle="Кто больше потратил"
          accentColor="bg-[#D4AF37]"
        >
          <div className="px-2 pb-4 space-y-1">
            {top10Spent.length > 0 ? top10Spent.map(u => (
              <Row
                key={u.id}
                pos={u.position}
                name={u.name}
                value={`${u.totalSpent >= 1000 ? `${(u.totalSpent / 1000).toFixed(1)}k` : u.totalSpent} ₸`}
                isMe={currentUserId === u.id}
                uid={u.id}
                avatar={u.avatar}
                extra={{ ordersCount: u.ordersCount, totalSpent: u.totalSpent, bonusBalance: u.bonusBalance }}
              />
            )) : (
              <Empty icon={<TrophyIcon className="w-5 h-5 text-gray-300" />} />
            )}
            {currentUser && !spentVisible && (
              <>
                <div className="mx-3 my-1.5 h-px bg-gray-200" />
                <Row
                  pos={currentUser.position}
                  name={currentUser.name}
                  value={`${currentUser.totalSpent >= 1000 ? `${(currentUser.totalSpent / 1000).toFixed(1)}k` : currentUser.totalSpent} ₸`}
                  isMe
                  uid={currentUser.id}
                  avatar={currentUser.avatar}
                  extra={{ ordersCount: currentUser.ordersCount, totalSpent: currentUser.totalSpent, bonusBalance: currentUser.bonusBalance }}
                />
              </>
            )}
          </div>
        </Card>

      </div>

      {/* Scroll indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        <div className="w-5 h-1 rounded-full bg-orange-400/40" />
        <div className="w-1.5 h-1 rounded-full bg-[#3D0A11]/15" />
        <div className="w-1.5 h-1 rounded-full bg-[#3D0A11]/15" />
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user: authUser } = useAuth();
  const { discounts: personalDiscounts, maxPercent: discountPercent } = usePersonalDiscounts();
  // dataReady — только профиль + бонусы (карточка кешбэка)
  const [dataReady, setDataReady] = useState(false);
  // leaderboardReady — лидерборд загружается независимо
  const [leaderboardReady, setLeaderboardReady] = useState(false);
  const [userName, setUserName] = useState(authUser?.name || authUser?.email?.split('@')[0] || 'Гость');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [currentUserLeaderboard, setCurrentUserLeaderboard] = useState<LeaderboardUser | null>(null);
  const [drinkLeaders, setDrinkLeaders] = useState<Record<string, CategoryLeaderUser[]>>({});
  const [foodLeaders, setFoodLeaders] = useState<Record<string, CategoryLeaderUser[]>>({});

  // ── Effect 1: профиль + бонусы — real-time подписки ──
  useEffect(() => {
    let unsubUser: (() => void) | undefined;
    let unsubBonus: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsubUser?.();
      unsubBonus?.();

      if (!user) {
        setDataReady(true);
        return;
      }

      // Одноразово: сумма потраченного из заказов (дорогой запрос, real-time не нужен)
      getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid)))
        .then(snap => {
          let spent = 0;
          snap.forEach(d => {
            const o = d.data();
            spent += (o.amount || o.totalAmount || o.total || 0);
          });
          setTotalSpent(spent);
        })
        .catch(() => {});

      // Real-time: имя и аватар
      unsubUser = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setUserName(d.name || user.displayName || authUser?.name || 'Гость');
            setUserAvatar(d.avatar || user.photoURL || null);
          } else {
            setUserName(user.displayName || authUser?.name || 'Гость');
            setUserAvatar(user.photoURL || null);
          }
          setDataReady(true);
        },
        () => setDataReady(true)
      );

      // Real-time: баланс бонусов + кол-во напитков → карточка обновляется сразу после заказа
      unsubBonus = onSnapshot(
        doc(db, 'bonuses', user.uid),
        (snap) => {
          if (snap.exists()) {
            const bd = snap.data();
            setBonusBalance(bd.balance || 0);
            setTotalOrders(bd.drinksCount ?? bd.ordersCount ?? 0);
          }
        },
        () => {}
      );
    });

    return () => {
      authUnsub();
      unsubUser?.();
      unsubBonus?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: лидерборд — независимо, не блокирует UI ──
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLeaderboardReady(true);
          return;
        }

        const lbRes = await fetch(`${API_CONFIG.BASE_URL}/leaderboard?limit=100&userId=${user.uid}`);
        const lbJson = await lbRes.json();
        if (!lbJson.ok) {
          setLeaderboardReady(true);
          return;
        }

        // Собираем все уникальные uid для batch-запросов аватаров и бонусов
        const leaderIds: string[] = (lbJson.leaders || []).map((u: { id: string }) => u.id);
        if (!leaderIds.includes(user.uid)) leaderIds.push(user.uid);

        const drinkFoodIds = new Set<string>();
        Object.values(lbJson.drinkLeaders || {}).forEach((list: unknown) =>
          (list as Array<{ id: string }>).forEach(u => drinkFoodIds.add(u.id))
        );
        Object.values(lbJson.foodLeaders || {}).forEach((list: unknown) =>
          (list as Array<{ id: string }>).forEach(u => drinkFoodIds.add(u.id))
        );
        const allIds = [...new Set([...leaderIds, ...drinkFoodIds])];

        // Batch-загрузка аватаров и бонусов параллельно
        const avatarMap = new Map<string, string>();
        const bonusMap = new Map<string, number>();

        const batchSize = 10;
        const batches: string[][] = [];
        for (let i = 0; i < allIds.length; i += batchSize) {
          batches.push(allIds.slice(i, i + batchSize));
        }

        await Promise.all(batches.map(async batch => {
          const [userDocs, bonusDocs] = await Promise.all([
            Promise.all(batch.map(uid => getDoc(doc(db, 'users', uid)))),
            Promise.all(batch.map(uid => getDoc(doc(db, 'bonuses', uid)))),
          ]);
          userDocs.forEach(uDoc => {
            if (uDoc.exists()) {
              const av = uDoc.data().avatar || uDoc.data().photoURL;
              if (av) avatarMap.set(uDoc.id, av);
            }
          });
          bonusDocs.forEach(bDoc => {
            if (bDoc.exists()) bonusMap.set(bDoc.id, bDoc.data().balance || 0);
          });
        }));

        // Обновляем баланс текущего юзера если он в лидерборде
        const myBonus = bonusMap.get(user.uid);
        if (myBonus !== undefined) setBonusBalance(myBonus);

        const leaderboardData: LeaderboardUser[] = (lbJson.leaders || []).map(
          (u: { id: string; name: string; ordersCount: number; totalSpent: number; position: number }) => ({
            id: u.id,
            name: u.name,
            ordersCount: u.ordersCount,
            totalSpent: u.totalSpent,
            bonusBalance: bonusMap.get(u.id) || 0,
            position: u.position,
            avatar: avatarMap.get(u.id),
          })
        );

        setLeaders(leaderboardData);

        const enrichWithAvatars = (map: Record<string, Array<{ id: string; name: string; count: number; position: number }>>) => {
          const result: Record<string, CategoryLeaderUser[]> = {};
          Object.entries(map).forEach(([key, list]) => {
            result[key] = list.map(u => ({ ...u, avatar: avatarMap.get(u.id) }));
          });
          return result;
        };
        setDrinkLeaders(enrichWithAvatars(lbJson.drinkLeaders || {}));
        setFoodLeaders(enrichWithAvatars(lbJson.foodLeaders || {}));

        if (lbJson.currentUser) {
          const cu = lbJson.currentUser;
          setCurrentUserLeaderboard({
            id: cu.id,
            name: cu.name,
            ordersCount: cu.ordersCount,
            totalSpent: cu.totalSpent,
            bonusBalance: bonusMap.get(cu.id) || 0,
            position: cu.position,
            avatar: avatarMap.get(cu.id),
          });
        } else {
          // Текущий юзер не в топе — строим данные из уже загруженного профиля
          setCurrentUserLeaderboard(prev => prev ?? {
            id: user.uid,
            name: authUser?.name || 'Вы',
            ordersCount: 0,
            bonusBalance: bonusMap.get(user.uid) || 0,
            totalSpent: 0,
            position: leaderboardData.length + 1,
            avatar: avatarMap.get(user.uid),
          });
        }
      } catch (leaderError) {
        console.error('Leaderboard load error:', leaderError);
      } finally {
        setLeaderboardReady(true);
      }
    };

    loadLeaderboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Данные загружаются после auth — скелет страницы рисуем сразу,
  // fullscreen RoyalLoader уже показан на уровне App/PrivateRoute.

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: '#F4EDE4' }}>

      {/* ═══ HERO — королевское бархатное знамя ═══ */}
      <div
        className="relative"
        style={{
          zIndex: 1,
          background: 'linear-gradient(175deg, #2D0A10 0%, #4A0E15 35%, #5C1520 55%, #4A0E15 75%, #1A0508 100%)',
        }}
      >
        {/* ═══ Velvet depth — глубокие вертикальные складки бархата ═══ */}
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 18,
          background: `
            linear-gradient(90deg,
              rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 4%, rgba(255,255,255,0.03) 7%,
              transparent 12%,
              rgba(0,0,0,0.03) 22%, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.04) 28%,
              transparent 33%,
              rgba(255,255,255,0.02) 42%, rgba(0,0,0,0.08) 47%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.06) 53%,
              transparent 58%,
              rgba(0,0,0,0.04) 68%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0.03) 76%,
              transparent 82%,
              rgba(255,255,255,0.02) 90%, rgba(0,0,0,0.08) 95%, rgba(0,0,0,0.2) 100%
            )
          `,
        }} />

        {/* ═══ Diagonal weave — текстура ткани ═══ */}
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 19,
          backgroundImage: `
            repeating-linear-gradient(135deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px),
            repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 2px)
          `,
          backgroundSize: '4px 4px',
        }} />

        {/* ═══ Warm radial glow — как свет факела ═══ */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{
          zIndex: 17,
          background: `
            radial-gradient(ellipse 60% 50% at 50% 35%, rgba(120,30,20,0.25) 0%, transparent 70%),
            radial-gradient(ellipse 80% 40% at 30% 60%, rgba(80,15,10,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 75% 25%, rgba(180,120,50,0.06) 0%, transparent 50%)
          `,
        }} />

        {/* ═══ Subtle sheen sweep — медленный блик шёлка ═══ */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 20 }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), rgba(255,255,255,0.04), rgba(255,255,255,0.025), transparent)',
            animation: 'velvetSheen 16s ease-in-out infinite',
          }} />
        </div>

        {/* ═══ Gold edge accent — тонкая золотая нить по краю ═══ */}
        <div className="absolute inset-x-0 top-0 h-[1px] pointer-events-none" style={{ zIndex: 22, background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.3) 20%, rgba(212,175,55,0.5) 50%, rgba(212,175,55,0.3) 80%, transparent 95%)' }} />

        {/* ═══ LOGO WATERMARK — еле заметная печать ═══ */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 1 }}>
          <motion.img
            src="/images/logo.png"
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 0.25, x: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute object-contain"
            style={{
              width: 320,
              height: 320,
              top: '20%',
              right: -80,
              transform: 'translateY(-50%)',
              filter: 'brightness(1.0) saturate(0)',
            }}
          />
        </div>

        <div className="relative z-10 pt-safe">

          {/* Строка 1: Аватар (слева) | ROYALTY COFFEE (центр) | LangPicker (справа) */}
          <div className="relative flex items-center justify-between px-5 pt-2 pb-0">
            {/* Слева: аватар */}
            <button
              className="w-10 h-10 rounded-full ring-2 ring-white/20 overflow-hidden flex items-center justify-center bg-white/10 active:scale-95 transition-transform"
              onClick={() => { /* navigate to profile if needed */ }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/80 text-xs font-bold">{getInitials(userName)}</span>
              )}
            </button>

            {/* По центру: ROYALTY COFFEE */}
            <motion.img
              src="/images/logo_home.png"
              alt="Royalty Coffee"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="object-contain"
              style={{ width: 'clamp(130px, 36vw, 190px)' }}
            />

            {/* Справа: LangPicker */}
            <LangPicker />
          </div>

          {/* Строка 2: QOSH KELDINIZ (под аватаркой, слева) */}
          <div className="px-5 pt-2">
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-bold text-white uppercase tracking-[0.1em] leading-none"
              style={{
                fontSize: 'clamp(0.65rem, 2.8vw, 0.85rem)',
                textShadow: '0 1px 8px rgba(0,0,0,0.4)',
              }}
            >
              QOSH KELDINIZ
            </motion.span>
          </div>

          {/* Stories */}
          <div className="px-4 pt-6 pb-1" style={{ position: 'relative', zIndex: 5 }}>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <InstagramStoriesNew />
            </motion.div>
          </div>

          <div style={{ height: 60 }} />
        </div>

        {/* ═══ Плавный переход от hero к контенту ═══ */}
        <div style={{
          height: 12,
          marginTop: -1,
          background: '#F4EDE4',
        }} />
      </div>

      {/* ═══ CONTENT — карточка ниже знамени ═══ */}
      <div className="relative px-4" style={{ zIndex: 3, marginTop: 0 }}>
        <main className="pb-28 pt-0">

          {/* Карточка лояльности (термос) */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
              {dataReady ? (
                <LoyaltyCard 
                  bonusBalance={bonusBalance}
                  ordersToFree={7 - (totalOrders % 7)}
                  totalOrders={totalOrders}
                  totalSpent={totalSpent}
                  userName={userName}
                />
              ) : (
                /* Skeleton */
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 animate-pulse" />
                      <div className="h-3.5 w-16 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-slate-50 rounded animate-pulse" />
                      <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative" style={{ width: 100, height: 100 }}>
                      <svg width={100} height={100} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={50} cy={50} r={47} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={3} />
                      </svg>
                      <div className="absolute overflow-hidden rounded-full" style={{ inset: 5 }}>
                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="h-2 w-8 bg-slate-100 rounded animate-pulse mt-1.5" />
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Персональная скидка от заведения */}
          {discountPercent > 0 && (
            <motion.section
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.14, type: 'spring', damping: 22 }}
              className="mt-4"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#A855F7] to-[#EC4899] p-4 shadow-lg shadow-purple-300/30">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-lg shadow-inner">
                    −{discountPercent}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-base leading-tight">Личная скидка</div>
                    <div className="text-white/85 text-xs mt-1 leading-snug">
                      {(personalDiscounts['*:all'] || personalDiscounts['*'])
                        ? 'Действует во всех точках сети'
                        : Object.keys(personalDiscounts).length > 1
                          ? `Активна в ${Object.keys(personalDiscounts).length} точках`
                          : 'Активна в выбранной точке'}
                      {' · '}применится при заказе через бариста
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="-mx-4 mt-5"
          >
            <PromotionBanner showAll={true} />
          </motion.section>

          {/* Лидерборд */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5"
          >
            {leaderboardReady ? (
              <LeaderboardCarousel
                leaders={leaders}
                currentUser={currentUserLeaderboard}
                drinkLeaders={drinkLeaders}
                foodLeaders={foodLeaders}
                currentUserId={auth.currentUser?.uid}
              />
            ) : (
              /* Skeleton пока данные грузятся */
              <div>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#D4AF37]/10">
                    <TrophyIcon className="w-3.5 h-3.5 text-[#D4AF37]/40" />
                  </span>
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2].map(i => (
                    <div key={i} className="flex-shrink-0 w-[85vw] max-w-[360px] rounded-2xl bg-white ring-1 ring-[#3D0A11]/5 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
                          <div className="h-2.5 w-32 bg-slate-50 rounded animate-pulse" />
                        </div>
                      </div>
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                          <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                          <div className="flex-1 h-3 bg-slate-100 rounded animate-pulse" />
                          <div className="w-10 h-3 bg-slate-50 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </main>
      </div>

    </div>
  );
};

export default HomePage;
