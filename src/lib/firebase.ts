import { initializeApp, getApps, FirebaseApp, FirebaseError } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  const error = new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
  logger.error('Firebase configuration incomplete', error, { missingKeys });
  throw error;
}

let app: FirebaseApp;

const existingApps = getApps();
if (existingApps.length > 0) {
  app = existingApps[0];
  logger.debug('Using existing Firebase app');
} else {
  try {
    app = initializeApp(firebaseConfig);
    logger.info('Firebase initialized successfully');
  } catch (error: unknown) {
    if (error instanceof FirebaseError && error.code === 'app/duplicate-app') {
      app = getApps()[0];
      logger.debug('Firebase app already exists, using existing instance');
    } else {
      logger.error('Failed to initialize Firebase', error);
      throw error;
    }
  }
}

// On Capacitor native, IndexedDB on capacitor:// scheme can hang forever,
// so force localStorage persistence. On web, use default (IndexedDB → localStorage fallback).
let auth: Auth;
if (Capacitor.isNativePlatform()) {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  auth = getAuth(app);
}
export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
  // На Capacitor (Android/iOS) Web Push не работает и может крашить старые WebView (Huawei/Xiaomi).
  // Используется только @capacitor/push-notifications.
  isMessagingSupported().then(supported => {
    if (supported) {
      try {
        messaging = getMessaging(app);
        logger.debug('Firebase Messaging initialized');
      } catch (error) {
        logger.warn('Firebase Messaging not available', { error });
      }
    }
  }).catch(() => {
    // Silently ignore — messaging not supported
  });
}

export function getMessagingOrNull(): Messaging | null {
  return messaging;
}

export { messaging };
export default app;
