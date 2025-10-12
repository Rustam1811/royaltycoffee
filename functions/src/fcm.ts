import * as admin from 'firebase-admin';
import type { MulticastMessage, BatchResponse } from 'firebase-admin/messaging';

// Use global admin instance (initialized in index.ts)
const getFirestore = () => admin.firestore();
const getMessaging = () => admin.messaging();

interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  deeplink?: string;
  [key: string]: string | undefined;
}

interface SendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

/**
 * Get all FCM tokens for a user
 * Filters out expired/invalid tokens
 */
export async function getUserTokens(uid: string): Promise<string[]> {
  const db = getFirestore();
  const tokensSnapshot = await db.collection(`users/${uid}/tokens`).get();
  
  if (tokensSnapshot.empty) {
    return [];
  }

  return tokensSnapshot.docs.map(doc => doc.id);
}

/**
 * Get tokens for all users subscribed to a specific topic
 * @param topic - Either 'promotions' or 'stories'
 * @param closeFriendsOnly - If true, only send to users marked as close friends
 */
export async function getSubscribedTokens(
  topic: 'promotions' | 'stories',
  closeFriendsOnly = false
): Promise<string[]> {
  const db = getFirestore();
  const fieldName = topic === 'promotions' ? 'subscribePromotions' : 'subscribeStories';
  
  let query = db.collection('users')
    .where('pushOptIn', '==', true)
    .where(fieldName, '==', true);

  // Filter by close friends if needed
  if (closeFriendsOnly) {
    query = query.where('isCloseFriend', '==', true);
  }

  const usersSnapshot = await query.get();

  if (usersSnapshot.empty) {
    return [];
  }

  // Collect all tokens from subscribed users
  const allTokens: string[] = [];
  
  for (const userDoc of usersSnapshot.docs) {
    const tokensSnapshot = await db.collection(`users/${userDoc.id}/tokens`).get();
    tokensSnapshot.docs.forEach(tokenDoc => {
      allTokens.push(tokenDoc.id);
    });
  }

  return allTokens;
}

/**
 * Send notification to a specific user
 */
export async function sendToUser(
  uid: string,
  payload: NotificationPayload
): Promise<SendResult> {
  const tokens = await getUserTokens(uid);
  
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  return sendMulticast(tokens, payload);
}

/**
 * Send notification to all users subscribed to a topic
 * @param topic - Either 'promotions' or 'stories'
 * @param payload - Notification content
 * @param closeFriendsOnly - If true, only send to close friends
 */
export async function sendToAllSubscribed(
  topic: 'promotions' | 'stories',
  payload: NotificationPayload,
  closeFriendsOnly = false
): Promise<SendResult> {
  const tokens = await getSubscribedTokens(topic, closeFriendsOnly);
  
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Send in batches of 500 (FCM limit)
  const batchSize = 500;
  const results: SendResult[] = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const result = await sendMulticast(batch, payload);
    results.push(result);
  }

  // Aggregate results
  return results.reduce(
    (acc, result) => ({
      successCount: acc.successCount + result.successCount,
      failureCount: acc.failureCount + result.failureCount,
      invalidTokens: [...acc.invalidTokens, ...result.invalidTokens]
    }),
    { successCount: 0, failureCount: 0, invalidTokens: [] }
  );
}

/**
 * Send multicast message with retry logic
 */
export async function sendMulticast(
  tokens: string[],
  payload: NotificationPayload,
  retries = 3
): Promise<SendResult> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const messaging = getMessaging();
  
  // Build message
  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      type: payload.type,
      ...(payload.deeplink && { deeplink: payload.deeplink }),
      ...Object.keys(payload).reduce((acc, key) => {
        if (!['title', 'body', 'type', 'deeplink'].includes(key) && payload[key]) {
          acc[key] = payload[key] as string;
        }
        return acc;
      }, {} as Record<string, string>)
    },
    webpush: {
      notification: {
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        requireInteraction: true,
        vibrate: [200, 100, 200], // Vibration pattern
        tag: payload.type, // Group notifications by type
        renotify: true
      },
      fcmOptions: {
        link: payload.deeplink || '/'
      }
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        priority: 'max',
        channelId: 'default',
        defaultVibrateTimings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < retries) {
    try {
      const response: BatchResponse = await messaging.sendEachForMulticast(message);
      
      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Remove invalid tokens
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        await cleanupInvalidTokens(invalidTokens);
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens
      };
    } catch (error) {
      lastError = error as Error;
      attempt++;
      
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw new Error(`Failed to send notification after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Clean up invalid tokens from Firestore
 */
async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  const db = getFirestore();
  const batch = db.batch();

  for (const token of tokens) {
    // Find and delete token from all users
    const usersSnapshot = await db.collectionGroup('tokens')
      .where(admin.firestore.FieldPath.documentId(), '==', token)
      .get();

    usersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
  }

  await batch.commit();
}

/**
 * Log notification event to Firestore
 */
export async function logNotification(
  type: string,
  result: SendResult,
  uid?: string
): Promise<void> {
  const db = getFirestore();
  
  await db.collection('notifications_log').add({
    uid: uid || null,
    type,
    ts: admin.firestore.FieldValue.serverTimestamp(),
    tokensCount: result.successCount + result.failureCount,
    successCount: result.successCount,
    failureCount: result.failureCount
  });
}
