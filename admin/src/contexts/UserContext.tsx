import React, { createContext, useEffect, useState, ReactNode, FC } from "react";
import { onIdTokenChanged, getIdTokenResult, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type Role = "owner" | "admin" | "barista" | "user";
export interface User { uid: string; email: string | null; role: Role; }
interface Ctx { user: User | null; loading: boolean; logout: () => Promise<void>; }

export const UserContext = createContext<Ctx>({ user: null, loading: true, logout: async () => {} });

/** === НАСТРОЙКА ALLOWLIST (заполни своими адресами) === */
const ADMIN_EMAILS   = ["admin121@gmail.com", "admin@mail.com"];
const BARISTA_EMAILS = ["barista121@gmail.com"];
const OWNER_EMAILS   = ["owner121@gmail.com"];

/** normalize helper */
const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

/** resolve role by email allowlist */
function roleFromEmail(email: string): Role {
  if (!email) return "user";
  if (OWNER_EMAILS.map(norm).includes(norm(email))) return "owner";
  if (ADMIN_EMAILS.map(norm).includes(norm(email))) return "admin";
  if (BARISTA_EMAILS.map(norm).includes(norm(email))) return "barista";
  return "user";
}

/** try custom claims → allowlist → default */
function resolveRoleFromClaimsAndEmail(claims: any, email: string | null): Role {
  // 1) кастом-клейм single 'role'
  const ccRole = String(claims?.role || "").trim().toLowerCase();
  if (ccRole === "owner" || ccRole === "admin" || ccRole === "barista" || ccRole === "user") {
    return ccRole as Role;
  }
  // 2) альтернативные клеймы (булевые)
  if (claims?.owner === true)   return "owner";
  if (claims?.admin === true)   return "admin";
  if (claims?.barista === true) return "barista";
  // 3) allowlist по email
  return roleFromEmail(email ?? "");
}

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 UserContext init");

    // 0) Режим имитации через query (?impersonate=admin|barista|owner)
    const params = new URLSearchParams(window.location.search);
    const impersonate = norm(params.get("impersonate"));
    if (impersonate && ["owner", "admin", "barista"].includes(impersonate)) {
      const fake: User = {
        uid: `impersonated-${impersonate}`,
        email: `impersonated+${impersonate}@local.test`,
        role: impersonate as Role,
      };
      localStorage.setItem("admin_user", JSON.stringify(fake));
      console.warn("⚠️ IMITATION MODE enabled:", fake);
      setUser(fake);
      setLoading(false);
      return;
    }

    // 1) Локальный тестовый пользователь
    const stored = localStorage.getItem("admin_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.uid && parsed?.role) {
          console.warn("⚠️ Using localStorage admin_user:", parsed);
          setUser({ uid: String(parsed.uid), email: parsed.email ?? null, role: parsed.role as Role });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("admin_user parse error:", e);
        localStorage.removeItem("admin_user");
      }
    }

    // 2) Нормальная ветка через Firebase
    if (!auth) {
      console.error("❌ Firebase auth not initialized");
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      console.log("🔐 onIdTokenChanged:", fbUser ? "present" : "null");
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const email = norm(fbUser.email);
        // force refresh to получить свежие клеймы (если только что выставили на бэке)
        const tokenRes = await getIdTokenResult(fbUser, true);
        console.log("🔎 token.claims:", tokenRes.claims);

        let role = resolveRoleFromClaimsAndEmail(tokenRes.claims, email);

        // жёсткая подстраховка: если всё равно user — попробуем allowlist ещё раз
        if (role === "user") {
          const allow = roleFromEmail(email);
          if (allow !== "user") role = allow;
        }

        console.log(`✅ resolved role: ${role} (email=${email || "no-email"})`);
        setUser({ uid: fbUser.uid, email: fbUser.email, role });
      } catch (e) {
        console.error("❌ getIdTokenResult error:", e);
        // вообще край — хоть allowlist отработает
        const email = norm(fbUser.email);
        const role = roleFromEmail(email);
        setUser({ uid: fbUser.uid, email: fbUser.email, role });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log("🔐 unsubscribe onIdTokenChanged");
      unsub();
    };
  }, []);

  const logout = async () => {
    try { 
      await signOut(auth); 
    } catch (error) {
      console.error("Sign out error:", error);
    }
    localStorage.removeItem("admin_user");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};
