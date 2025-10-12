import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported, Messaging } from "firebase/messaging";

const env = (k: string) => (import.meta.env[k] ?? "").toString().trim();
const config = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};
const missing = Object.entries(config).filter(([,v]) => !v).map(([k]) => k);
if (missing.length) throw new Error("Missing Firebase configuration: " + missing.join(", "));

let app: FirebaseApp = getApps()[0] ?? initializeApp(config);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase Cloud Messaging (только для браузеров, поддерживающих Push API)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export function getMessagingOrNull(): Messaging | null {
  return messaging;
}

export { app, auth, db, storage, messaging };
export default app;
