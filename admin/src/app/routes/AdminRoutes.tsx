import React, { useContext, useEffect, useState } from 'react';
import { Switch, Route } from 'react-router-dom';
import ResponsiveAdminRoutes from '@/routes/ResponsiveAdminRoutes';
import RequireAuth from '@/routes/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import { api } from '@/services/api';
import { UserContext } from '@/contexts/UserContext';
import AdminLayout from '@/app/layout/AdminLayout';

const NOTIFICATION_FLAG = 'admin-notifications-asked';

type ApiStatus = 'ok' | 'error' | 'loading';
type PWAUpdaterHandle = {
  init: () => Promise<void>;
  destroy: () => void;
};

const AdminRoutes: React.FC = () => {
  const { user } = useContext(UserContext);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    let pwaUpdater: PWAUpdaterHandle | null = null;

    void import('@/pwa/pwa-updater')
      .then(({ createPWAUpdater }) => {
        if (!isMounted) {
          return;
        }
        pwaUpdater = createPWAUpdater({ autoReload: true });
        return pwaUpdater.init();
      })
      .catch((error) => {
        console.error('[Admin PWA] Failed to initialize updater:', error);
      });

    return () => {
      isMounted = false;
      pwaUpdater?.destroy();
    };
  }, []);

  useEffect(() => {
    const checkApiHealth = async () => {
      setApiStatus('loading');
      try {
        const pingResult = await api.get('/ping');
        console.info('[Admin API] Ping:', pingResult);
        setApiStatus('ok');
        setLastFetch(new Date().toLocaleTimeString());
        setApiError(null);
      } catch (error) {
        console.warn('[Admin API] Health check failed (optional):', error);
        // API optional — не мешаем работе админки
        setApiStatus('ok');
        setApiError(null);
      }
    };

    void checkApiHealth();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const ensureFCM = async () => {
      try {
        const { initializeFCM } = await import('@/services/messaging');
        await initializeFCM();
      } catch (error) {
        console.error('[Admin FCM] Initialization failed:', error);
      }
    };

    const hasAsked = (() => {
      try {
        return localStorage.getItem(NOTIFICATION_FLAG);
      } catch {
        return null;
      }
    })();

    if (!hasAsked && 'Notification' in window) {
      timeoutId = window.setTimeout(() => {
        void ensureFCM().then(() => {
          if (!cancelled) {
            try {
              localStorage.setItem(NOTIFICATION_FLAG, 'true');
            } catch {
              // storage может быть недоступен
            }
          }
        });
      }, 3000);
    } else if (hasAsked) {
      void ensureFCM();
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [user]);

  return (
    <AdminLayout apiStatus={apiStatus} lastFetch={lastFetch} apiError={apiError}>
      <Switch>
        <Route exact path="/login" component={LoginPage} />
        <Route exact path="/admin/login" component={LoginPage} />
        <Route path="/">
          <RequireAuth>
            <ResponsiveAdminRoutes />
          </RequireAuth>
        </Route>
      </Switch>
    </AdminLayout>
  );
};

export default AdminRoutes;
