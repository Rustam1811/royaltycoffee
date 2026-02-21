import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { UserProvider } from '@/contexts/UserContext';
import { CartProvider } from '@/contexts/CartContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import RoleBasedRouter from '@/routes/RoleBasedRouter';
import './index.css';

/**
 * Workshop App - Приложение цеха
 * Логин происходит в основном приложении (/app/login)
 * Пользователи с workshop ролями редиректятся сюда автоматически
 */
const App: React.FC = () => {
  return (
    <BrowserRouter basename="/workshop">
      <UserProvider>
        <CartProvider>
          <div className="min-h-screen bg-slate-50 font-sans">
            <Switch>
              {/* Редирект на основной логин */}
              <Route exact path="/login">
                <RedirectToMainLogin />
              </Route>
              <Route path="/">
                <>
                  <RoleBasedRouter />
                  <BottomNavBar />
                </>
              </Route>
            </Switch>
          </div>
        </CartProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

/**
 * Редирект на основной логин приложения
 */
const RedirectToMainLogin: React.FC = () => {
  React.useEffect(() => {
    window.location.href = '/app/login';
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-workshop-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Переход на страницу входа...</p>
      </div>
    </div>
  );
};

export default App;
