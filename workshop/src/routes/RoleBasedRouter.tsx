import React, { useEffect, useState } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { PageLoader } from '@/components/ui';
import { getLoginRedirect } from '@/config/rbac';
import { getClientByUid } from '@/services';

// Client Pages
import { 
  OutletsPage, 
  MenuPage as ClientMenuPage, 
  CartPage, 
  OrdersPage as ClientOrdersPage,
  AnalyticsPage as ClientAnalyticsPage,
  QuickOrderPage,
  OnboardingPage,
} from '@/pages/client';

// Admin Pages
import {
  DashboardPage as AdminDashboardPage,
  OrdersManagementPage,
  MenuEditorPage,
  ClientsPage,
} from '@/pages/admin';

/**
 * Обёртка: если клиент не прошёл онбординг — редирект на /client/onboarding
 */
const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user?.uid) { setChecked(true); return; }
      try {
        const client = await getClientByUid(user.uid);
        setNeedsOnboarding(!client?.onboardingCompleted);
      } catch {
        setNeedsOnboarding(false);
      } finally {
        setChecked(true);
      }
    };
    check();
  }, [user?.uid]);

  if (!checked) return <PageLoader text="Загрузка..." />;
  if (needsOnboarding) return <Redirect to="/client/onboarding" />;
  return <>{children}</>;
};

/**
 * Роутер клиента цеха
 */
const ClientRoutes: React.FC = () => (
  <Switch>
    <Route exact path="/client/onboarding" component={OnboardingPage} />
    <Route path="/client">
      <OnboardingGuard>
        <Switch>
          <Route exact path="/client/outlets" component={OutletsPage} />
          <Route exact path="/client/menu" component={ClientMenuPage} />
          <Route exact path="/client/cart" component={CartPage} />
          <Route exact path="/client/quick-order" component={QuickOrderPage} />
          <Route exact path="/client/orders" component={ClientOrdersPage} />
          <Route exact path="/client/analytics" component={ClientAnalyticsPage} />
          <Route path="/client">
            <Redirect to="/client/outlets" />
          </Route>
        </Switch>
      </OnboardingGuard>
    </Route>
  </Switch>
);

/**
 * Роутер админа цеха
 */
const AdminRoutes: React.FC = () => (
  <Switch>
    <Route exact path="/admin/dashboard" component={AdminDashboardPage} />
    <Route exact path="/admin/orders" component={OrdersManagementPage} />
    <Route exact path="/admin/menu" component={MenuEditorPage} />
    <Route exact path="/admin/clients" component={ClientsPage} />
    <Route path="/admin">
      <Redirect to="/admin/dashboard" />
    </Route>
  </Switch>
);

/**
 * Роутер владельца цеха
 */
const OwnerRoutes: React.FC = () => (
  <Switch>
    <Route exact path="/owner/dashboard" component={AdminDashboardPage} />
    <Route exact path="/owner/orders" component={OrdersManagementPage} />
    <Route exact path="/owner/menu" component={MenuEditorPage} />
    <Route exact path="/owner/clients" component={ClientsPage} />
    <Route exact path="/owner/analytics" component={ClientAnalyticsPage} />
    <Route path="/owner">
      <Redirect to="/owner/dashboard" />
    </Route>
  </Switch>
);

/**
 * Роутер суперовнера (полный доступ)
 */
const SuperownerRoutes: React.FC = () => (
  <Switch>
    <Route exact path="/superowner/dashboard" component={AdminDashboardPage} />
    <Route exact path="/superowner/orders" component={OrdersManagementPage} />
    <Route exact path="/superowner/menu" component={MenuEditorPage} />
    <Route exact path="/superowner/clients" component={ClientsPage} />
    <Route exact path="/superowner/analytics" component={ClientAnalyticsPage} />
    <Route path="/superowner">
      <Redirect to="/superowner/dashboard" />
    </Route>
  </Switch>
);

/**
 * Главный роутер на основе роли
 */
const RoleBasedRouter: React.FC = () => {
  const { user, loading } = useUser();

  if (loading) {
    return <PageLoader text="Загрузка..." />;
  }

  if (!user) {
    // Редирект на основной логин
    window.location.href = '/app/login';
    return <PageLoader text="Переход на страницу входа..." />;
  }

  // Редирект на правильный путь в зависимости от роли
  const defaultPath = getLoginRedirect(user.role);

  return (
    <Switch>
      {/* Client Routes */}
      {(user.role === 'workshop_client') && (
        <Route path="/client" component={ClientRoutes} />
      )}

      {/* Admin Routes */}
      {(user.role === 'workshop_admin') && (
        <Route path="/admin" component={AdminRoutes} />
      )}

      {/* Owner Routes */}
      {(user.role === 'workshop_owner' || user.role === 'superowner') && (
        <>
          <Route path="/owner" component={OwnerRoutes} />
          <Route path="/admin" component={AdminRoutes} />
          <Route path="/client" component={ClientRoutes} />
        </>
      )}

      {/* Superowner Routes */}
      {(user.role === 'superowner') && (
        <Route path="/superowner" component={SuperownerRoutes} />
      )}

      {/* Default Redirect */}
      <Route path="/">
        <Redirect to={defaultPath} />
      </Route>
    </Switch>
  );
};

export default RoleBasedRouter;
