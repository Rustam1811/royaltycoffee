import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available');
    }
  });
}

const storage = getStorage(app);

export { app, auth, db, storage };
