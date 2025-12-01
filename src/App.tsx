import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { HomeSkeleton } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { pageVariants } from './ui/motion';
import './lib/env';
import './index.css';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Menu = lazy(() => import('./pages/menu/Menu'));
const Order = lazy(() => import('./pages/Order'));
const Booking = lazy(() => import('./pages/Booking'));
const Card = lazy(() => import('./pages/Card'));
const Login = lazy(() => import('./pages/Login'));
const MyQRCode = lazy(() => import('./pages/MyQRCode'));

// Bottom navigation
import { BottomNavBar } from './app/navigation/BottomNavBar';

const initializeFCM = () => import('./services/messaging').then(m => m.initializeFCM());
const createPWAUpdater = () => import('./pwa/pwa-updater').then(m => m.createPWAUpdater);

const PrivateRoute: React.FC<{ component: React.ComponentType<any>; exact?: boolean; path: string }> = ({ component: Component, ...rest }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) return <HomeSkeleton />;
        if (!user) return <Redirect to={{ pathname: '/login', state: { redirect: location.pathname } }} />;
        
        return (
          <Suspense fallback={<HomeSkeleton />}>
            <motion.div
              key={location.pathname}
              variants={pageVariants(!!prefersReduced)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="w-full min-h-screen"
            >
              <Component {...props} />
            </motion.div>
          </Suspense>
        );
      }}
    />
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const { user } = useAuth();

  useEffect(() => {
    createPWAUpdater().then((factory) => {
      const pwaUpdater = factory({ autoReload: true });
      pwaUpdater.init();
      return () => pwaUpdater.destroy();
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const hasAskedForNotifications = localStorage.getItem('notifications-asked');
    
    if (!hasAskedForNotifications && 'Notification' in window) {
      setTimeout(() => {
        initializeFCM().then(() => {
          localStorage.setItem('notifications-asked', 'true');
        });
      }, 3000);
    } else if (hasAskedForNotifications) {
      initializeFCM();
    }
  }, [user]);
  
  return (
    <>
      <main className="pb-24 overflow-hidden min-h-screen">
        <Suspense fallback={<HomeSkeleton />}>
          <Switch location={location} key={location.pathname}>
            <Route exact path="/login" render={() => (
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
            )} />

            <PrivateRoute exact path="/home" component={Home} />
            <PrivateRoute exact path="/menu" component={Menu} />
            <PrivateRoute exact path="/profile" component={Profile} />
            <PrivateRoute exact path="/card" component={Card} />
            <PrivateRoute exact path="/my-qr" component={MyQRCode} />
            <PrivateRoute exact path="/booking" component={Booking} />
            <PrivateRoute exact path="/order" component={Order} />
            <Route exact path="/"><Redirect to="/home" /></Route>
          </Switch>
        </Suspense>
      </main>
      <BottomNavBar />
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-[#F6F7FB] text-slate-900">
            <AppContent />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
