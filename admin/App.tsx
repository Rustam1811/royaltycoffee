import React from "react";
import AdminRoutes from "./routes/AdminRoutes";
import "./theme/tokens.css";
import "./index.css";

import { UserProvider } from "./contexts/UserContext";

const AdminApp: React.FC = () => {
  return (
    <UserProvider>
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-['Manrope']">
        <AdminRoutes />
      </div>
    </UserProvider>
  );
};

export default AdminApp;
