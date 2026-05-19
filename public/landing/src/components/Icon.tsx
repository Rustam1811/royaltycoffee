import type { ComponentType, SVGProps } from 'react';
import clsx from 'clsx';
import {
  PlayIcon,
  ClockIcon,
  BoltIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

// Map of icon names to components
const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  play: PlayIcon,
  clock: ClockIcon,
  zap: BoltIcon,
  users: UsersIcon,
  'trending-up': ArrowTrendingUpIcon,
  award: TrophyIcon,
  headphones: ChatBubbleLeftRightIcon,
  rocket: RocketLaunchIcon,
};

type IconProps = {
  name?: keyof typeof iconMap | string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
};

export function Icon({ name, icon: IconComponent, className }: IconProps) {
  // Use name-based lookup or direct icon component
  const ResolvedIcon = name ? iconMap[name] : IconComponent;
  
  if (!ResolvedIcon) {
    console.warn(`Icon not found: ${name}`);
    return null;
  }

  return (
    <ResolvedIcon
      aria-hidden="true"
      className={clsx('h-6 w-6', className)}
    />
  );
}

