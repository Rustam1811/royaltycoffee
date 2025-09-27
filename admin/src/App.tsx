import React, { useEffect, useState } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import ResponsiveAdminRoutes from "@/routes/ResponsiveAdminRoutes";
import RequireAuth from "@/routes/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import { api } from "@/services/api";
import "./theme/tokens.css";
import "./index.css";

const AdminApp: React.FC = () => {
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const result = await api.get('/ping');
        console.info('[API HEALTH]', result);
      } catch (error) {
        if (error instanceof Error && error.message === 'NON_JSON_RESPONSE') {
          setApiError('API returns HTML. Check Vercel rewrites.');
          console.error('[API HEALTH] NON_JSON_RESPONSE detected');
        }
      }
    };
    
    checkApiHealth();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-['Manrope']">
      {apiError && (
        <div className="bg-red-500 text-white p-3 text-center font-semibold">
          ⚠️ {apiError}
        </div>
      )}
      <Switch>
        <Route exact path="/login" component={LoginPage} />
        <Route path="/admin">
          <RequireAuth>
            <ResponsiveAdminRoutes />
          </RequireAuth>
        </Route>
        <Redirect to="/login" />
      </Switch>
    </div>
  );
};

export default AdminApp;
