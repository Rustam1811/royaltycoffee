import { initializeApp, getApps, FirebaseApp, FirebaseError } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
}

let app: FirebaseApp;
const existingApps = getApps();
if (existingApps.length > 0) {
  app = existingApps[0];
} else {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error: unknown) {
    if (error instanceof FirebaseError && error.code === 'app/duplicate-app') {
      app = getApps()[0];
    } else {
      throw error;
    }
  }
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
