/**
 * Role-Based Router
 * Роутер с разделением по ролям и точкам
 * 
 * Структура URL:
 * - /superowner/* - главный владелец (все точки)
 * - /owner/:locationId/* - владелец точки  
 * - /admin/:locationId/* - админ точки
 * - /barista/:locationId/* - бариста
 * - /courier/:locationId/* - курьер
 */

import React, { useContext, lazy, Suspense } from 'react';
import { Switch, Route, Redirect, useParams, useLocation } from 'react-router-dom';
import { UserContext, Role } from '@/contexts/UserContext';
import { hasAccess, getLoginRedirect } from '@/config/rbac';
import RoleBasedNavigation from '@/components/RoleBasedNavigation';

// Lazy load страниц
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LocationsManagementPage = lazy(() => import('@/pages/LocationsManagementPage').then(m => ({ default: m.LocationsManagementPage })));
const Analytics = lazy(() => import('@/pages/Analytics'));
const PosMenuPage = lazy(() => import('@/pages/PosMenuPage'));
const MenuEditorPageNew = lazy(() => import('@/pages/MenuEditorPageNew'));
const OrderManagement = lazy(() => import('@/pages/OrderManagement'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const BonusManagement = lazy(() => import('@/pages/BonusManagement'));
const AchievementManagement = lazy(() => import('@/pages/AchievementManagement'));
const PromotionManagement = lazy(() => import('@/pages/PromotionManagement'));
const InstagramStoriesAdminPageNew = lazy(() => import('@/pages/InstagramStoriesAdminPageNew'));
const PosPage = lazy(() => import('@/pages/PosPage'));
const DeliveryManagement = lazy(() => import('@/pages/DeliveryManagement'));
const CourierManagement = lazy(() => import('@/pages/CourierManagement'));
const CourierDashboard = lazy(() => import('@/pages/CourierDashboard'));
const CourierDocumentsPage = lazy(() => import('@/pages/CourierDocumentsPage'));
const StaffManagementPage = lazy(() => import('@/pages/StaffManagementPage'));
const WorkshopPage = lazy(() => import('@/pages/WorkshopPage'));

// Компонент загрузки
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
  </div>
);

// Компонент "Нет доступа"
const NoAccess: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
    <div className="text-6xl mb-4">🔒</div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Нет доступа</h2>
    <p className="text-slate-500">У вас нет прав для просмотра этой страницы</p>
  </div>
);

// Маппинг страниц к компонентам
const PAGE_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<{ locationId?: string }>>> = {
  'dashboard': Dashboard,
  'locations': LocationsManagementPage,
  'analytics': Analytics,
  'menu': PosMenuPage,
  'menu-editor': MenuEditorPageNew,
  'orders': OrderManagement,
  'users': UsersPage,
  'staff': StaffManagementPage,
  'bonuses': BonusManagement,
  'achievements': AchievementManagement,
  'promotions': PromotionManagement,
  'stories': InstagramStoriesAdminPageNew,
  'pos': PosPage,
  'delivery': DeliveryManagement,
  'couriers': CourierManagement,
  'courier-dashboard': CourierDashboard,
  'courier-documents': CourierDocumentsPage,
  'workshop': WorkshopPage,
};

interface RouteParams {
  locationId?: string;
  page?: string;
}

// Компонент страницы с проверкой доступа
const ProtectedPage: React.FC<{ role: Role; page: string; locationId?: string }> = ({ 
  role, 
  page, 
  locationId 
}) => {
  if (!hasAccess(role, page)) {
    return <NoAccess />;
  }

  const Component = PAGE_COMPONENTS[page];
  if (!Component) {
    return <NoAccess />;
  }

  // Для superowner dashboard используем специальную версию
  if (role === 'superowner' && page === 'dashboard') {
    return (
      <Suspense fallback={<PageLoader />}>
        <DashboardPage />
      </Suspense>
    );
  }

  // PosMenuPage использует absolute inset-0, рендерим без обёртки
  const isFullscreen = page === 'menu';

  return (
    <Suspense fallback={<PageLoader />}>
      {isFullscreen ? (
        <Component locationId={locationId} />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <Component locationId={locationId} />
        </div>
      )}
    </Suspense>
  );
};

