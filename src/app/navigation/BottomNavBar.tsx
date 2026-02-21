import React from 'react';
import { NavLink, useLocation, useRouteMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  Squares2X2Icon, 
  QrCodeIcon,
  MapPinIcon,
  UserCircleIcon 
} from '@heroicons/react/24/solid';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { to: '/home', icon: HomeIcon, label: 'Главная' },
  { to: '/menu', icon: Squares2X2Icon, label: 'Меню' },
  { to: '/qr', icon: QrCodeIcon, label: 'QR', isCenter: true },
  { to: '/locations', icon: MapPinIcon, label: 'Кофейни' },
  { to: '/profile', icon: UserCircleIcon, label: 'Профиль' },
];

// Закомментированные неиспользуемые пункты навигации:
// { to: '/order', icon: ShoppingBagIcon, label: 'Заказ' },
// { to: '/card', icon: CreditCardIcon, label: 'Карта' },

const NavItem: React.FC<NavItem> = ({ to, icon: Icon, label, isCenter }) => {
  const match = useRouteMatch({ path: to, exact: true });
  const isActive = !!match;

  // Центральная QR кнопка с особым стилем
  if (isCenter) {
    return (
      <NavLink 
        to={to} 
        className="relative flex flex-col items-center justify-center -mt-6"
      >
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300
          ${isActive 
            ? 'bg-amber-500 shadow-amber-500/50' 
            : 'bg-gradient-to-br from-amber-400 to-amber-600 hover:shadow-amber-500/50 hover:scale-105'
          }
        `}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <span className={`text-xs mt-1 transition-all duration-300 ${
          isActive ? 'font-bold text-amber-400' : 'font-medium text-amber-200/70'
        }`}>
          {label}
        </span>
      </NavLink>
    );
  }

  return (
    <NavLink 
      to={to} 
      className="relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-300 min-w-0 flex-1 group"
    >
      <Icon 
        className={`w-6 h-6 transition-all duration-300 ${
          isActive ? 'text-amber-400' : 'text-amber-200/50 group-hover:text-amber-200/80'
        }`} 
      />
      <span 
        className={`text-[11px] mt-1 transition-all duration-300 ${
          isActive ? 'font-bold text-amber-400' : 'font-medium text-amber-200/50 group-hover:text-amber-200/80'
        }`}
      >
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator"
          className="absolute top-0.5 h-1 w-8 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
    </NavLink>
  );
};

export const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLogin = location.pathname === '/login';

  if (isAdminRoute || isLogin) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-3">
      <nav className="bg-gradient-to-r from-[#4A1A2C]/95 via-[#2D0F1A]/95 to-[#4A1A2C]/95 backdrop-blur-xl rounded-[28px] shadow-[0_-4px_30px_rgba(0,0,0,0.4)] px-3 py-2.5 flex justify-center border border-amber-900/20 max-w-sm w-full">
        <div className="flex justify-around gap-1 w-full">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
};
