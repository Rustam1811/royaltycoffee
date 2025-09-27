import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ALLOWED = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: any; emailAllowed: boolean }>({ 
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
      const emailAllowed = ALLOWED.length ? ALLOWED.includes(email) : true;
      setState({ loading: false, user, emailAllowed });
    });
  }, []);

  if (state.loading) {
    return <div className="p-6 text-gray-500">Загрузка…</div>;
  }

  if (!state.user) {
    // Not authenticated - redirect to login
    window.location.replace('/login');
    return null;
  }

  if (!state.emailAllowed) {
    // Authenticated but email not in allowlist
    return <div className="p-6">Доступ запрещён (аккаунт не в списке).</div>;
  }

  return <>{children}</>;
}