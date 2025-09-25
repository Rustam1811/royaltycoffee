import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  ChartBarIcon, 
  CogIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  GiftIcon,
  TrophyIcon,
  MegaphoneIcon,
  PhotoIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { UserRole, getUserRole, getCurrentUserId } from '@/utils/userRoles';
import { pageVariants } from '@/ui/motion';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  roles: UserRole[];
}

interface ResponsiveAdminNavigationProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
}

/**
 * Конфигурация навигации для разных ролей
 */
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: HomeIcon,
    route: 'dashboard',
    roles: [UserRole.ADMIN, UserRole.BARISTA]
  },
  {
    id: 'orders',
    label: 'Заказы',
    icon: ClipboardDocumentListIcon,
    route: 'orders',
    roles: [UserRole.ADMIN, UserRole.BARISTA]
  },
  {
    id: 'pos',
    label: 'POS',
    icon: ClipboardDocumentListIcon,
    route: 'pos',
    roles: [UserRole.ADMIN, UserRole.BARISTA]
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: ChartBarIcon,
    route: 'analytics',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'menu',
    label: 'Меню',
    icon: CogIcon,
    route: 'menu',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'bonuses',
    label: 'Бонусы',
    icon: GiftIcon,
    route: 'bonuses',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'achievements',
    label: 'Достижения',
    icon: TrophyIcon,
    route: 'achievements',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'promotions',
    label: 'Акции',
    icon: MegaphoneIcon,
    route: 'promotions',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'stories',
    label: 'Истории',
    icon: PhotoIcon,
    route: 'stories',
    roles: [UserRole.ADMIN]
  },
  {
    id: 'users',
    label: 'Пользователи',
    icon: UserGroupIcon,
    route: 'users',
    roles: [UserRole.ADMIN]
  }
];

/**
 * Респонсивная навигация для админ-панели
 * - Сайдбар на десктопе
 * - Скрыта на мобильных, открывается по клику на иконку
 */
export const ResponsiveAdminNavigation: React.FC<ResponsiveAdminNavigationProps> = ({
  currentRoute,
  onRouteChange
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const currentUserId = getCurrentUserId();
  const userRole = getUserRole(currentUserId);

  // Проверяем размер экрана
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Фильтруем пункты навигации по роли пользователя
  const availableItems = NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(userRole)
  );

  const handleRouteChange = (route: string) => {
    onRouteChange(route);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // Кнопка гамбургер для мобильных
  const HamburgerButton = () => (
    <motion.button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="md:hidden fixed top-4 left-4 z-50 bg-[var(--color-bg-elev-1)] p-3 rounded-[var(--radius-m)] shadow-[var(--shadow-card)] border border-[var(--color-border)] will-change-transform"
      whileTap={{ scale: 0.95 }}
    >
      {isMobileMenuOpen ? (
        <XMarkIcon className="w-6 h-6 text-[var(--color-text-primary)]" />
      ) : (
        <Bars3Icon className="w-6 h-6 text-[var(--color-text-primary)]" />
      )}
    </motion.button>
  );

  // Элемент навигации
  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = currentRoute === item.route;
    const Icon = item.icon;

    return (
      <motion.button
        onClick={() => handleRouteChange(item.route)}
        className={`flex items-center w-full p-3 rounded-[var(--radius-m)] transition-all duration-200 will-change-transform ${
          isActive 
            ? 'bg-[var(--color-brand-amber)]/10 text-[var(--color-brand-amber)] border-r-2 border-[var(--color-brand-amber)]' 
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[var(--color-brand-amber)]' : 'text-[var(--color-text-tertiary)]'}`} />
        <span className={`font-medium ${isActive ? 'text-[var(--color-brand-amber)]' : 'text-[var(--color-text-primary)]'}`}>
          {item.label}
        </span>
        
        {isActive && (
          <motion.div
            className="ml-auto w-2 h-2 bg-[var(--color-brand-amber)] rounded-full"
            layoutId="activeIndicator"
          />
        )}
      </motion.button>
    );
  };

  // Содержимое сайдбара
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Шапка сайдбара */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Админ-панель</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • ID: {currentUserId}
        </p>
        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-2 ${
          userRole === UserRole.ADMIN 
            ? 'bg-[var(--color-brand-amber)]/10 text-[var(--color-brand-amber)]' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'}
        </div>
      </div>

      {/* Навигационные элементы */}
      <nav className="flex-1 p-4 space-y-2">
        {availableItems.map((item) => (
          <NavigationItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Футер сайдбара */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="text-xs text-[var(--color-text-tertiary)]">
          Sunfood Coffee Admin
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Кнопка гамбургер */}
      <HamburgerButton />

      {/* Десктопный сайдбар */}
      <div className="hidden md:flex h-screen w-64 bg-[var(--color-bg-elev-1)] border-r border-[var(--color-border)] fixed left-0 top-0 z-40 shadow-[var(--shadow-card)]">
        <SidebarContent />
      </div>

      {/* Мобильный сайдбар */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <>
            {/* Оверлей */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            
            {/* Мобильный сайдбар */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-[var(--color-bg-elev-1)] z-50 shadow-[var(--shadow-float)] md:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer для десктопного контента */}
      <div className="hidden md:block w-64" />
    </>
  );
};

export default ResponsiveAdminNavigation;
