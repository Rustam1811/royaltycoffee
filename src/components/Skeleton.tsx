import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

// Композитные скелетоны для разных страниц

export const StorySkeleton: React.FC = () => (
  <div className="flex-shrink-0 w-20 flex flex-col items-center gap-2">
    <Skeleton variant="circular" width={64} height={64} />
    <Skeleton variant="text" width={60} height={12} />
  </div>
);

export const PromotionSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm">
    <Skeleton variant="rounded" height={120} className="mb-3" />
    <Skeleton variant="text" height={20} className="mb-2" />
    <Skeleton variant="text" height={16} width="70%" />
  </div>
);

export const DrinkCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
    <Skeleton variant="rectangular" height={160} />
    <div className="p-4">
      <Skeleton variant="text" height={18} className="mb-2" />
      <Skeleton variant="text" height={16} width="60%" className="mb-3" />
      <Skeleton variant="rounded" height={40} />
    </div>
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <Skeleton variant="text" height={18} width="40%" className="mb-2" />
        <Skeleton variant="text" height={14} width="60%" />
      </div>
      <Skeleton variant="rounded" width={80} height={28} />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" height={14} width="80%" />
      <Skeleton variant="text" height={14} width="50%" />
    </div>
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="max-w-md mx-auto p-6">
    <div className="flex flex-col items-center mb-6">
      <Skeleton variant="circular" width={100} height={100} className="mb-4" />
      <Skeleton variant="text" height={24} width={150} className="mb-2" />
      <Skeleton variant="text" height={16} width={180} />
    </div>
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4">
          <Skeleton variant="text" height={18} className="mb-2" />
          <Skeleton variant="text" height={16} width="70%" />
        </div>
      ))}
    </div>
  </div>
);

export const MenuSkeleton: React.FC = () => (
  <div className="p-4">
    {/* Categories */}
    <div className="flex gap-2 mb-6 overflow-x-auto">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="rounded" width={100} height={40} className="flex-shrink-0" />
      ))}
    </div>
    {/* Items Grid */}
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <DrinkCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const HomeSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#F6F7FB] pb-24">
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="rounded" width={150} height={40} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>

      {/* Stories */}
      <div className="flex gap-4 mb-6 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <StorySkeleton key={i} />
        ))}
      </div>

      {/* Promotion Banner */}
      <PromotionSkeleton />

      {/* Favorite Drink */}
      <div className="mt-6 bg-white rounded-2xl p-4">
        <Skeleton variant="text" height={20} width={200} className="mb-3" />
        <div className="flex gap-4">
          <Skeleton variant="rounded" width={100} height={100} />
          <div className="flex-1">
            <Skeleton variant="text" height={18} className="mb-2" />
            <Skeleton variant="text" height={16} width="60%" className="mb-3" />
            <Skeleton variant="rounded" height={40} />
          </div>
        </div>
      </div>

      {/* Curated List */}
      <div className="mt-6">
        <Skeleton variant="text" height={20} width={200} className="mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
