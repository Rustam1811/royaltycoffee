import React, { useEffect, lazy } from 'react';
import { BrowserRouter, Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RoyalLoader } from './components/RoyalLoader';
import { FirstVisitGate } from './components/FirstVisitGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { pageVariants } from './ui/motion';
import './lib/env';
import './index.css';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Menu = lazy(() => import('./pages/menu/Menu'));
const Locations = lazy(() => import('./pages/Locations'));
const MyQRCode = lazy(() => import('./pages/MyQRCode'));
const Login = lazy(() => import('./pages/Login'));

// Bottom navigation
import { BottomNavBar } from './app/navigation/BottomNavBar';

const initPushNotifications = () => import('./services/capacitor-push').then(m => m.initPushNotifications());
const initCapacitorApp = () => import('./services/capacitor-app').then(m => m.initCapacitorApp());
const createPWAUpdater = () => import('./pwa/pwa-updater').then(m => m.createPWAUpdater);

const PrivateRoute: React.FC<{ component: React.ComponentType<any>; exact?: boolean; path: string }> = ({ component: Component, ...rest }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) return <RoyalLoader />;
        if (!user) return <Redirect to={{ pathname: '/login', state: { redirect: location.pathname } }} />;
        
        return (
          <motion.div
            variants={pageVariants(!!prefersReduced)}
            initial="initial"
            animate="enter"
            exit="exit"
            className="w-full min-h-screen"
          >
            <Component {...props} />
          </motion.div>
        );
      }}
    />
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const { user } = useAuth();
  const isLogin = location.pathname === '/login';

  useEffect(() => {
    // Init Capacitor native plugins (StatusBar, Keyboard, BackButton)
    initCapacitorApp();

    // PWA updater only on web — Service Worker not used in native Capacitor
    if (!Capacitor.isNativePlatform()) {
      createPWAUpdater().then((factory) => {
        const pwaUpdater = factory({ autoReload: true });
        pwaUpdater.init();
        return () => pwaUpdater.destroy();
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Workshop users should never be in the coffee app — redirect to workshop
    const workshopRoles = ['workshop_admin', 'workshop_client', 'workshop_owner'];
    if (workshopRoles.includes(user.role)) {
      window.location.href = Capacitor.isNativePlatform() ? '/workshop/index.html' : '/workshop/';
      return;
    }

    const hasAskedForNotifications = localStorage.getItem('notifications-asked');
    
    if (!hasAskedForNotifications) {
      setTimeout(() => {
        initPushNotifications().then(() => {
          localStorage.setItem('notifications-asked', 'true');
        });
      }, 3000);
    } else {
      initPushNotifications();
    }
  }, [user]);
  
  return (
    <>
      <main className={isLogin ? 'min-h-screen' : 'pb-20 overflow-hidden min-h-screen'}>
        <FirstVisitGate>
          <Switch location={location}>
            <Route exact path="/login" render={() => (
              <motion.div
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
            <PrivateRoute exact path="/qr" component={MyQRCode} />
            <PrivateRoute exact path="/locations" component={Locations} />
            
            <Route exact path="/"><Redirect to="/home" /></Route>
            <Route path="*"><Redirect to="/home" /></Route>
          </Switch>
        </FirstVisitGate>
      </main>
      <BottomNavBar />
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter basename={Capacitor.isNativePlatform() ? '/' : '/app'}>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            {/* Desktop: dark background sides, centered mobile-width content */}
            <div className="min-h-screen bg-[#F4EDE4] md:bg-[#0D0205] md:flex md:justify-center">
              <div className="w-full md:max-w-[440px] min-h-screen bg-[#F4EDE4] text-slate-900 md:shadow-[0_0_80px_rgba(0,0,0,0.7)]">
                <AppContent />
              </div>
            </div>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
