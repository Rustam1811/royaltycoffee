/**
 * Achievement Badge Component
 * Показывает значок уровня пользователя: бронза, серебро, золото, платина
 * Премиальный дизайн без эмодзи
 */

import React from 'react';
import { motion } from 'framer-motion';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface AchievementBadgeProps {
  ordersCount: number;
  totalSpent?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Определяем уровни по сумме потраченных денег (₸)
export const getTierBySpent = (spent: number): AchievementTier => {
  if (spent >= 25000) return 'platinum';
  if (spent >= 15000) return 'gold';
  if (spent >= 5000) return 'silver';
  return 'bronze';
};

// Обратная совместимость — алиас
export const getTierByOrders = (orders: number): AchievementTier => {
  return getTierBySpent(orders);
};

// Прогресс до следующего уровня (по сумме ₸)
export const getNextTierProgress = (spent: number): { current: number; next: number; percent: number; nextTier: AchievementTier | null } => {
  if (spent >= 25000) {
    return { current: spent, next: 25000, percent: 100, nextTier: null };
  }
  if (spent >= 15000) {
    return { current: spent, next: 25000, percent: ((spent - 15000) / 10000) * 100, nextTier: 'platinum' };
  }
  if (spent >= 5000) {
    return { current: spent, next: 15000, percent: ((spent - 5000) / 10000) * 100, nextTier: 'gold' };
  }
  return { current: spent, next: 5000, percent: (spent / 5000) * 100, nextTier: 'silver' };
};

// Кешбэк по сумме потраченных денег
export const getCashbackPercent = (spent: number): number => {
  const tier = getTierBySpent(spent);
  const cashbackMap: Record<AchievementTier, number> = {
    bronze: 5,
    silver: 10,
    gold: 15,
    platinum: 20,
  };
  return cashbackMap[tier];
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
    cashbackPercent: 5,
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
    cashbackPercent: 10,
    colors: {
      from: '#E8E8E8',
      via: '#C0C0C0',
      to: '#A8A8A8',
      border: '#D0D0D0',
      text: '#C0C0C0',
      glow: 'rgba(192, 192, 192, 0.5)',
      shine: 'rgba(255, 255, 255, 0.6)'
    },
    minSpent: 5000
  },
  gold: {
    name: 'Gold',
    nameRu: 'Золото',
    cashbackPercent: 15,
    colors: {
      from: '#FFD700',
      via: '#FFC125',
      to: '#DAA520',
      border: '#FFD700',
      text: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.6)',
      shine: 'rgba(255, 255, 200, 0.7)'
    },
    minSpent: 15000
  },
  platinum: {
    name: 'Platinum',
    nameRu: 'Платинум',
    cashbackPercent: 20,
    colors: {
      from: '#E5E4E2',
      via: '#A7D8FF',
      to: '#87CEEB',
      border: '#E5E4E2',
      text: '#E5E4E2',
      glow: 'rgba(167, 216, 255, 0.6)',
      shine: 'rgba(255, 255, 255, 0.8)'
    },
    minSpent: 25000
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
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const spent = totalSpent ?? ordersCount;
  const tier = getTierBySpent(spent);
  const config = tierConfig[tier];
  const progress = getNextTierProgress(spent);
  
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
              {spent} / {progress.next} ₸
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Компактный значок для шапки - премиальный
export const AchievementBadgeCompact: React.FC<{ ordersCount: number; totalSpent?: number; className?: string }> = ({ 
  ordersCount, 
  totalSpent,
  className = '' 
}) => {
  const spent = totalSpent ?? ordersCount;
  const tier = getTierBySpent(spent);
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
