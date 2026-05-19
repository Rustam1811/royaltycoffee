import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onIdTokenChanged, getIdTokenResult, signOut, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { WorkshopRole, WorkshopUser } from "@/types";

interface UserContextType {
  user: WorkshopUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

// Allowlist для ролей (можно заменить на серверную проверку)
const SUPEROWNER_EMAILS = ["rustam.mukaev@gmail.com", "superowner121@royal.com"];
const WORKSHOP_OWNER_EMAILS = ["workshop.owner@royal.com"];
const WORKSHOP_ADMIN_EMAILS = ["workshop.admin@royal.com"];
// Остальные email будут workshop_client

function resolveRole(email: string | null, claims: Record<string, unknown>): WorkshopRole {
  if (!email) return 'workshop_client';
  
  const normalizedEmail = email.trim().toLowerCase();
  
  // Сначала проверяем claims
  const claimRole = String(claims?.workshopRole || claims?.role || '').toLowerCase();
  if (claimRole === 'superowner') return 'superowner';
  if (claimRole === 'workshop_owner') return 'workshop_owner';
  if (claimRole === 'workshop_admin') return 'workshop_admin';
  if (claimRole === 'workshop_client') return 'workshop_client';
  
  // Затем allowlist
  if (SUPEROWNER_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) return 'superowner';
  if (WORKSHOP_OWNER_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) return 'workshop_owner';
  if (WORKSHOP_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) return 'workshop_admin';
  
  return 'workshop_client';
}

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем имитацию роли через query params
    const params = new URLSearchParams(window.location.search);
    const impersonate = params.get("impersonate")?.toLowerCase();
    
    if (impersonate && ['superowner', 'workshop_owner', 'workshop_admin', 'workshop_client'].includes(impersonate)) {
      const fakeUser: WorkshopUser = {
        uid: `impersonated-${impersonate}`,
        email: `impersonated+${impersonate}@local.test`,
        role: impersonate as WorkshopRole,
        clientId: impersonate === 'workshop_client' ? 'test-client-id' : undefined,
        companyName: impersonate === 'workshop_client' ? 'Тестовая компания' : undefined,
      };
      setUser(fakeUser);
      setLoading(false);
      return;
    }

    // Проверяем localStorage (для разработки)
    const stored = localStorage.getItem("workshop_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.uid && parsed?.role) {
          setUser(parsed as WorkshopUser);
          setLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem("workshop_user");
      }
    }

    // Firebase auth listener with timeout
    console.log('[Workshop] Auth init at', new Date().toISOString());
    
    // On Capacitor iOS with browserLocalPersistence, auth.currentUser is available synchronously
    // before onIdTokenChanged fires. Check it immediately to avoid showing login flash.
    const currentUser = auth.currentUser;
    console.log('[Workshop] Immediate auth.currentUser:', currentUser?.uid ?? 'null');

    let timeoutMs = 15000;
    const timeoutId = setTimeout(() => {
      console.warn('[Workshop] Auth timeout - no response in', timeoutMs, 'ms');
      setLoading(false);
      setUser(null);
    }, timeoutMs);

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('[Workshop] Auth state change:', firebaseUser?.uid || 'null', firebaseUser?.email);
      clearTimeout(timeoutId);
      
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        console.log('[Workshop] Getting token result...');
        const tokenResult = await getIdTokenResult(firebaseUser, false);
        const role = resolveRole(firebaseUser.email, tokenResult.claims as Record<string, unknown>);
        console.log('[Workshop] Role resolved:', role);
        
        const workshopUser: WorkshopUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role,
          clientId: tokenResult.claims.clientId as string | undefined,
          companyName: tokenResult.claims.companyName as string | undefined,
        };
        
        setUser(workshopUser);
        console.log('[Workshop] User set successfully');
      } catch (error) {
        console.error("[Workshop] Error getting token:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    localStorage.removeItem("workshop_user");
    await signOut(auth);
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
export { UserContext };
