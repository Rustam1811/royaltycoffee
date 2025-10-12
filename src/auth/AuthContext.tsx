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
  getIdTokenResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PhoneInputModal } from '../components/PhoneInputModal';

type AppUser = {
  uid: string;
  email: string;
  name?: string;
  avatar?: string;
  phone?: string;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  needsPhone: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  savePhone: (phone: string) => Promise<void>;
  updateProfile: (data: { name: string; phone: string; avatar?: string }) => Promise<void>;
  showPhoneInput: () => void;
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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);

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
          // Получаем роль из custom claims Firebase ID токена
          const tokenResult = await getIdTokenResult(u);
          const claimRole = (tokenResult.claims?.role as 'admin'|'user'|undefined) ?? 'user';
          
          // Создаем объект пользователя
          const appUser = fbUserToAppUser(u);
          if (appUser) {
            appUser.role = claimRole;
            
              // Проверяем наличие телефона в Firestore
              try {
                const userDoc = await getDoc(doc(db, 'users', u.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  appUser.phone = userData.phone;
                  appUser.name = userData.name || appUser.name;
                  appUser.avatar = userData.avatar || appUser.avatar;
                  
                  // Начисляем отложенные бонусы при авторизации
                  if (appUser.phone) {
                    try {
                      await fetch('/api/bonus/claim-pending', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: u.uid, phone: appUser.phone })
                      });
                    } catch (bonusError) {
                      // Не прерываем авторизацию если начисление бонусов не удалось
                    }
                  }
                }
                
                // НЕ показываем модал автоматически
                // Модал будет показан только при попытке оформить заказ без телефона
                setNeedsPhone(!appUser.phone && appUser.role === 'user');
              } catch (firestoreError) {
                console.warn('Error fetching user data from Firestore:', firestoreError);
                setNeedsPhone(appUser.role === 'user');
              }            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
          }
          
        } catch (error) {
          console.error('Error getting user claims:', error);
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

  const savePhone = async (phone: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Сохраняем в Firestore с merge:true
      await setDoc(doc(db, 'users', user.uid), {
        phone,
        name: user.name || '',
        email: user.email,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Обновляем локальное состояние
      const updatedUser = { ...user, phone };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setNeedsPhone(false);
      setShowPhoneModal(false);
    } catch (error) {
      console.error('Error saving phone:', error);
      throw error;
    }
  };

  const updateProfile = async (data: { name: string; phone: string; avatar?: string }) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Обновляем в Firestore
      const updateData: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        email: user.email,
        updatedAt: serverTimestamp(),
      };
      
      if (data.avatar) {
        updateData.avatar = data.avatar;
      }
      
      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });

      // Обновляем локальное состояние
      const updatedUser: AppUser = { 
        ...user, 
        name: data.name,
        phone: data.phone,
        ...(data.avatar && { avatar: data.avatar })
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setNeedsPhone(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const showPhoneInput = () => {
    setShowPhoneModal(true);
  };

  const value: AuthContextType = {
    user,
    loading,
    needsPhone,
    loginWithGoogle,
    loginWithApple,
    signOut,
    savePhone,
    updateProfile,
    showPhoneInput,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PhoneInputModal
        isOpen={showPhoneModal}
        onClose={() => {
          // Не разрешаем закрыть модал пока не введен телефон
          if (user?.role !== 'admin') {
            // Для обычных пользователей модал обязателен
            return;
          }
          setShowPhoneModal(false);
        }}
        onSubmit={savePhone}
        userName={user?.name}
      />
    </AuthContext.Provider>
  );
};
