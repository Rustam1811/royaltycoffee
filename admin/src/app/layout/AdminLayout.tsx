import React from 'react';
import DevOverlay from '@/components/DevOverlay';

type AdminLayoutProps = {
  children: React.ReactNode;
  apiStatus: 'ok' | 'error' | 'loading';
  lastFetch?: string;
  apiError?: string | null;
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, apiStatus, lastFetch, apiError }) => (
  <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-['Manrope']">
    <DevOverlay apiStatus={apiStatus} lastFetch={lastFetch} apiError={apiError || undefined} />

    {apiError && (
      <div className="bg-red-500 text-white p-3 text-center font-semibold">
        �s��,? {apiError}
      </div>
    )}

    {children}
  </div>
);

export default AdminLayout;
