import React, { Suspense, lazy, useEffect } from 'react';
import { Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import PrivateRoute from '@/routes/PrivateRoute';
import { HomeSkeleton } from '@/components/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { pageVariants } from '@/ui/motion';
import BottomNavBar from '@/app/navigation/BottomNav';

type PWAUpdaterHandle = {
  init: () => Promise<void>;
  destroy: () => void;
};

const Home = lazy(() => import('@/pages/Home'));
const Profile = lazy(() => import('@/pages/Profile'));
const Menu = lazy(() => import('@/pages/menu/Menu'));
const Order = lazy(() => import('@/pages/Order'));
const Booking = lazy(() => import('@/pages/Booking'));
const Card = lazy(() => import('@/pages/Card'));
const Login = lazy(() => import('@/pages/Login'));

const NOTIFICATION_ASKED_KEY = 'notifications-asked';

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const { user } = useAuth();

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
        console.error('[PWA] Failed to initialize updater:', error);
      });

    return () => {
      isMounted = false;
      pwaUpdater?.destroy();
    };
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
        console.error('[FCM] Initialization failed:', error);
      }
    };

    const hasAskedForNotifications = localStorage.getItem(NOTIFICATION_ASKED_KEY);

    if (!hasAskedForNotifications && 'Notification' in window) {
      timeoutId = window.setTimeout(() => {
        void ensureFCM().then(() => {
          if (!cancelled) {
            localStorage.setItem(NOTIFICATION_ASKED_KEY, 'true');
          }
        });
      }, 3000);
    } else if (hasAskedForNotifications) {
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
    <>
      <main className="pb-24 overflow-hidden min-h-screen">
        <Suspense fallback={<HomeSkeleton />}>
          <Switch location={location} key={location.pathname}>
            <Route
              exact
              path="/login"
              render={() => (
                <motion.div
                  key={location.pathname}
                  variants={pageVariants(!!prefersReduced)}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className="w-full"
                >
                  <Login />
                </motion.div>
              )}
            />

            <PrivateRoute exact path="/home" component={Home} />
            <PrivateRoute exact path="/menu" component={Menu} />
            <PrivateRoute exact path="/profile" component={Profile} />
            <PrivateRoute exact path="/card" component={Card} />
            <PrivateRoute exact path="/booking" component={Booking} />
            <PrivateRoute exact path="/order" component={Order} />

            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </Switch>
        </Suspense>
      </main>
      <BottomNavBar />
    </>
  );
};

export default AppRoutes;
