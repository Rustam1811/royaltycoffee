import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import PosPage from '@/pages/PosPage';
import RequireAuth from './RequireAuth';

const AdminRoutes: React.FC = () => {
  return (
    <Switch>
      <Route exact path="/admin/pos">
        <RequireAuth>
          <PosPage />
        </RequireAuth>
      </Route>
      <Redirect to="/admin/pos" />
    </Switch>
  );
};

export default AdminRoutes;
