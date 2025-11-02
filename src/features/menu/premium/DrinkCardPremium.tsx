import React, { useState } from 'react';

export interface PremiumDrinkBadge { type:string; label:string; color?:string; }
export interface PremiumDrinkItem {
  id: string | number;
  name: string;
  price: number;
  image: string;
  badges?: PremiumDrinkBadge[];
  energy?: number; protein?: number; fat?: number; carbs?: number;
  categoryId?: number; // added for category filtering
}

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
        bg-white
        rounded-[20px]
        shadow-[0_1px_3px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]
        active:scale-[0.98]
        border-0
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
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
            bg-black
            text-white text-[9px] font-medium uppercase tracking-wider
            rounded-md
          ">
            {item.badges[0].label}
          </div>
        </div>
      )}

      {/* Image section - clean and spacious */}
      <div className="relative flex-1 flex items-center justify-center p-3">
        <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
          {/* Product image - NO layout animations, fixed aspect ratio */}
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={320}
            height={400}
            onLoad={() => setLoaded(true)}
            style={{ aspectRatio: '3/4', willChange: 'auto' }}
            className={`
              w-full h-full object-cover
              drop-shadow-sm
              transition-opacity duration-200
              ${loaded ? 'opacity-100' : 'opacity-0'}
            `}
          />
        </div>
      </div>

      {/* Info section - minimal and clean */}
      <div className="flex flex-col p-3 pt-1">
        <h3 className="
            text-[13px] font-medium leading-tight
            text-black
            mb-1.5
            line-clamp-2
          "
        >
          {item.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-black">
            {item.price} ₸
          </span>
          
          {/* Minimal add button */}
          <div className="
            w-7 h-7 
            bg-black
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
