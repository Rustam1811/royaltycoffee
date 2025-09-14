// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FbUser,
  getIdToken,
} from 'firebase/auth';
import { auth } from '../firebase';
import { apiUrl } from '../config/api';

type AppUser = {
  uid: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ———————————————————————————————————————————————
// Helpers
// ———————————————————————————————————————————————
const fbUserToAppUser = (u: FbUser | null): AppUser | null => {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email || '',
    name: u.displayName || undefined,
    avatar: u.photoURL || undefined,
    role: 'user', // будет обновлено с бэкенда
  };
};

// ———————————————————————————————————————————————
// Provider
// ———————————————————————————————————————————————
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // Redirect authentication completed, onAuthStateChanged will handle the rest
          console.log('Redirect auth completed for user:', result.user.uid);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    // Handle redirect result first
    handleRedirectResult();

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Получаем ID token и отправляем на бэкенд для получения роли
          const idToken = await getIdToken(u);
          const response = await fetch(apiUrl('auth', { action: 'oauth' }), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          if (response.ok) {
            const data = await response.json();
            const appUser = fbUserToAppUser(u);
            if (appUser && data.user) {
              const updatedUser = { ...appUser, role: data.user.role };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } else {
            // Если бэкенд недоступен, используем дефолтную роль
            const appUser = fbUserToAppUser(u);
            setUser(appUser);
            if (appUser) localStorage.setItem('user', JSON.stringify(appUser));
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
          const appUser = fbUserToAppUser(u);
          setUser(appUser);
          if (appUser) localStorage.setItem('user', JSON.stringify(appUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ———————————————————————————————————————————————
  // Public API
  // ———————————————————————————————————————————————
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Try popup first, fallback to redirect if popup fails
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError) {
        console.warn('Popup failed, trying redirect:', popupError);
        // Fallback to redirect method
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка входа через Google';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithApple = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Try popup first, fallback to redirect if popup fails
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError) {
        console.warn('Popup failed, trying redirect:', popupError);
        // Fallback to redirect method
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка входа через Apple';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    loading,
    loginWithGoogle,
    loginWithApple,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
