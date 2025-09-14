// src/App.tsx
import React from 'react';
import { BrowserRouter, Switch, Route, Redirect, NavLink, useRouteMatch, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from 'framer-motion';
import { HomeIcon, Squares2X2Icon, ShoppingBagIcon, CalendarDaysIcon, UserCircleIcon } from '@heroicons/react/24/solid';

// pages
import Home from './pages/Home';
import Profile from './pages/Profile';
import Menu from './pages/menu/Menu';
import Order from './pages/Order';
import Booking from './pages/Booking';
import Login from './pages/Login';

// admin
import AdminApp from '../admin/App';

// contexts
import { CartProvider } from './contexts/CartContext';
import { AuthProvider, useAuth } from './auth/AuthContext';

import "./index.css";
import { pageVariants } from './ui/motion';

const navItems = [
  { to: "/home", icon: HomeIcon, label: "Главная" },
  { to: "/menu", icon: Squares2X2Icon, label: "Меню" },
  { to: "/order", icon: ShoppingBagIcon, label: "Заказ" },
  { to: "/booking", icon: CalendarDaysIcon, label: "Бронь" },
  { to: "/profile", icon: UserCircleIcon, label: "Профиль" },
];

const NavItem = ({ to, icon: Icon, label }: { to: string, icon: React.ElementType, label: string }) => {
  const match = useRouteMatch({ path: to, exact: true });
  const isActive = !!match;
  return (
    <NavLink to={to} className="relative flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 min-w-0 flex-1 group">
      <>
        <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`} />
        <span className={`text-xs mt-1.5 transition-all duration-300 ${isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-600 group-hover:text-slate-900'}`}>
          {label}
        </span>
        {isActive && (
          <motion.div
            layoutId="active-nav-indicator"
            className="absolute top-1 h-1 w-8 bg-slate-900 rounded-full shadow-lg"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
      </>
    </NavLink>
  );
};

const BottomNavBar = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLogin = location.pathname === '/login';
  if (isAdminRoute || isLogin) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl px-4 py-3 flex justify-center border border-slate-200/60 max-w-sm">
        <div className="flex justify-around gap-2 w-full">
          {navItems.map(item => <NavItem key={item.to} {...item} />)}
        </div>
      </div>
    </div>
  );
};

const PrivateRoute: React.FC<{ component: React.ComponentType<Record<string, unknown>>; exact?: boolean; path: string; }> = ({ component: C, ...rest }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  return (
    <Route
      {...rest}
      render={(props) =>
        loading ? null : user ? (
          user.role === 'admin' ? (
            <Redirect to="/admin" />
          ) : (
            <motion.div
              key={location.pathname}
              variants={pageVariants(!!prefersReduced)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="w-full min-h-screen"
            >
              <C {...props} />
            </motion.div>
          )
        ) : (
          <Redirect to={{ pathname: '/login', state: { redirect: location.pathname } }} />
        )
      }
    />
  );
};

const AdminRoute: React.FC<{ component: React.ComponentType<Record<string, unknown>>; exact?: boolean; path: string; }> = ({ component: C, ...rest }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  return (
    <Route
      {...rest}
      render={(props) =>
        loading ? null : user && user.role === 'admin' ? (
          <motion.div
            key={location.pathname}
            variants={pageVariants(!!prefersReduced)}
            initial="initial"
            animate="enter"
            exit="exit"
            className="w-full min-h-screen"
          >
            <C {...props} />
          </motion.div>
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  return (
    <>
      <main className="pb-24 overflow-hidden min-h-screen">
        <Switch location={location} key={location.pathname}>
          <Route path="/admin" component={AdminApp} />
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
          <PrivateRoute exact path="/booking" component={Booking} />
          <PrivateRoute exact path="/order" component={Order} />
          <Route path="/admin" component={AdminApp} />
          <Route exact path="/"><Redirect to="/home" /></Route>
        </Switch>
      </main>
      <BottomNavBar />
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F6F7FB] text-slate-900">
          <AppContent />
        </div>
      </BrowserRouter>
    </CartProvider>
  </AuthProvider>
);
export default App;
