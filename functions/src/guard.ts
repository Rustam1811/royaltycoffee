import * as admin from 'firebase-admin';

// Use global admin instance (initialized in index.ts)
const getFirestore = () => admin.firestore();

/**
 * Check if a notification was recently sent to prevent duplicates
 * @param uid - User ID
 * @param type - Notification type
 * @param ttlHours - Time to live in hours (default: 24)
 * @returns true if notification should be suppressed
 */
export async function shouldSuppress(
  uid: string,
  type: string,
  ttlHours = 24
): Promise<boolean> {
  const db = getFirestore();
  const suppressRef = db.doc(`users/${uid}/notifications_suppress/${type}`);
  
  const doc = await suppressRef.get();
  
  if (!doc.exists) {
    return false;
  }

  const data = doc.data();
  if (!data || !data.lastSentAt) {
    return false;
  }

  const lastSent = data.lastSentAt.toDate();
  const now = new Date();
  const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastSent < ttlHours;
}

/**
 * Mark notification as sent to prevent duplicates
 * @param uid - User ID
 * @param type - Notification type
 * @param ttlHours - Time to live in hours (default: 24)
 */
export async function markAsSent(
  uid: string,
  type: string,
  ttlHours = 24
): Promise<void> {
  const db = getFirestore();
  const admin = await import('firebase-admin');
  const suppressRef = db.doc(`users/${uid}/notifications_suppress/${type}`);
  
  await suppressRef.set({
    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
    ttlHours
  });
}

/**
 * Clear notification suppression
 * @param uid - User ID
 * @param type - Notification type
 */
export async function clearSuppression(uid: string, type: string): Promise<void> {
  const db = getFirestore();
  const suppressRef = db.doc(`users/${uid}/notifications_suppress/${type}`);
  
  await suppressRef.delete();
}
