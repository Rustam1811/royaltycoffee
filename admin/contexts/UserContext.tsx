// admin/contexts/UserContext.tsx
// Production-level auth context with proper cleanup and error handling

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  FC,
  useRef,
  useCallback,
} from "react";
import {
  getAuth,
  onAuthStateChanged,
  getIdTokenResult,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { app } from "../../src/firebase";

export interface User {
  uid: string;
  email: string | null;
  role: "owner" | "admin" | "user";
}

interface Context {
  user: User | null;
  loading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<Context>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
  refreshUser: async () => {},
});

/**
 * Extracts user role from Firebase auth token
 * Safe extraction with fallback to 'user' role
 */
async function getUserRole(firebaseUser: FirebaseUser): Promise<User["role"]> {
  try {
    const tokenRes = await getIdTokenResult(firebaseUser, true);
    const role = tokenRes.claims.role as User["role"];
    return role || "user";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "user";
  }
}

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  // Refresh user data from Firebase
  const refreshUser = useCallback(async () => {
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      if (isMountedRef.current) {
        setUser(null);
      }
      return;
    }

    try {
      const role = await getUserRole(currentUser);
      if (isMountedRef.current) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          role,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to refresh user");
      if (isMountedRef.current) {
        setError(error);
      }
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    isMountedRef.current = true;
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMountedRef.current) return;

      try {
        if (firebaseUser) {
          const role = await getUserRole(firebaseUser);
          
          if (isMountedRef.current) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role,
            });
            setError(null);
          }
        } else {
          if (isMountedRef.current) {
            setUser(null);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Auth state change error");
        if (isMountedRef.current) {
          setError(error);
          setUser(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    const auth = getAuth(app);
    try {
      await signOut(auth);
      if (isMountedRef.current) {
        setUser(null);
        setError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Logout failed");
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};
