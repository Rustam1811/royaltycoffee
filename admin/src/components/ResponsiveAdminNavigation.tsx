import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
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
  XMarkIcon,
  SparklesIcon,
  TruckIcon,
  MapPinIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { UserContext, type Role } from '@/contexts/UserContext';
import { LocationSelector } from './LocationSelector';


interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  roles: Role[];
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
    roles: ['admin', 'barista', 'owner']
  },
  {
    id: 'locations',
    label: 'Точки',
    icon: MapPinIcon,
    route: 'locations',
    roles: ['owner']
  },
  {
    id: 'courier-dashboard',
    label: 'Мои доставки',
    icon: TruckIcon,
    route: 'courier-dashboard',
    roles: ['courier']
  },
  {
    id: 'courier-documents',
    label: 'Мои документы',
    icon: DocumentTextIcon,
    route: 'courier-documents',
    roles: ['courier']
  },
  {
    id: 'orders',
    label: 'Заказы',
    icon: ClipboardDocumentListIcon,
    route: 'orders',
    roles: ['admin', 'barista', 'courier', 'owner']
  },
  {
    id: 'pos',
    label: 'POS',
    icon: ClipboardDocumentListIcon,
    route: 'pos',
    roles: ['admin', 'barista', 'owner']
  },
  {
    id: 'menu',
    label: 'Меню',
    icon: CogIcon,
    route: 'menu',
    roles: ['admin', 'barista', 'owner']
  },
  {
    id: 'menu-editor',
    label: 'Редактор меню',
    icon: SparklesIcon,
    route: 'menu-editor',
    roles: ['admin', 'owner']
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: ChartBarIcon,
    route: 'analytics',
    roles: ['admin', 'owner']
  },
  {
    id: 'bonuses',
    label: 'Бонусы',
    icon: GiftIcon,
    route: 'bonuses',
    roles: ['admin', 'owner']
  },
  {
    id: 'achievements',
    label: 'Достижения',
    icon: TrophyIcon,
    route: 'achievements',
    roles: ['admin', 'owner']
  },
  {
    id: 'promotions',
    label: 'Акции',
    icon: MegaphoneIcon,
    route: 'promotions',
    roles: ['admin', 'owner']
  },
  {
    id: 'stories',
    label: 'Истории',
    icon: PhotoIcon,
    route: 'stories',
    roles: ['admin', 'owner']
  },
  {
    id: 'users',
    label: 'Пользователи',
    icon: UserGroupIcon,
    route: 'users',
    roles: ['admin', 'owner']
  },
  {
    id: 'delivery',
    label: 'Доставка',
    icon: TruckIcon,
    route: 'delivery',
    roles: ['admin', 'owner']
  },
  {
    id: 'couriers',
    label: 'Курьеры',
    icon: MapPinIcon,
    route: 'couriers',
    roles: ['admin', 'owner']
  },
  {
    id: 'workshop',
    label: 'Цех',
    icon: BuildingOffice2Icon,
    route: 'workshop',
    roles: ['superowner']
  }
];

/**
 * Респонсивная навигация для админ-панели
 * - Сайдбар на десктопе
 * - Скрыта на мобильных, открывается по клику на иконку
 */
export const ResponsiveAdminNavigation: React.FC<ResponsiveAdminNavigationProps> = ({
  currentRoute
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  const { user } = useContext(UserContext);
  const userRole: Role = user?.role || 'user';

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
  // superowner имеет доступ ко всему, что имеет owner, плюс дополнительные пункты
  const availableItems = NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(userRole) || (userRole === 'superowner' && item.roles.includes('owner'))
  );

  // Кнопка гамбургер для мобильных
  const HamburgerButton = () => (
    <motion.button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="md:hidden fixed top-4 left-4 z-50 bg-white p-3 rounded-lg shadow-lg border border-slate-200"
      whileTap={{ scale: 0.95 }}
    >
      {isMobileMenuOpen ? (
        <XMarkIcon className="w-6 h-6 text-slate-900" />
      ) : (
        <Bars3Icon className="w-6 h-6 text-slate-900" />
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
        className={`group flex items-center w-full rounded-lg transition-all duration-200 ${
          collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
        } ${
          isActive 
            ? 'bg-slate-900 text-white shadow-md' 
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        onClick={() => {
          if (isMobile) {
            setIsMobileMenuOpen(false);
          }
        }}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
          collapsed ? '' : 'mr-3'
        } ${
          isActive ? 'text-white' : 'text-slate-500'
        }`} />
        {!collapsed && (
          <>
            <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="ml-auto w-2 h-2 bg-white rounded-full flex-shrink-0" />
            )}
          </>
        )}
      </NavLink>
    );
  };

  // Содержимое сайдбара
  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="h-full flex flex-col bg-white">
      {/* Шапка сайдбара */}
      <div className={`border-b border-slate-200 ${isCollapsed ? 'p-3' : 'p-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-4`}>
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-slate-900">Админ-панель</h2>
              <p className="text-xs text-slate-500">Sunfood Coffee</p>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <>
            <div className="mb-4">
              <LocationSelector />
            </div>
            
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              userRole === 'admin' 
                ? 'bg-slate-100 text-slate-900 border border-slate-200' 
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
              {userRole === 'admin' ? '👑 Администратор' : userRole === 'owner' ? '👑 Владелец' : userRole === 'courier' ? '🚚 Курьер' : '☕ Бариста'}
            </div>
          </>
        )}
      </div>

      {/* Навигационные элементы */}
      <nav className={`flex-1 space-y-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {availableItems.map((item) => (
          <NavigationItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Toggle кнопка — внизу сайдбара */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className={`flex items-center w-full rounded-lg py-3 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all ${
            isCollapsed ? 'justify-center px-2' : 'px-4'
          }`}
          title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          <ChevronLeftIcon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
            isCollapsed ? 'rotate-180' : ''
          } ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && (
            <span className="text-sm font-medium">Свернуть</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Кнопка гамбургер (только мобильные) */}
      <HamburgerButton />

      {/* ══════ Десктопный сайдбар — всегда виден, collapsed = только иконки ══════ */}
      {!isMobile && (
        <motion.div
          animate={{ width: collapsed ? 64 : 256 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="flex-shrink-0 h-full bg-white border-r border-slate-200 shadow-sm overflow-hidden"
          style={{ minWidth: collapsed ? 64 : 256 }}
        >
          <div className={`${collapsed ? 'w-16' : 'w-64'} h-full flex-shrink-0`}>
            <SidebarContent isCollapsed={collapsed} />
          </div>
        </motion.div>
      )}

      {/* ══════ Мобильный сайдбар — overlay ══════ */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-xl md:hidden"
            >
              <SidebarContent isCollapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ResponsiveAdminNavigation;
