import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  DocumentArrowDownIcon,
  QueueListIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as ClipboardIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BuildingStorefrontIcon as BuildingIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  DocumentArrowDownIcon as DocumentArrowDownIconSolid,
  QueueListIcon as QueueListIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/contexts/UserContext';
import { WorkshopRole } from '@/types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  iconActive: React.ElementType;
}

const CLIENT_NAV: NavItem[] = [
  { path: '/client/outlets', label: 'Точки', icon: BuildingStorefrontIcon, iconActive: BuildingIconSolid },
  { path: '/client/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/client/analytics', label: 'Статистика', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
  { path: '/client/settings', label: 'Ещё', icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid },
];

const ADMIN_NAV: NavItem[] = [
  { path: '/admin/dashboard', label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
  { path: '/admin/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/admin/menu', label: 'Меню', icon: QueueListIcon, iconActive: QueueListIconSolid },
  { path: '/admin/reports', label: 'Отчёты', icon: DocumentArrowDownIcon, iconActive: DocumentArrowDownIconSolid },
  { path: '/admin/clients', label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
];

const OWNER_NAV: NavItem[] = [
  { path: '/owner/dashboard', label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
  { path: '/owner/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/owner/menu', label: 'Меню', icon: QueueListIcon, iconActive: QueueListIconSolid },
  { path: '/owner/reports', label: 'Отчёты', icon: DocumentArrowDownIcon, iconActive: DocumentArrowDownIconSolid },
  { path: '/owner/clients', label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
];

function getNavItems(role: WorkshopRole): NavItem[] {
  switch (role) {
    case 'workshop_client':
      return CLIENT_NAV;
    case 'workshop_admin':
      return ADMIN_NAV;
    case 'superowner': {
      const prefix = '/owner';
      return [
        { path: `${prefix}/dashboard`, label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
        { path: `${prefix}/orders`, label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
        { path: `${prefix}/menu`, label: 'Меню', icon: QueueListIcon, iconActive: QueueListIconSolid },
        { path: `${prefix}/reports`, label: 'Отчёты', icon: DocumentArrowDownIcon, iconActive: DocumentArrowDownIconSolid },
        { path: `${prefix}/clients`, label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
      ];
    }
    case 'workshop_owner':
      return OWNER_NAV;
    default:
      return CLIENT_NAV;
  }
}

/**
 * Нижняя навигация с badge для новых заказов
 */
export const BottomNavBar: React.FC = () => {
  const { user } = useUser();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = !!user && (user.role === 'workshop_admin' || user.role === 'workshop_owner' || user.role === 'superowner');

  // Live listener for pending orders (admin/owner only)
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(
      collection(db, 'workshop_orders'),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingCount(snap.size);
    }, () => { /* ignore errors */ });
    return () => unsub();
  }, [isAdmin]);

  if (!user) return null;
  
  const navItems = getNavItems(user.role);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border-t border-slate-200 z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = isActive ? item.iconActive : item.icon;
          const showBadge = isAdmin && item.path.includes('/orders') && pendingCount > 0;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive 
                  ? 'text-[#5A0D17]' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
