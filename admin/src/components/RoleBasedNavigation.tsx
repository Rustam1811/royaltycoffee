/**
 * Role-Based Navigation Component
 * Навигация с учётом роли пользователя
 */

import React, { useState, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  MapPinIcon,
  ChartBarIcon,
  Squares2X2Icon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  GiftIcon,
  TrophyIcon,
  TagIcon,
  PhotoIcon,
  CreditCardIcon,
  TruckIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  DocumentIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { Role, UserContext } from '@/contexts/UserContext';
import { ROLE_PERMISSIONS, PAGE_LABELS, buildPath } from '@/config/rbac';

// Маппинг иконок
const ICONS: Record<string, React.FC<{ className?: string }>> = {
  'dashboard': HomeIcon,
  'locations': MapPinIcon,
  'analytics': ChartBarIcon,
  'menu': Squares2X2Icon,
  'menu-editor': PencilSquareIcon,
  'orders': ClipboardDocumentListIcon,
  'users': UsersIcon,
  'bonuses': GiftIcon,
  'achievements': TrophyIcon,
  'promotions': TagIcon,
  'stories': PhotoIcon,
  'pos': CreditCardIcon,
  'delivery': TruckIcon,
  'couriers': UserGroupIcon,
  'settings': Cog6ToothIcon,
  'courier-dashboard': TruckIcon,
  'courier-documents': DocumentIcon,
  'workshop': BuildingOffice2Icon,
  'staff': UserGroupIcon,
  'iiko-settings': BuildingStorefrontIcon,
};

interface RoleBasedNavigationProps {
  role: Role;
  locationId?: string;
  currentPage: string;
}

const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  role,
  locationId,
  currentPage
}) => {
  const history = useHistory();
  const { user, logout } = useContext(UserContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pages = ROLE_PERMISSIONS[role] || [];

  const handleNavigate = (page: string) => {
    const path = buildPath(role, page, locationId);
    history.push(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    history.push('/admin/login');
  };

  const getRoleLabel = (r: Role): string => {
    switch(r) {
      case 'superowner': return '👑 Супервладелец';
      case 'owner': return '🏪 Владелец';
      case 'admin': return '👔 Администратор';
      case 'barista': return '☕ Бариста';
      case 'courier': return '🛵 Курьер';
      default: return 'Пользователь';
    }
  };

  const getRoleBgClass = (r: Role): string => {
    switch(r) {
      case 'superowner': return 'bg-gradient-to-br from-purple-600 to-purple-800';
      case 'owner': return 'bg-gradient-to-br from-amber-500 to-amber-700';
      case 'admin': return 'bg-gradient-to-br from-blue-500 to-blue-700';
      case 'barista': return 'bg-gradient-to-br from-emerald-500 to-emerald-700';
      case 'courier': return 'bg-gradient-to-br from-orange-500 to-orange-700';
      default: return 'bg-slate-600';
    }
  };

  const NavContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <>
      {/* Header */}
      <div className={`${getRoleBgClass(role)} text-white ${isCollapsed ? 'p-2 flex items-center justify-center' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold">
            {role === 'superowner' ? '👑' : role === 'owner' ? '🏪' : role === 'admin' ? '👔' : role === 'barista' ? '☕' : '🛵'}
          </div>
        ) : (
          <>
            <div className="font-bold text-lg">{getRoleLabel(role)}</div>
            <div className="text-sm opacity-80 truncate">{user?.email}</div>
            {locationId && (
              <div className="mt-2 px-2 py-1 bg-white/20 rounded text-xs">
                📍 {locationId}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Items */}
      <nav className={`flex-1 ${isCollapsed ? 'p-1' : 'p-2'} space-y-1 overflow-y-auto`}>
        {pages.map((page) => {
          const Icon = ICONS[page] || HomeIcon;
          const isActive = currentPage === page;

          return (
            <button
              key={page}
              onClick={() => handleNavigate(page)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-amber-100 text-amber-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={isCollapsed ? (PAGE_LABELS[page] || page) : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{PAGE_LABELS[page] || page}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-xl text-red-600 hover:bg-red-50 transition-colors`}
          title={isCollapsed ? 'Выйти' : undefined}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Выйти</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — collapsible */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 flex-shrink-0 overflow-hidden"
        style={{ minWidth: collapsed ? 64 : 256 }}
      >
        <NavContent isCollapsed={collapsed} />
        {/* Toggle collapse */}
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all`}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            <ChevronLeftIcon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-sm font-medium">Свернуть</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <Bars3Icon className="w-6 h-6 text-slate-700" />
        </button>
        <div className={`px-3 py-1 rounded-full text-white text-xs font-medium ${getRoleBgClass(role)}`}>
          {getRoleLabel(role)}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/50"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col"
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-6 h-6 text-slate-500" />
              </button>

              <NavContent isCollapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoleBasedNavigation;
