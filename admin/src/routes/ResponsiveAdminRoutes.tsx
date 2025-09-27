import React, { useContext } from 'react';
import { Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole, getUserRole, getCurrentUserId } from '@/utils/userRoles';
import { UserContext } from '@/contexts/UserContext';
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
import PosPage from '@/pages/PosPage';

// Новая респонсивная навигация
import ResponsiveAdminNavigation from '@/components/ResponsiveAdminNavigation';

/**
 * Основной компонент админ-панели с респонсивной навигацией
 */
const ResponsiveAdminRoutes: React.FC = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);
  const currentUserId = user?.uid || getCurrentUserId();
  const userRole = user?.role === 'admin' ? UserRole.ADMIN : user?.role === 'barista' ? UserRole.BARISTA : getUserRole(currentUserId);

  // Определяем текущий маршрут из URL
  const getCurrentRoute = () => {
    const path = location.pathname.replace('/admin/', '').replace('/admin', '');
    return path || 'dashboard';
  };

  const currentRoute = getCurrentRoute();

  const handleRouteChange = (newRoute: string) => {
    // Программная навигация будет осуществляться через history.push в навигационном компоненте
  };

  const pageTransition = transitions.base;

  return (
    <div className="min-h-screen bg-admin-bg-primary flex">
      {/* Респонсивная навигация */}
      <ResponsiveAdminNavigation 
        currentRoute={currentRoute}
        onRouteChange={handleRouteChange}
      />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Шапка (только на мобильных, на десктопе информация в сайдбаре) */}
        <header className="md:hidden bg-admin-bg-secondary shadow-admin border-b border-admin-border sticky top-0 z-30 ml-0">
          <div className="px-4 py-3 pl-16"> {/* pl-16 для места под кнопку гамбургер */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-admin-text-primary">☕ Админ-панель</h1>
                <p className="text-sm text-admin-text-secondary">
                  {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • ID: {currentUserId}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                userRole === UserRole.ADMIN 
                  ? 'bg-admin-warning/10 text-admin-warning border border-admin-warning/30' 
                  : 'bg-admin-info/10 text-admin-info border border-admin-info/30'
              }`}>
                {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'}
              </div>
            </div>
          </div>
        </header>

        {/* Контентная область */}
        <main className="flex-1 p-4 md:p-6 bg-admin-bg-primary">
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
              <Switch>
                <Route exact path="/admin/dashboard">
                  <Dashboard />
                </Route>
                <Route exact path="/admin/orders">
                  <OrderManagement />
                </Route>
                <Route exact path="/admin/analytics">
                  {userRole === UserRole.ADMIN ? <Analytics /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/menu">
                  {userRole === UserRole.ADMIN ? <MenuPageNew /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/bonuses">
                  {userRole === UserRole.ADMIN ? <BonusManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/achievements">
                  {userRole === UserRole.ADMIN ? <AchievementManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/promotions">
                  {userRole === UserRole.ADMIN ? <PromotionManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/stories">
                  {userRole === UserRole.ADMIN ? <InstagramStoriesAdminPageNew /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Route exact path="/admin/pos">
                  <PosPage />
                </Route>
                <Route exact path="/admin/users">
                  {userRole === UserRole.ADMIN ? <div className="p-6 text-center text-gray-500">Управление пользователями (в разработке)</div> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </Route>
                <Redirect from="/admin" to="/admin/dashboard" />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveAdminRoutes;
