import React, { useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';

interface DevOverlayProps {
  apiStatus?: 'ok' | 'error' | 'loading';
  lastFetch?: string;
  apiError?: string;
}

export default function DevOverlay({ apiStatus = 'loading', lastFetch, apiError }: DevOverlayProps) {
  const { user, loading: authLoading } = useContext(UserContext);

  if (import.meta.env.PROD) return null; // Only show in dev

  const statusColor = {
    ok: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    loading: 'bg-yellow-100 text-yellow-800'
  }[apiStatus];

  return (
    <div className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs font-mono max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <span className="font-semibold">Dev Info</span>
      </div>
      
      <div className="space-y-1 text-slate-600">
        <div>
          <span className="text-slate-400">Auth:</span> {authLoading ? 'loading...' : (user ? `${user.role} (${user.email?.slice(0, 20)}...)` : 'none')}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-400">API:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${statusColor}`}>
            {apiStatus}
          </span>
        </div>
        
        {lastFetch && (
          <div>
            <span className="text-slate-400">Last:</span> {lastFetch}
          </div>
        )}
        
        {apiError && (
          <div className="text-red-600 text-[10px] truncate" title={apiError}>
            {apiError}
          </div>
        )}
      </div>
    </div>
  );
}