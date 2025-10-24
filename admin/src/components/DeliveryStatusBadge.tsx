/**
 * Delivery Status Badge Component
 * 
 * Reusable status badge with colors and icons
 * Clean, semantic component following design system
 */

import React from 'react';

export type DeliveryStatus = 
  | 'pending' | 'preparing' | 'ready' | 'assigned' 
  | 'picked_up' | 'on_the_way' | 'nearby' | 'delivered' | 'cancelled';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Принят',
  preparing: 'Готовится',
  ready: 'Готов',
  assigned: 'Назначен',
  picked_up: 'Забран',
  on_the_way: 'В пути',
  nearby: 'Рядом',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
};

const STATUS_ICONS: Record<DeliveryStatus, string> = {
  pending: '⏳',
  preparing: '👨‍🍳',
  ready: '✅',
  assigned: '🚗',
  picked_up: '📦',
  on_the_way: '🚚',
  nearby: '📍',
  delivered: '🎉',
  cancelled: '❌',
};

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  preparing: 'bg-blue-100 text-blue-800 border-blue-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  assigned: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  picked_up: 'bg-purple-100 text-purple-800 border-purple-300',
  on_the_way: 'bg-orange-100 text-orange-800 border-orange-300',
  nearby: 'bg-pink-100 text-pink-800 border-pink-300',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold border
        ${STATUS_COLORS[status]} ${SIZE_CLASSES[size]}
      `}
    >
      {showIcon && <span>{STATUS_ICONS[status]}</span>}
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
};

export default DeliveryStatusBadge;
