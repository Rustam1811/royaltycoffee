import React, { useEffect, useState } from "react";
import { Switch, Route } from "react-router-dom";
import RoleBasedRouter from "@/routes/RoleBasedRouter";
import LoginPage from "@/pages/LoginPage";
import DevOverlay from "@/components/DevOverlay";
import { api } from "@/services/api";
import { CartProvider } from "../../src/contexts/CartContext";
import { LocationProvider } from "./contexts/LocationContext";
import { initializeFCM } from "@/services/messaging";
import { createPWAUpdater } from "@/pwa/pwa-updater";
import { auth } from "@/lib/firebase";
import "./theme/tokens.css";
import "./index.css";

const AdminApp: React.FC = () => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [lastFetch, setLastFetch] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const pwaUpdater = createPWAUpdater({
      autoReload: true
    });
    
    pwaUpdater.init();
    
    return () => {
      pwaUpdater.destroy();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeFCM();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const checkApiHealth = async () => {
      setApiStatus('loading');
      try {
        // Test multiple endpoints
        const [pingResult, usersResult] = await Promise.all([
          api.get('/ping'),
          api.get('/users?action=list')
        ]);
        console.info('[API HEALTH] Ping:', pingResult);
        console.info('[API HEALTH] Users test:', usersResult);
        setApiStatus('ok');
        setLastFetch(new Date().toLocaleTimeString());
        setApiError(null);
      } catch (error) {
        setApiStatus('error');
        if (error instanceof Error && error.message === 'NON_JSON_RESPONSE') {
          setApiError('API returns HTML. Check Vercel rewrites.');
          console.error('[API HEALTH] NON_JSON_RESPONSE detected');
        } else {
          setApiError(error instanceof Error ? error.message : 'Unknown API error');
          console.error('[API HEALTH] Error:', error);
        }
      }
    };
    
    checkApiHealth();
  }, []);

  return (
    <CartProvider>
      <LocationProvider>
        <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-['Manrope']">
          <DevOverlay 
            apiStatus={apiStatus}
            lastFetch={lastFetch}
            apiError={apiError || undefined}
          />
          
          {apiError && (
            <div className="bg-red-500 text-white p-3 text-center font-semibold">
              ⚠️ {apiError}
            </div>
          )}
          <Switch>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/admin/login" component={LoginPage} />
            <Route path="/">
              <RoleBasedRouter />
            </Route>
          </Switch>
        </div>
      </LocationProvider>
    </CartProvider>
  );
};

export default AdminApp;
