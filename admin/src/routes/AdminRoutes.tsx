import React, { useContext } from 'react';
import { Switch, Route, Redirect, useHistory, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '@/ui/motion';
import { UserContext } from '@/contexts/UserContext';

// Pages
import Dashboard from '@/pages/Dashboard';
import OrderManagement from '@/pages/OrderManagement';
import Analytics from '@/pages/Analytics';
import MenuPageNew from '@/pages/MenuPageNew';
import BonusManagement from '@/pages/BonusManagement';
import AchievementManagement from '@/pages/AchievementManagement';
import PromotionManagement from '@/pages/PromotionManagement';
import InstagramStoriesAdminPageNew from '@/pages/InstagramStoriesAdminPageNew';
import LoginPage from '@/pages/LoginPage';
import UsersPage from '@/pages/UsersPage';
import PosPage from '@/pages/PosPage';

// Navigation
import ResponsiveAdminNavigation from '@/components/ResponsiveAdminNavigation';

const NoAccess: React.FC = () => {
  const { logout } = useContext(UserContext);
  return (
    <div className="p-6">
      <div className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h2>
        <p className="text-slate-600 mb-4">Эта страница доступна только администраторам.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/admin/login" className="inline-flex items-center px-4 py-2 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-black transition-colors">
            Войти как администратор
          </Link>
          <button onClick={logout} className="inline-flex items-center px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useContext(UserContext);
  
  console.log('🔐 AuthGuard: рендер', { hasUser: user ? 'есть' : 'нет', loading });

  // Показываем загрузку
  if (loading) {
    console.log('🔐 AuthGuard: показываем загрузку');
    return (
      <div className="min-h-screen font-sанс bg-gradient-to-b from-slate-100 via-slate-100 to-white">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  // Если нет пользователя, показываем логин
  if (!user) {
    console.log('🔐 AuthGuard: пользователь не найден, показываем LoginPage');
    return <LoginPage />;
  }

  console.log('🔐 AuthGuard: пользователь найден, показываем children');
  return <>{children}</>;
};

const AdminLayout: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useContext(UserContext);

  const roleName = user?.role === 'admin' ? 'Администратор' : user?.role === 'owner' ? 'Владелец' : 'Пользователь';

  const path = location.pathname.replace(/^\/admin\/?/, '');
  const currentRoute = (path.split('/')[0] || 'orders') as string;

  const handleRouteChange = (route: string) => {
    if (!route.startsWith('/admin/')) route = `/admin/${route.replace(/^\/+/, '')}`;
    history.push(route);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex">
      {/* Sidebar navigation */}
      <ResponsiveAdminNavigation 
        currentRoute={currentRoute}
        onRouteChange={handleRouteChange}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)] border-b border-[var(--color-border)] sticky top-0 z-30 ml-0">
          <div className="px-4 py-3 pl-16">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-family-heading)]">Админ-панель</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {roleName} • ID: {user?.uid}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-[var(--color-brand-amber)]/10 text-[var(--color-brand-amber)]' 
                    : 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
                }`}>
                  {roleName}
                </div>
                <button onClick={logout} className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-0 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit="out"
              variants={pageVariants(false)}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ opacity: 1 }}
              className="h-full"
            >
              <Switch location={location}>
                <Route exact path="/admin">
                  <Redirect to="/admin/orders" />
                </Route>

                <Route exact path="/admin/dashboard" component={Dashboard} />
                <Route exact path="/admin/orders" component={OrderManagement} />

                <Route exact path="/admin/analytics" render={() => (
                  user?.role === 'owner' ? <Analytics /> : <NoAccess />
                )} />

                <Route exact path="/admin/menu" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <MenuPageNew /> : <NoAccess />
                )} />

                <Route exact path="/admin/bonuses" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <BonusManagement /> : <NoAccess />
                )} />

                <Route exact path="/admin/achievements" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <AchievementManagement /> : <NoAccess />
                )} />

                <Route exact path="/admin/promotions" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <PromotionManagement /> : <NoAccess />
                )} />

                <Route exact path="/admin/stories" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <InstagramStoriesAdminPageNew /> : <NoAccess />
                )} />

                <Route exact path="/admin/users" render={() => (
                  user?.role === 'admin' || user?.role === 'owner' ? <UsersPage /> : <NoAccess />
                )} />

                {/* POS доступен всем авторизованным; сам компонент проверит роль (staff/admin) */}
                <Route exact path="/admin/pos" component={PosPage} />

                {/* Fallback for admin routes */}
                <Route path="/admin/*">
                  <Redirect to="/admin/orders" />
                </Route>
              </Switch>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const AdminRoutes: React.FC = () => {
  return (
    <Switch>
      {/* Публичная страница логина */}
      <Route exact path="/admin/login" component={LoginPage} />

      {/* Все остальные админ-маршруты защищены */}
      <Route path="/admin">
        <AuthGuard>
          <AdminLayout />
        </AuthGuard>
      </Route>
    </Switch>
  );
};

export default AdminRoutes;
