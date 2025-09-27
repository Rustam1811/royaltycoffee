import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = (k: string) => (import.meta.env[k] ?? "").toString().trim();
const config = {
  apiKey: env("VITE_API_KEY"),
  authDomain: env("VITE_AUTH_DOMAIN"),
  projectId: env("VITE_PROJECT_ID"),
  storageBucket: env("VITE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_MESSAGING_SENDER_ID"),
  appId: env("VITE_APP_ID"),
};
const missing = Object.entries(config).filter(([,v]) => !v).map(([k]) => k);
if (missing.length) throw new Error("Missing Firebase configuration: " + missing.join(", "));

let app: FirebaseApp = getApps()[0] ?? initializeApp(config);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
