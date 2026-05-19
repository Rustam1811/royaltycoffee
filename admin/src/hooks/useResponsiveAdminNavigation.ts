import { useState, useCallback } from 'react';

/**
 * Хук для управления респонсивной админ навигацией
 */
export const useResponsiveAdminNavigation = (initialRoute: string = 'dashboard') => {
  const [currentRoute, setCurrentRoute] = useState(initialRoute);

  const handleRouteChange = useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

  return {
    currentRoute,
    setCurrentRoute: handleRouteChange
  };
};
