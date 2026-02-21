import React from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import { RoyalLoader } from '../../components/RoyalLoader';
import { pageVariants } from '../../ui/motion';

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  exact?: boolean;
  path: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  component: Component, 
  ...rest 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) {
          return <RoyalLoader />;
        }

        if (!user) {
          return (
            <Redirect 
              to={{ 
                pathname: '/login', 
                state: { redirect: location.pathname } 
              }} 
            />
          );
        }

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
