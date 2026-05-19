import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FbUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Build allowlist from env; support wildcard '*'; can be overridden at runtime using localStorage 'admin_allow_emails'
let ALLOWED = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

try {
  const overrideRaw = localStorage.getItem('admin_allow_emails');
  if (overrideRaw) {
    const o = overrideRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (o.length) {
      console.warn('[RequireAuth] Using override allowlist from localStorage (admin_allow_emails):', o);
      ALLOWED = o;
    }
  }
} catch {
  // ignore storage errors (Safari private, etc.)
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: FbUser | null; emailAllowed: boolean }>({ 
    loading: true, 
    user: null, 
    emailAllowed: false 
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState({ loading: false, user: null, emailAllowed: false });
        return;
      }
      const email = (user.email || '').toLowerCase();
      // ВРЕМЕННО: разрешаем всех авторизованных пользователей
      const emailAllowed = true;
      console.log('[RequireAuth] Email allowed (bypass mode):', email);
      setState({ loading: false, user, emailAllowed });
    });
  }, []);

  if (state.loading) {
    return <div className="p-6 text-gray-500">Загрузка…</div>;
  }

  if (!state.user) {
    // Not authenticated - redirect to admin login
    window.location.replace('/admin/login');
    return null;
  }

  if (!state.emailAllowed) {
    // Authenticated but email not in allowlist
    return <div className="p-6">Доступ запрещён (аккаунт не в списке).</div>;
  }

  return <>{children}</>;
}