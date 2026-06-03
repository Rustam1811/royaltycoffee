import React from 'react';
import { NavLink, useLocation, useRouteMatch } from 'react-router-dom';
import { 
  Squares2X2Icon, 
  QrCodeIcon,
} from '@heroicons/react/24/solid';

/* ─── Custom icons ─── */

/**
 * home.svg из public/images — иконка «Главная».
 * SVG содержит растровые данные белого цвета, поэтому для
 * серого/золотого состояний применяем CSS-фильтры.
 */
const HomeSvgIcon: React.FC<{ className?: string; active?: boolean }> = ({ className, active }) => (
  <img
    src="/images/home.png"
    alt=""
    className={className}
    style={{
      filter: active
        ? 'brightness(0) saturate(100%) invert(72%) sepia(80%) saturate(600%) hue-rotate(5deg) brightness(90%) drop-shadow(0 0 6px rgba(184,134,11,0.55))'   // rich gold #B8860B
        : 'brightness(0) saturate(100%) invert(20%) sepia(10%) saturate(500%) hue-rotate(330deg) brightness(80%) opacity(0.4)',
    }}
  />
);

/** Иконка профиля из public/images/profile_0.png */
const ProfileSvgIcon: React.FC<{ className?: string; active?: boolean }> = ({ className, active }) => (
  <img
    src="/images/profile.png"
    alt=""
    className={className}
    style={{
      filter: active
        ? 'brightness(0) saturate(100%) invert(72%) sepia(80%) saturate(600%) hue-rotate(5deg) brightness(90%) drop-shadow(0 0 6px rgba(184,134,11,0.55))'
        : 'brightness(0) saturate(100%) invert(20%) sepia(10%) saturate(500%) hue-rotate(330deg) brightness(80%) opacity(0.4)',
    }}
  />
);

/** Иконка короны для «Кофейни» — чистый узнаваемый силуэт */
const CrownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5 16h14l1.6-8L16 11l-4-6-4 6-4.6-3L5 16Zm-1 2v2h16v-2H4Z" />
  </svg>
);

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { to: '/home', icon: HomeSvgIcon, label: 'Главная' },
  { to: '/menu', icon: Squares2X2Icon, label: 'Меню' },
  { to: '/qr', icon: QrCodeIcon, label: 'QR', isCenter: true },
  { to: '/locations', icon: CrownIcon, label: 'Кофейни' },
  { to: '/profile', icon: ProfileSvgIcon, label: 'Профиль' },
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
        className="relative flex flex-col items-center justify-center -mt-4"
      >
        <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300
          ${isActive 
            ? 'bg-[#D4AF37] shadow-[#D4AF37]/40' 
            : 'bg-[#D4AF37] hover:shadow-[#D4AF37]/30 hover:scale-105'
          }
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-[10px] mt-0.5 transition-all duration-300 ${
          isActive ? 'font-bold text-[#B8860B]' : 'font-medium text-[#3D0A11]/40'
        }`}>
          {label}
        </span>
      </NavLink>
    );
  }

  return (
    <NavLink 
      to={to} 
      className="relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-300 min-w-0 flex-1 group"
    >
      <Icon 
        className={`w-7 h-7 transition-all duration-300 ${
          isActive ? 'text-[#B8860B] drop-shadow-[0_0_6px_rgba(184,134,11,0.6)]' : 'text-[#3D0A11]/40 group-hover:text-[#3D0A11]/60'
        }`}
        active={isActive}
      />
      <span 
        className={`text-[10px] mt-0.5 transition-all duration-300 ${
          isActive ? 'font-bold text-[#B8860B]' : 'font-medium text-[#3D0A11]/40 group-hover:text-[#3D0A11]/60'
        }`}
      >
        {label}
      </span>
    </NavLink>
  );
};

export const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLogin = location.pathname === '/login';

  if (isAdminRoute || isLogin) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[440px]">
      <nav className="bg-[#F4EDE4] backdrop-blur-xl shadow-[0_-4px_30px_rgba(61,10,17,0.08)] px-4 pt-1 pb-[max(env(safe-area-inset-bottom,4px),4px)] flex justify-center border-t border-[#3D0A11]/10 w-full">
        <div className="flex justify-around gap-1 w-full max-w-md">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
};
