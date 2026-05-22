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
  imgSrc?: string; // custom image override (e.g. profile.svg)
}

const CLIENT_NAV: NavItem[] = [
  { path: '/client/outlets', label: 'Точки', icon: BuildingStorefrontIcon, iconActive: BuildingIconSolid },
  { path: '/client/orders', label: 'Заказы', icon: ClipboardDocumentListIcon, iconActive: ClipboardIconSolid },
  { path: '/client/analytics', label: 'Статистика', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
  { path: '/client/settings', label: 'Профиль', icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid, imgSrc: '/images/profile.svg' },
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
    <nav style={{ display: 'flex', flexShrink: 0, borderTop: '1px solid #e2e8f0', background: '#fff', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '64px', width: '100%' }}>
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = isActive ? item.iconActive : item.icon;
          const showBadge = isAdmin && item.path.includes('/orders') && pendingCount > 0;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flex: 1, height: '100%', textDecoration: 'none',
                color: isActive ? '#5A0D17' : '#94a3b8'
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.imgSrc ? (
                    <img
                      src={item.imgSrc}
                      alt={item.label}
                      style={{
                        width: 26,
                        height: 26,
                        display: 'block',
                        objectFit: 'contain',
                        opacity: isActive ? 1 : 0.45,
                        filter: isActive
                          ? 'sepia(1) saturate(4) hue-rotate(310deg) brightness(0.55)'
                          : 'none',
                        transition: 'opacity 0.2s, filter 0.2s',
                      }}
                    />
                  ) : (
                    <Icon style={{ width: 24, height: 24, display: 'block', minWidth: 24, minHeight: 24 }} />
                  )}
                </div>
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-10px',
                    minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: '9999px', padding: '0 4px'
                  }}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', marginTop: '4px', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
