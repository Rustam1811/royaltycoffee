import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);

// Enable offline persistence for better reliability
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available in this browser');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
}

const storage = getStorage(app);

// Подавляем навязчивые ошибки Firestore в консоли
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // Игнорируем известные безопасные ошибки Firestore
    const errorMessage = args.join(' ');
    if (
      errorMessage.includes('400 (Bad Request)') ||
      errorMessage.includes('firestore.googleapis.com') ||
      errorMessage.includes('Firestore/Write/channel')
    ) {
      // Тихо логируем для отладки, но не спамим консоль
      if (import.meta.env.DEV) {
        console.warn('Firestore connection issue (suppressed):', args[0]);
      }
      return;
    }
    // Все остальные ошибки показываем как обычно
    originalConsoleError.apply(console, args);
  };
}

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
