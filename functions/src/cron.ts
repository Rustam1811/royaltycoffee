import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendToUser, logNotification } from './fcm';
import { shouldSuppress, markAsSent } from './guard';

// Use global admin instance (initialized in index.ts)
const getFirestore = () => admin.firestore();

/**
 * Daily CRON job to re-engage inactive users
 * Runs at 10:00 AM Asia/Almaty timezone
 * Sends notification to users who haven't ordered in 7+ days
 */
export const reengageInactiveUsers = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('Asia/Almaty')
  .onRun(async () => {
    const db = getFirestore();
    
    // Calculate cutoff date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Find users who:
    // 1. Have push notifications enabled
    // 2. Last ordered more than 7 days ago (or never ordered)
    const usersSnapshot = await db.collection('users')
      .where('pushOptIn', '==', true)
      .get();

    if (usersSnapshot.empty) {
      return null;
    }

    let sentCount = 0;
    let suppressedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check last order date
      const lastOrderAt = userData.lastOrderAt?.toDate();
      
      // Skip if user ordered within last 7 days
      if (lastOrderAt && lastOrderAt > sevenDaysAgo) {
        continue;
      }

      // Check for duplicate notification suppression (48 hours TTL)
      const suppress = await shouldSuppress(userId, 'reengage7d', 48);
      if (suppress) {
        suppressedCount++;
        continue;
      }

      try {
        const payload = {
          title: 'Скучали? ☕',
          body: 'Вернитесь за любимым напитком — акция ждёт внутри.',
          type: 'reengage7d',
          deeplink: '/promotions'
        };

        const result = await sendToUser(userId, payload);
        
        if (result.successCount > 0) {
          // Mark as sent to prevent duplicates for next 48 hours
          await markAsSent(userId, 'reengage7d', 48);
          sentCount++;
          
          await logNotification('reengage_7d', result, userId);
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    return {
      totalUsers: usersSnapshot.size,
      sentCount,
      suppressedCount,
      errorCount
    };
  });

/**
 * Manual trigger for testing re-engagement
 * Can be called via HTTP for testing purposes
 */
export const testReengage = functions.https.onRequest(async (req, res) => {
  // Only allow in development or with admin token
  const authHeader = req.headers.authorization;
  const isAuthorized = authHeader && authHeader.startsWith('Bearer ');
  
  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    res.status(403).send('Unauthorized');
    return;
  }

  const db = getFirestore();
  
  // Get user ID from query parameter
  const userId = req.query.userId as string;
  
  if (!userId) {
    res.status(400).send('Missing userId parameter');
    return;
  }

  // Check if user exists and has push enabled
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    res.status(404).send('User not found');
    return;
  }

  const userData = userDoc.data();
  if (!userData?.pushOptIn) {
    res.status(400).send('User does not have push notifications enabled');
    return;
  }

  const payload = {
    title: 'Скучали? ☕',
    body: 'Вернитесь за любимым напитком — акция ждёт внутри.',
    type: 'reengage7d',
    deeplink: '/promotions'
  };

  const result = await sendToUser(userId, payload);
  await logNotification('test_reengage_7d', result, userId);

  res.json({
    success: true,
    result
  });
});
