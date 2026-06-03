/**
 * Achievement Badge Component
 * Показывает значок уровня пользователя: бронза, серебро, золото, платина
 * Премиальный дизайн без эмодзи
 */

import React from 'react';
import { motion } from 'framer-motion';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip';

interface AchievementBadgeProps {
  ordersCount: number;
  totalSpent?: number;
  /** Количество выпитых напитков (опционально, используется для новой шкалы уровней) */
  drinksCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Новая шкала уровней — по количеству заказанных напитков.
 *   3%  — Бронза (приветственный, сразу)
 *   5%  — Серебро (от 50 напитков)
 *   8%  — Золото (от 80)
 *   10% — Платина (от 100)
 *   12% — Бриллиант (от 250)
 *   15% — VIP (от 400)
 */
const TIER_THRESHOLDS: Array<{ tier: AchievementTier; minDrinks: number; cashback: number }> = [
  { tier: 'bronze',   minDrinks: 0,   cashback: 3 },
  { tier: 'silver',   minDrinks: 50,  cashback: 5 },
  { tier: 'gold',     minDrinks: 80,  cashback: 8 },
  { tier: 'platinum', minDrinks: 100, cashback: 10 },
  { tier: 'diamond',  minDrinks: 250, cashback: 12 },
  { tier: 'vip',      minDrinks: 400, cashback: 15 },
];

export const getTierByDrinks = (drinks: number): AchievementTier => {
  let result: AchievementTier = 'bronze';
  for (const t of TIER_THRESHOLDS) {
    if (drinks >= t.minDrinks) result = t.tier;
  }
  return result;
};

export const getCashbackByDrinks = (drinks: number): number => {
  const tier = getTierByDrinks(drinks);
  return TIER_THRESHOLDS.find(t => t.tier === tier)?.cashback ?? 3;
};

export const getNextTierByDrinks = (drinks: number): { current: number; next: number; percent: number; nextTier: AchievementTier | null } => {
  const currentIdx = TIER_THRESHOLDS.findIndex(t => t.tier === getTierByDrinks(drinks));
  const current = TIER_THRESHOLDS[currentIdx];
  const next = TIER_THRESHOLDS[currentIdx + 1];
  if (!next) {
    return { current: drinks, next: current.minDrinks, percent: 100, nextTier: null };
  }
  const span = next.minDrinks - current.minDrinks;
  const progressed = drinks - current.minDrinks;
  return {
    current: drinks,
    next: next.minDrinks,
    percent: span > 0 ? Math.min(100, (progressed / span) * 100) : 100,
    nextTier: next.tier,
  };
};

// ─── Обратная совместимость со старым API (spent в ₸) ───
// Старый код в нескольких местах ещё дёргает getTierBySpent / getCashbackPercent.
// Переопределяем их через шкалу напитков (1 напиток ≈ 1000 ₸) чтобы не ломать билд.
export const getTierBySpent = (spent: number): AchievementTier => getTierByDrinks(Math.floor(spent / 1000));
export const getTierByOrders = (orders: number): AchievementTier => getTierByDrinks(orders);
export const getNextTierProgress = (spent: number) => {
  const p = getNextTierByDrinks(Math.floor(spent / 1000));
  return { current: spent, next: p.next * 1000, percent: p.percent, nextTier: p.nextTier };
};
export const getCashbackPercent = (spentOrDrinks: number): number => {
  // если значение похоже на сумму (>1000) — конвертируем
  const drinks = spentOrDrinks > 1000 ? Math.floor(spentOrDrinks / 1000) : spentOrDrinks;
  return getCashbackByDrinks(drinks);
};

// Маппинг уровень → русское имя (для обратной совместимости)
export const getTierNameRu = (tier: AchievementTier): string => tierConfig[tier].nameRu;

// Конфигурация уровней - премиальный дизайн
const tierConfig: Record<AchievementTier, {
  name: string;
  nameRu: string;
  cashbackPercent: number;
  colors: { 
    from: string; 
    via: string;
    to: string; 
    border: string; 
    text: string; 
    glow: string;
    shine: string;
  };
  minSpent: number;
}> = {
  bronze: {
    name: 'Bronze',
    nameRu: 'Бронза',
    cashbackPercent: 3,
    colors: {
      from: '#CD7F32',
      via: '#B8860B',
      to: '#8B4513',
      border: '#CD7F32',
      text: '#CD7F32',
      glow: 'rgba(205, 127, 50, 0.5)',
      shine: 'rgba(255, 200, 150, 0.4)'
    },
    minSpent: 0
  },
  silver: {
    name: 'Silver', 
    nameRu: 'Серебро',
    cashbackPercent: 5,
    colors: {
      from: '#E8E8E8',
      via: '#C0C0C0',
      to: '#A8A8A8',
      border: '#D0D0D0',
      text: '#C0C0C0',
      glow: 'rgba(192, 192, 192, 0.5)',
      shine: 'rgba(255, 255, 255, 0.6)'
    },
    minSpent: 50
  },
  gold: {
    name: 'Gold',
    nameRu: 'Золото',
    cashbackPercent: 8,
    colors: {
      from: '#FFD700',
      via: '#FFC125',
      to: '#DAA520',
      border: '#FFD700',
      text: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.6)',
      shine: 'rgba(255, 255, 200, 0.7)'
    },
    minSpent: 80
  },
  platinum: {
    name: 'Platinum',
    nameRu: 'Платина',
    cashbackPercent: 10,
    colors: {
      from: '#E5E4E2',
      via: '#A7D8FF',
      to: '#87CEEB',
      border: '#E5E4E2',
      text: '#E5E4E2',
      glow: 'rgba(167, 216, 255, 0.6)',
      shine: 'rgba(255, 255, 255, 0.8)'
    },
    minSpent: 100
  },
  diamond: {
    name: 'Diamond',
    nameRu: 'Бриллиант',
    cashbackPercent: 12,
    colors: {
      from: '#B9F2FF',
      via: '#7DD3FC',
      to: '#38BDF8',
      border: '#B9F2FF',
      text: '#B9F2FF',
      glow: 'rgba(125, 211, 252, 0.7)',
      shine: 'rgba(255, 255, 255, 0.9)'
    },
    minSpent: 250
  },
  vip: {
    name: 'VIP',
    nameRu: 'VIP',
    cashbackPercent: 15,
    colors: {
      from: '#7C3AED',
      via: '#A855F7',
      to: '#D946EF',
      border: '#A855F7',
      text: '#D8B4FE',
      glow: 'rgba(168, 85, 247, 0.7)',
      shine: 'rgba(255, 255, 255, 0.85)'
    },
    minSpent: 400
  }
};

