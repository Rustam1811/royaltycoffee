import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCafeIdFromDomain, getCafeConfig, CafeConfig, TenantContext } from '../lib/multitenancy';
import { logger } from '../lib/logger';

const CafeContext = createContext<TenantContext | null>(null);

export const useCafe = () => {
  const context = useContext(CafeContext);
  if (!context) {
    throw new Error('useCafe must be used within CafeProvider');
  }
  return context;
};

interface CafeProviderProps {
  children: React.ReactNode;
}

export const CafeProvider: React.FC<CafeProviderProps> = ({ children }) => {
  const [cafeId, setCafeId] = useState<string>(() => getCafeIdFromDomain());
  const [cafe, setCafe] = useState<CafeConfig | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCafeConfig = async () => {
      try {
        const config = await getCafeConfig(cafeId);
        if (config) {
          setCafe(config);
          logger.info('Cafe config loaded', { cafeId, cafeName: config.name });
        } else {
          logger.warn('Cafe config not found, using default', { cafeId });
        }
      } catch (error) {
        logger.error('Failed to load cafe config', error, { cafeId });
      } finally {
        setLoading(false);
      }
    };

    loadCafeConfig();
  }, [cafeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <CafeContext.Provider value={{ cafeId, cafe }}>
      {children}
    </CafeContext.Provider>
  );
};
