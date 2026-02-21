import React, { useState } from 'react';

export interface PremiumDrinkBadge { type:string; label:string; color?:string; }
export interface PremiumDrinkSize { key: string; label: string; volume: number; price: number; }
export interface PremiumDrinkItem {
  id: string | number;
  name: string;
  price: number;
  image: string;
  video?: string; // URL видео для модалки (формат MP4/WebM)
  badges?: PremiumDrinkBadge[];
  energy?: number; protein?: number; fat?: number; carbs?: number;
  categoryId?: string | number; // string for Firestore, number for legacy
  sizes?: PremiumDrinkSize[]; // Доступные размеры с ценами
}

// Утилита для получения webp версии изображения
const getOptimizedImage = (src: string): string => {
  if (!src) return '/images/placeholder.png';
  // Если уже webp - возвращаем как есть
  if (src.endsWith('.webp')) return src;
  // Пробуем webp версию
  return src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
};

interface Props { item: PremiumDrinkItem; onOpen: (id: string|number)=>void; index?: number; prefersReduced?: boolean; }

export const DrinkCardPremiumImpl: React.FC<Props> = ({ item, onOpen }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={() => onOpen(item.id)}
      data-fly-id={item.id}
      className="
        group relative flex flex-col
        w-full h-[240px] p-0
        bg-white/95
        rounded-[20px]
        shadow-[0_2px_8px_rgba(0,0,0,0.15)]
        hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]
        active:scale-[0.98]
        border-0
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A574] focus-visible:ring-offset-2
        overflow-hidden
        will-change-transform
      "
      style={{ contain: 'layout style paint' }}
    >
      {/* Simple badge */}
      {item.badges && item.badges.length > 0 && (
        <div className="absolute top-3 left-3 z-10">
          <div className="
            px-2 py-1
            bg-[#5C0E0E]
            text-white text-[9px] font-medium uppercase tracking-wider
            rounded-md
          ">
            {item.badges[0].label}
          </div>
        </div>
      )}

      {/* Image section - centered, large */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Product image with WebP support */}
        <img
          src={getOptimizedImage(item.image)}
          alt={item.name}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={200}
          height={200}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            // Fallback to original if webp fails
            const target = e.target as HTMLImageElement;
            if (target.src !== item.image) {
              target.src = item.image;
            }
          }}
          className={`
            w-full h-full object-contain p-2
            drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]
            transition-opacity duration-200
            ${loaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      </div>

      {/* Info section - minimal and clean */}
      <div className="flex flex-col p-3 pt-1">
        <h3 className="
            text-[13px] font-medium leading-tight
            text-[#5C0E0E]
            mb-1.5
            line-clamp-2
          "
        >
          {item.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#5C0E0E]">
            {item.price} ₸
          </span>
          
          {/* Minimal add button */}
          <div className="
            w-7 h-7 
            bg-[#5C0E0E]
            text-white
            rounded-full 
            flex items-center justify-center
            transition-all duration-200
            group-hover:scale-110
          ">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
};

export const DrinkCardPremium = React.memo(DrinkCardPremiumImpl);
