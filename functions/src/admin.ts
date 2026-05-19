import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Uses application default credentials in production
 * or service account for local development
 */
export function initializeAdmin(): admin.app.App {
  if (isInitialized) {
    return admin.app();
  }

  try {
    // Check if already initialized (e.g., in Firebase Functions environment)
    if (admin.apps.length > 0) {
      isInitialized = true;
      return admin.app();
    }

    // Initialize with application default credentials
    admin.initializeApp();
    isInitialized = true;

    return admin.app();
  } catch (error) {
    throw new Error(`Failed to initialize Firebase Admin: ${error}`);
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  initializeAdmin();
  return admin.firestore();
}

/**
 * Get Firebase Cloud Messaging instance
 */
export function getMessaging(): admin.messaging.Messaging {
  initializeAdmin();
  return admin.messaging();
}

/**
 * Get Firebase Auth instance
 */
export function getAuth(): admin.auth.Auth {
  initializeAdmin();
  return admin.auth();
}

export const regionEW1 = functions.region('europe-west1');
export const regionUS = functions.region('us-central1');

export { admin };
