import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = (k: string) => (import.meta.env[k as keyof ImportMetaEnv] ?? "").toString().trim();

const config = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};

const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error("Missing Firebase configuration:", missing.join(", "));
  console.warn("Workshop will run in demo mode without authentication");
}

const app: FirebaseApp = getApps()[0] ?? initializeApp(config);

// On iOS Capacitor (capacitor:// scheme), IndexedDB hangs forever —
// onIdTokenChanged never fires → 15s timeout → redirect to login.
// Fix: use initializeAuth with explicit browserLocalPersistence (same as main app).
// Android uses https: scheme so IndexedDB works fine there.
const isNative = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
const auth = isNative
  ? initializeAuth(app, { persistence: browserLocalPersistence })
  : getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);

export { app, auth, db, storage };
