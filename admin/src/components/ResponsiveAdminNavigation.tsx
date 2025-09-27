import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useHistory } from 'react-router-dom';
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
import { UserContext } from '@/contexts/UserContext';
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
  
  const { user } = useContext(UserContext);
  const currentUserId = user?.uid || getCurrentUserId();
  const userRole = user?.role === 'admin' ? UserRole.ADMIN : user?.role === 'barista' ? UserRole.BARISTA : getUserRole(currentUserId);

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

  // Кнопка гамбургер для мобильных
  const HamburgerButton = () => (
    <motion.button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="md:hidden fixed top-4 left-4 z-50 bg-admin-bg-secondary p-3 rounded-lg shadow-admin-md border border-admin-border"
      whileTap={{ scale: 0.95 }}
    >
      {isMobileMenuOpen ? (
        <XMarkIcon className="w-6 h-6 text-admin-text-primary" />
      ) : (
        <Bars3Icon className="w-6 h-6 text-admin-text-primary" />
      )}
    </motion.button>
  );

  // Элемент навигации
  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = currentRoute === item.route;
    const Icon = item.icon;

    return (
      <NavLink
        to={`/admin/${item.route}`}
        className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${
          isActive 
            ? 'bg-admin-primary/10 text-admin-primary border-r-4 border-admin-primary shadow-admin' 
            : 'text-admin-text-secondary hover:bg-admin-bg-gray hover:text-admin-text-primary'
        }`}
        onClick={() => {
          if (isMobile) {
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-admin-primary' : 'text-admin-text-muted'}`} />
        <span className={`font-medium ${isActive ? 'text-admin-primary' : 'text-admin-text-primary'}`}>
          {item.label}
        </span>
        
        {isActive && (
          <motion.div
            className="ml-auto w-2 h-2 bg-admin-primary rounded-full"
            layoutId="activeIndicator"
          />
        )}
      </NavLink>
    );
  };

  // Содержимое сайдбара
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Шапка сайдбара */}
      <div className="p-6 border-b border-admin-border bg-gradient-to-r from-admin-primary to-admin-secondary">
        <h2 className="text-xl font-bold text-admin-text-white">Админ-панель</h2>
        <p className="text-sm text-admin-text-white/80 mt-1">
          {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • ID: {currentUserId}
        </p>
        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-2 ${
          userRole === UserRole.ADMIN 
            ? 'bg-admin-warning/20 text-admin-warning border border-admin-warning/30' 
            : 'bg-admin-info/20 text-admin-info border border-admin-info/30'
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
      <div className="p-4 border-t border-admin-border bg-admin-bg-gray">
        <div className="text-xs text-admin-text-muted font-medium">
          ☕ Sunfood Coffee Admin
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Кнопка гамбургер */}
      <HamburgerButton />

      {/* Десктопный сайдбар */}
      <div className="hidden md:flex h-screen w-64 bg-admin-bg-secondary border-r border-admin-border fixed left-0 top-0 z-40 shadow-admin-lg">
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
              className="fixed left-0 top-0 h-full w-80 bg-admin-bg-secondary z-50 shadow-admin-lg md:hidden"
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
