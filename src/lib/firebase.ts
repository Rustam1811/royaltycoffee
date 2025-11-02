import { initializeApp, getApps, FirebaseApp, FirebaseError } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';

// Web Firebase initialization (Vite env vars prefixed with VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Debug Firebase config in development
if (import.meta.env.DEV) {
  console.log('Firebase config loaded:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING'
  });
}

// Validate Firebase configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase environment variables:', missingKeys);
  console.error('Current config:', firebaseConfig);
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
}

// Safe Firebase initialization with duplicate app handling
let app: FirebaseApp;

const existingApps = getApps();
if (existingApps.length > 0) {
  // Use existing app if available
  console.log('Using existing Firebase app');
  app = existingApps[0];
} else {
  // Initialize new app only if none exists
  try {
    console.log('Initializing new Firebase app');
    app = initializeApp(firebaseConfig);
  } catch (error: unknown) {
    // Handle duplicate app error during development
    if (error instanceof FirebaseError && error.code === 'app/duplicate-app') {
      console.warn('Firebase app already exists, using existing instance');
      app = getApps()[0];
    } else {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (only on client, guard for SSR)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
  }
}

export function getMessagingOrNull(): Messaging | null {
  return messaging;
}

export { messaging };
export default app;
