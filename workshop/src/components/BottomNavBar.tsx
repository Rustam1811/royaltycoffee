import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ClipboardDocumentListIcon as ClipboardIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BuildingStorefrontIcon as BuildingIconSolid,
  UserGroupIcon as UserGroupIconSolid,
} from '@heroicons/react/24/solid';
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
];

const ADMIN_NAV: NavItem[] = [
  { path: '/admin/dashboard', label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
  { path: '/admin/menu', label: 'Меню', icon: BookOpenIcon, iconActive: BookOpenIconSolid },
  { path: '/admin/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/admin/clients', label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
];

const OWNER_NAV: NavItem[] = [
  { path: '/owner/dashboard', label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
  { path: '/owner/menu', label: 'Меню', icon: BookOpenIcon, iconActive: BookOpenIconSolid },
  { path: '/owner/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/owner/clients', label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
  { path: '/owner/analytics', label: 'Аналитика', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
];

function getNavItems(role: WorkshopRole): NavItem[] {
  switch (role) {
    case 'workshop_client':
      return CLIENT_NAV;
    case 'workshop_admin':
      return ADMIN_NAV;
    case 'superowner': {
      // Superowner uses /owner/ prefix (same panel as owner)
      const prefix = '/owner';
      return [
        { path: `${prefix}/dashboard`, label: 'Главная', icon: HomeIcon, iconActive: HomeIconSolid },
        { path: `${prefix}/menu`, label: 'Меню', icon: BookOpenIcon, iconActive: BookOpenIconSolid },
        { path: `${prefix}/orders`, label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
        { path: `${prefix}/clients`, label: 'Клиенты', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
        { path: `${prefix}/analytics`, label: 'Аналитика', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
      ];
    }
    case 'workshop_owner':
      return OWNER_NAV;
    default:
      return CLIENT_NAV;
  }
}

/**
 * Нижняя навигация
 */
export const BottomNavBar: React.FC = () => {
  const { user } = useUser();
  const location = useLocation();
  
  if (!user) return null;
  
  const navItems = getNavItems(user.role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = isActive ? item.iconActive : item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive 
                  ? 'text-workshop-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
