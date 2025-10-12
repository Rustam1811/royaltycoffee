import React, { useContext } from 'react';
import { Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { UserRole, getUserRole, getCurrentUserId } from '@/utils/userRoles';
import { UserContext } from '@/contexts/UserContext';


// Импорт компонентов страниц
import Dashboard from '@/pages/Dashboard';
import OrderManagement from '@/pages/OrderManagement';
import Analytics from '@/pages/Analytics';
import AdminMenuView from '@/pages/AdminMenuView';
import PosMenuPage from '@/pages/PosMenuPage';
import BonusManagement from '@/pages/BonusManagement';
import AchievementManagement from '@/pages/AchievementManagement';
import PromotionManagement from '@/pages/PromotionManagement';
import InstagramStoriesAdminPageNew from '@/pages/InstagramStoriesAdminPageNew';
import PosPage from '@/pages/PosPage';
import UsersPage from '@/pages/UsersPage';

// Новая респонсивная навигация
import ResponsiveAdminNavigation from '@/components/ResponsiveAdminNavigation';

/**
 * Основной компонент админ-панели с респонсивной навигацией
 */
const ResponsiveAdminRoutes: React.FC = () => {
  console.log('🔀 ResponsiveAdminRoutes rendering...');
  const location = useLocation();
  console.log('🔀 Current location:', location.pathname);
  const { user } = useContext(UserContext);
  console.log('🔀 User in routes:', user);
  const currentUserId = user?.uid || getCurrentUserId();
  const userRole = user?.role === 'admin' ? UserRole.ADMIN : user?.role === 'barista' ? UserRole.BARISTA : getUserRole(currentUserId);

  // Определяем текущий маршрут из URL (учитываем base: '/admin/')
  const getCurrentRoute = () => {
    const path = location.pathname.replace(/^\/admin\//, '').replace(/^\//, '');
    return path || 'dashboard';
  };

  const currentRoute = getCurrentRoute();

  const handleRouteChange = () => {
    // Программная навигация будет осуществляться через history.push в навигационном компоненте
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Респонсивная навигация */}
      <ResponsiveAdminNavigation 
        currentRoute={currentRoute}
        onRouteChange={handleRouteChange}
      />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Шапка (только на мобильных, на десктопе информация в сайдбаре) */}
        <header className="md:hidden bg-white shadow-md border-b border-slate-200 sticky top-0 z-30 ml-0">
          <div className="px-4 py-3 pl-16"> {/* pl-16 для места под кнопку гамбургер */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">☕ Админ-панель</h1>
                <p className="text-sm text-slate-600">
                  {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'} • ID: {currentUserId}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                userRole === UserRole.ADMIN 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {userRole === UserRole.ADMIN ? 'Администратор' : 'Бариста'}
              </div>
            </div>
          </div>
        </header>

        {/* Контентная область */}
        <main className="flex-1 bg-slate-100 p-6 overflow-auto md:ml-64">
          <div className="w-full max-w-7xl mx-auto">
            <Switch>
              <Route exact path="/admin/dashboard">
                <div className="bg-white rounded-lg shadow p-6">
                  <Dashboard />
                </div>
              </Route>
              <Route exact path="/admin/orders">
                <div className="bg-white rounded-lg shadow p-6">
                  <OrderManagement />
                </div>
              </Route>
              <Route exact path="/admin/analytics">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <Analytics /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Route exact path="/admin/menu">
                {/* POS-меню для быстрого добавления в корзину */}
                <PosMenuPage />
              </Route>
              <Route exact path="/admin/bonuses">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <BonusManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Route exact path="/admin/achievements">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <AchievementManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Route exact path="/admin/promotions">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <PromotionManagement /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Route exact path="/admin/stories">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <InstagramStoriesAdminPageNew /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Route exact path="/admin/pos">
                <div className="bg-white rounded-lg shadow p-6">
                  <PosPage />
                </div>
              </Route>
              <Route exact path="/admin/users">
                <div className="bg-white rounded-lg shadow p-6">
                  {userRole === UserRole.ADMIN ? <UsersPage /> : <div className="p-6 text-center text-gray-500">Нет доступа</div>}
                </div>
              </Route>
              <Redirect from="/admin" exact to="/admin/dashboard" />
              <Redirect from="/" exact to="/admin/dashboard" />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveAdminRoutes;
