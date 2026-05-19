import React from 'react';
import { Route, Redirect, RouteProps, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const PrivateRoute: React.FC<RouteProps> = ({ children, ...rest }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Загрузка…</div>
      </div>
    );
  }

  return (
    <Route
      {...rest}
      render={() =>
        user ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: location.pathname }
            }}
          />
        )
      }
    />
  );
};

export default PrivateRoute;
