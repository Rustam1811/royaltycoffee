import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole, getUserRole, getCurrentUserId } from '@/utils/userRoles';
import { pageVariants, transitions } from '@/ui/motion';

// Импорт компонентов страниц
import Dashboard from '@/pages/Dashboard';
import OrderManagement from '@/pages/OrderManagement';
import Analytics from '@/pages/Analytics';
import MenuPageNew from '@/pages/MenuPageNew';
import BonusManagement from '@/pages/BonusManagement';
import AchievementManagement from '@/pages/AchievementManagement';
import PromotionManagement from '@/pages/PromotionManagement';
import InstagramStoriesAdminPageNew from '@/pages/InstagramStoriesAdminPageNew';

// Новая респонсивная навигация
import ResponsiveAdminNavigation from '@/components/ResponsiveAdminNavigation';

/**
 * Основной компонент админ-панели с респонсивной навигацией
 */
const ResponsiveAdminRoutes: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  
  const currentUserId = getCurrentUserId();
  const userRole = getUserRole(currentUserId);

  /**
   * Отображает текущую страницу на основе маршрута и роли пользователя
   */
  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrderManagement />;
      case 'analytics':
        return userRole === UserRole.ADMIN ? <Analytics /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'menu':
        return userRole === UserRole.ADMIN ? <MenuPageNew /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'bonuses':
        return userRole === UserRole.ADMIN ? <BonusManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'achievements':
        return userRole === UserRole.ADMIN ? <AchievementManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'promotions':
        return userRole === UserRole.ADMIN ? <PromotionManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'stories':
        return userRole === UserRole.ADMIN ? <InstagramStoriesAdminPageNew /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      case 'users':
        return userRole === UserRole.ADMIN ? <div className="p-6 text-center text-gray-500">Управление пользователями (в разработке)</div> : <div className="p-6 text-center text-gray-500">Нет доступа</div>;
      default:
        return <OrderManagement />;
    }
  };

  const pageTransition = transitions.base;

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex">
      {/* Респонсивная навигация */}
      <ResponsiveAdminNavigation 
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
      />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Шапка (только на мобильных, на десктопе информация в сайдбаре) */}
        <header className="md:hidden bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)] border-b border-[var(--color-border)] sticky top-0 z-30 ml-0">
          <div className="px-4 py-3 pl-16"> {/* pl-16 для места под кнопку гамбургер */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-family-heading)]">Админ-панель</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • ID: {currentUserId}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                userRole === UserRole.ADMIN 
                  ? 'bg-[var(--color-brand-amber)]/10 text-[var(--color-brand-amber)]' 
                  : 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
              }`}>
                {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'}
              </div>
            </div>
          </div>
        </header>

        {/* Контентная область */}
        <main className="flex-1 p-0 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants(false)}
              transition={pageTransition}
              className="h-full"
            >
              {renderCurrentPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveAdminRoutes;