// Роутер для SuperOwner (без locationId в пути)
const SuperOwnerRoutes: React.FC = () => {
  const { page } = useParams<RouteParams>();
  const currentPage = page || 'dashboard';

  return (
    <ProtectedPage role="superowner" page={currentPage} />
  );
};

// Роутер для Owner/Admin/Barista/Courier (с locationId в пути)
const LocationRoutes: React.FC<{ role: Role }> = ({ role }) => {
  const { locationId: urlLocationId, page } = useParams<RouteParams>();
  const { user } = useContext(UserContext);
  const currentPage = page || 'dashboard';
  
  // locationId из URL параметра (приоритет) или из UserContext
  const locationId = urlLocationId || user?.locationId;

  if (!locationId) {
    return <NoAccess />;
  }

  return (
    <ProtectedPage role={role} page={currentPage} locationId={locationId} />
  );
};

// Главный Layout для роутов с навигацией
const RoleLayout: React.FC<{ 
  role: Role; 
  locationId?: string;
  children: React.ReactNode 
}> = ({ role, locationId, children }) => {
  const location = useLocation();
  
  // Определяем текущую страницу из URL
  // /superowner/dashboard → ['superowner', 'dashboard']
  // /admin/royal-main/orders → ['admin', 'royal-main', 'orders']
  const pathParts = location.pathname.split('/').filter(Boolean);
  let currentPage = 'dashboard';
  
  if (role === 'superowner') {
    // /superowner/:page
    currentPage = pathParts[1] || 'dashboard';
  } else {
    // /admin/:locationId/:page  or  /owner/:locationId/:page
    currentPage = pathParts[2] || 'dashboard';
  }

  // Полноэкранные страницы (POS-меню) — без padding, relative для absolute inset-0 потомков
  const isFullscreen = currentPage === 'menu';

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      <RoleBasedNavigation 
        role={role} 
        locationId={locationId}
        currentPage={currentPage}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {isFullscreen ? (
          <main className="flex-1 min-h-0 relative">
            {children}
          </main>
        ) : (
          <main className="flex-1 bg-slate-100 p-6 overflow-auto">
            <div className="w-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

// Главный компонент роутера
const RoleBasedRouter: React.FC = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/admin/login" />;
  }

  const { role, locationId } = user;

  return (
    <Switch>
      {/* SuperOwner роуты */}
      <Route path="/superowner/:page?">
        {role === 'superowner' ? (
          <RoleLayout role="superowner">
            <SuperOwnerRoutes />
          </RoleLayout>
        ) : (
          <Redirect to={getLoginRedirect(role, locationId)} />
        )}
      </Route>

      {/* Owner роуты */}
      <Route path="/owner/:locationId/:page?">
        {role === 'owner' ? (
          <RoleLayout role="owner" locationId={locationId}>
            <LocationRoutes role="owner" />
          </RoleLayout>
        ) : (
          <Redirect to={getLoginRedirect(role, locationId)} />
        )}
      </Route>

      {/* Admin роуты */}
      <Route path="/admin/:locationId/:page?">
        {role === 'admin' ? (
          <RoleLayout role="admin" locationId={locationId}>
            <LocationRoutes role="admin" />
          </RoleLayout>
        ) : (
          <Redirect to={getLoginRedirect(role, locationId)} />
        )}
      </Route>

      {/* Barista роуты */}
      <Route path="/barista/:locationId/:page?">
        {role === 'barista' ? (
          <RoleLayout role="barista" locationId={locationId}>
            <LocationRoutes role="barista" />
          </RoleLayout>
        ) : (
          <Redirect to={getLoginRedirect(role, locationId)} />
        )}
      </Route>

      {/* Courier роуты */}
      <Route path="/courier/:locationId/:page?">
        {role === 'courier' ? (
          <RoleLayout role="courier" locationId={locationId}>
            <LocationRoutes role="courier" />
          </RoleLayout>
        ) : (
          <Redirect to={getLoginRedirect(role, locationId)} />
        )}
      </Route>

      {/* Корневой редирект */}
      <Route path="/">
        <Redirect to={getLoginRedirect(role, locationId)} />
      </Route>
    </Switch>
  );
};

export default RoleBasedRouter;
