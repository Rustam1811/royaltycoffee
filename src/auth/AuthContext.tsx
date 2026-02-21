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
  signInWithEmailAndPassword,
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
  role: 'user' | 'admin' | 'owner' | 'barista' | 'courier' | 'workshop_admin' | 'workshop_client' | 'workshop_owner' | 'superowner';
  locationId?: string;
  workshopId?: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  needsPhone: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, phone: string) => Promise<void>;
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
// Constants - Valid roles from Firebase Custom Claims
// ———————————————————————————————————————————————
const VALID_ROLES: AppUser['role'][] = [
  'superowner',
  'owner',
  'admin',
  'barista',
  'courier',
  'workshop_owner',
  'workshop_admin',
  'workshop_client',
  'user'
];

// ———————————————————————————————————————————————
// Helpers
// ———————————————————————————————————————————————
const isValidRole = (role: unknown): role is AppUser['role'] => {
  return typeof role === 'string' && VALID_ROLES.includes(role as AppUser['role']);
};

const fbUserToAppUser = (u: FbUser | null): AppUser | null => {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email || '',
    name: u.displayName || undefined,
    avatar: u.photoURL || undefined,
    role: 'user', // будет обновлено из claims
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
          // Получаем роль из custom claims Firebase ID токена (force refresh для свежих claims)
          const tokenResult = await getIdTokenResult(u, true);
          const claims = tokenResult.claims;
          
          // Валидируем роль из claims
          const rawRole = claims?.role;
          const claimRole = isValidRole(rawRole) ? rawRole : 'user';
          const locationId = typeof claims?.locationId === 'string' ? claims.locationId : undefined;
          const workshopId = typeof claims?.workshopId === 'string' ? claims.workshopId : undefined;
          
          // Создаем объект пользователя
          const appUser = fbUserToAppUser(u);
          if (appUser) {
            appUser.role = claimRole;
            appUser.locationId = locationId;
            appUser.workshopId = workshopId;
            
            // Сразу устанавливаем пользователя для быстрой загрузки UI
            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
            setLoading(false); // Разблокируем UI раньше
            
            // Загружаем дополнительные данные асинхронно (не блокируем UI)
            (async () => {
              try {
                const userDoc = await getDoc(doc(db, 'users', u.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  appUser.phone = userData.phone;
                  appUser.name = userData.name || appUser.name;
                  appUser.avatar = userData.avatar || appUser.avatar;
                  
                  // Обновляем состояние с полными данными
                  setUser({ ...appUser });
                  localStorage.setItem('user', JSON.stringify(appUser));
                  
                  // Начисляем отложенные бонусы в фоне
                  if (appUser.phone) {
                    fetch('/api/bonus/claim-pending', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: u.uid, phone: appUser.phone })
                    }).catch(() => {/* ignore */});
                  }
                }
                
                setNeedsPhone(!appUser.phone && appUser.role === 'user');
              } catch (firestoreError) {
                console.warn('Error fetching user data from Firestore:', firestoreError);
                setNeedsPhone(appUser.role === 'user');
              }
            })();
          }
          
        } catch (error) {
          console.error('Error getting user claims:', error);
          const appUser = fbUserToAppUser(u);
          setUser(appUser);
          if (appUser) localStorage.setItem('user', JSON.stringify(appUser));
          setLoading(false);
        }
      } else {
        // Проверяем телефонную авторизацию из localStorage
        const savedToken = localStorage.getItem('auth_token');
        const savedPhone = localStorage.getItem('auth_phone');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedPhone && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser) as AppUser;
            // Проверяем что это телефонный пользователь
            if (parsedUser.uid.startsWith('phone_')) {
              setUser(parsedUser);
              setNeedsPhone(false);
            } else {
              // Firebase user вышел, очищаем всё
              setUser(null);
              localStorage.removeItem('user');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_phone');
            }
          } catch {
            setUser(null);
            localStorage.removeItem('user');
          }
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
        setLoading(false);
      }
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

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged будет вызван автоматически
    } catch (error: unknown) {
      console.error('Email auth error:', error);
      // Преобразуем Firebase ошибки в понятные сообщения
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = 'Ошибка входа';
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          errorMessage = 'Пользователь не найден';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Неверный пароль';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Неверный формат email';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Слишком много попыток. Попробуйте позже';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Неверный email или пароль';
          break;
        default:
          errorMessage = firebaseError.message || 'Ошибка входа';
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (token: string, phone: string) => {
    setLoading(true);
    try {
      // Сохраняем JWT токен для API запросов
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_phone', phone);

      // Создаем пользователя на основе телефона
      // Для полноценной интеграции нужен Firebase Custom Token
      // Пока создаем локального пользователя
      const phoneUser: AppUser = {
        uid: `phone_${phone.replace(/\D/g, '')}`,
        email: '',
        phone: phone,
        role: 'user',
      };

      // Создаем/обновляем документ в Firestore
      try {
        await setDoc(doc(db, 'users', phoneUser.uid), {
          phone: phone,
          authMethod: 'whatsapp',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (firestoreError) {
        console.warn('Could not save to Firestore:', firestoreError);
      }

      setUser(phoneUser);
      localStorage.setItem('user', JSON.stringify(phoneUser));
      setNeedsPhone(false);
    } catch (error) {
      console.error('Token auth error:', error);
      throw new Error('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_phone');
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
    loginWithEmail,
    loginWithToken,
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