// SVG иконка короны для премиум эффекта
const CrownIcon: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M2.5 18.5L4 9L8 13L12 5L16 13L20 9L21.5 18.5H2.5Z" 
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="5" r="1.5" fill={color} />
    <circle cx="4" cy="9" r="1.5" fill={color} />
    <circle cx="20" cy="9" r="1.5" fill={color} />
  </svg>
);

// SVG иконка звезды
const StarIcon: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
  <svg className={className} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

// SVG иконка бриллианта для платины
const DiamondIcon: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L2 9L12 22L22 9L12 2Z" 
      fill={color}
      stroke={color}
      strokeWidth="1"
    />
    <path 
      d="M2 9H22M12 2L8 9L12 22L16 9L12 2Z" 
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1"
    />
  </svg>
);

// Получить иконку по уровню
const getTierIcon = (tier: AchievementTier, color: string, size: string) => {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-10 h-10';
  
  switch (tier) {
    case 'vip':
      return <CrownIcon className={sizeClass} color={color} />;
    case 'diamond':
      return <DiamondIcon className={sizeClass} color={color} />;
    case 'platinum':
      return <DiamondIcon className={sizeClass} color={color} />;
    case 'gold':
      return <CrownIcon className={sizeClass} color={color} />;
    default:
      return <StarIcon className={sizeClass} color={color} />;
  }
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  ordersCount,
  totalSpent,
  drinksCount,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  // Приоритет: drinksCount → ordersCount → totalSpent (как fallback)
  const drinks = drinksCount ?? ordersCount ?? (totalSpent ? Math.floor(totalSpent / 1000) : 0);
  const tier = getTierByDrinks(drinks);
  const config = tierConfig[tier];
  const progress = getNextTierByDrinks(drinks);
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const labelSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {/* Основной градиентный фон */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${config.colors.from} 0%, ${config.colors.via} 50%, ${config.colors.to} 100%)`,
            boxShadow: `0 4px 20px ${config.colors.glow}, inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
          }}
        />
        
        {/* Премиальный блеск сверху */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(180deg, ${config.colors.shine} 0%, transparent 40%, transparent 100%)`
          }}
        />
        
        {/* Внутренняя рамка */}
        <div 
          className="absolute inset-1 rounded-full"
          style={{
            border: `1px solid rgba(255,255,255,0.2)`,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}
        />
        
        {/* Иконка */}
        <div className="relative z-10 flex items-center justify-center">
          {getTierIcon(tier, 'rgba(0,0,0,0.3)', size)}
          <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'translate(-1px, -1px)' }}>
            {getTierIcon(tier, 'white', size)}
          </div>
        </div>
        
        {/* Прогресс кольцо */}
        {progress.nextTier && (
          <svg 
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progress.percent * 3.02} 302`}
              className="transition-all duration-500"
            />
          </svg>
        )}
        
        {/* Статичный блик */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div 
            className="absolute w-full h-1/2 -top-1/4 -left-1/4 rotate-45 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              width: '200%'
            }}
          />
        </div>
      </motion.div>
      
      {showLabel && (
        <div className="text-center">
          <div 
            className={`font-bold uppercase tracking-wider ${labelSizes[size]}`}
            style={{ 
              color: config.colors.text,
              textShadow: `0 0 10px ${config.colors.glow}`
            }}
          >
            {config.nameRu}
          </div>
          {progress.nextTier && (
            <div className="text-gray-400 text-[10px] mt-0.5">
              {drinks} / {progress.next} 🥤
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Компактный значок для шапки - премиальный
export const AchievementBadgeCompact: React.FC<{ ordersCount: number; totalSpent?: number; drinksCount?: number; className?: string }> = ({ 
  ordersCount, 
  totalSpent,
  drinksCount,
  className = '' 
}) => {
  const drinks = drinksCount ?? ordersCount ?? (totalSpent ? Math.floor(totalSpent / 1000) : 0);
  const tier = getTierByDrinks(drinks);
  const config = tierConfig[tier];
  
  return (
    <motion.div 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${className}`}
      style={{
        background: `linear-gradient(135deg, ${config.colors.from}30, ${config.colors.to}30)`,
        border: `1px solid ${config.colors.border}60`,
        boxShadow: `0 2px 8px ${config.colors.glow}`
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      {/* Мини иконка */}
      <div className="relative w-4 h-4">
        {getTierIcon(tier, config.colors.text, 'sm')}
      </div>
      <span 
        className="text-xs font-bold uppercase tracking-wide"
        style={{ 
          color: config.colors.text,
          textShadow: `0 0 6px ${config.colors.glow}`
        }}
      >
        {config.nameRu}
      </span>
    </motion.div>
  );
};

// Экспортируем конфиг для использования в других местах
export { tierConfig };
