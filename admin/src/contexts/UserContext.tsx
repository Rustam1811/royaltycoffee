import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from "react";
import {
  getAuth,
  onAuthStateChanged,
  getIdTokenResult,
  signOut,
} from "firebase/auth";
import app from "@/lib/firebase";

export interface User {
  uid: string;
  email: string | null;
  role: "owner" | "admin" | "user";
}

interface Context {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const UserContext = createContext<Context>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 UserContext: инициализация...');
    
    // Сначала проверяем localStorage
    const testUser = localStorage.getItem('admin_user');
    console.log('🔐 UserContext: проверка localStorage', { testUser: testUser ? 'найден' : 'не найден' });
    
    if (testUser) {
      try {
        const parsedUser = JSON.parse(testUser);
        console.log('🔐 UserContext: найден тестовый пользователь:', parsedUser);
        setUser({
          uid: parsedUser.uid,
          email: parsedUser.email,
          role: parsedUser.role
        });
        setLoading(false);
        return;
      } catch (e) {
        console.error('❌ UserContext: ошибка парсинга тестового пользователя:', e);
        localStorage.removeItem('admin_user'); // Удаляем поврежденные данные
      }
    }
    
    // Если нет тестового пользователя, проверяем Firebase
    try {
      if (!app) {
        console.error('❌ UserContext: Firebase app не инициализирован!');
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('🔐 UserContext: Firebase app найден');
      const auth = getAuth(app);
      console.log('🔐 UserContext: Firebase Auth получен');
      
      const unsub = onAuthStateChanged(auth, async u => {
        console.log('🔐 UserContext: onAuthStateChanged вызван', { user: u ? 'есть' : 'нет' });
        
        if (u) {
          console.log('🔐 UserContext: пользователь авторизован в Firebase');
          try {
            const tokenRes = await getIdTokenResult(u, true);
            const role = (tokenRes.claims.role as User["role"]) || "user";
            console.log('🔐 UserContext: роль пользователя:', role);
            setUser({ uid: u.uid, email: u.email, role });
          } catch (error) {
            console.error('❌ UserContext: ошибка получения токена:', error);
            setUser({ uid: u.uid, email: u.email, role: "user" });
          }
        } else {
          console.log('🔐 UserContext: пользователь не авторизован в Firebase');
          setUser(null);
        }
        setLoading(false);
      });
      
      return () => {
        console.log('🔐 UserContext: отписка от onAuthStateChanged');
        unsub();
      };
    } catch (error) {
      console.error('❌ UserContext: ошибка инициализации Firebase:', error);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    // Также удаляем тестового пользователя
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};
