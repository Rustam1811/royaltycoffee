/**
 * Capacitor Push Notifications Bridge
 *
 * On native (iOS / Android) — uses @capacitor/push-notifications
 * On web — falls back to existing FCM-based messaging.ts
 *
 * This module unifies the push notification flow so the same
 * codebase works in PWA, App Store, and Google Play.
 */

import { Capacitor } from '@capacitor/core';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

/**
 * Check if running as a native Capacitor app (not web)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize push notifications based on platform.
 * - Native (iOS/Android): Use @capacitor/push-notifications + APNs/FCM native
 * - Web: Use existing firebase/messaging (messaging.ts)
 */
export async function initPushNotifications(): Promise<void> {
  if (isNativePlatform()) {
    await initNativePush();
  } else {
    // Web — delegate to existing FCM implementation
    const { initializeFCM } = await import('./messaging');
    await initializeFCM();
  }
}

/**
 * Native push notifications via Capacitor
 */
async function initNativePush(): Promise<void> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('🔔 [Native Push] Permission not granted:', permResult.receive);
      return;
    }

    // Register with APNs / FCM
    await PushNotifications.register();

    // Listen for registration success — gives us the native FCM token
    PushNotifications.addListener('registration', async (token) => {
      console.log('🔔 [Native Push] Token:', token.value.substring(0, 20) + '...');
      await saveNativeTokenToFirestore(token.value);
    });

    // Listen for registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('🔔 [Native Push] Registration error:', error);
    });

    // Foreground notification received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔔 [Native Push] Foreground notification:', notification);
      // The system shows the notification via presentationOptions in config
    });

    // User tapped on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('🔔 [Native Push] Action performed:', action);
      const data = action.notification.data;

      // Navigate based on deeplink
      if (data?.deeplink) {
        window.location.href = data.deeplink;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    });
  } catch (error) {
    console.error('🔔 [Native Push] Init failed:', error);
  }
}

/**
 * Save native FCM token to Firestore (same structure as web tokens)
 */
async function saveNativeTokenToFirestore(token: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Save to subcollection (for triggers.ts / fcm.ts)
    await setDoc(
      doc(db, `users/${user.uid}/tokens/${token}`),
      {
        platform: Capacitor.getPlatform(), // 'ios' | 'android'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also save to user doc (for notifications-v2.js compat)
    await setDoc(
      doc(db, 'users', user.uid),
      {
        fcmToken: token,
        notificationsEnabled: true,
        pushOptIn: true,
        subscribePromotions: true,
        subscribeStories: true,
        lastTokenUpdate: serverTimestamp(),
        nativePlatform: Capacitor.getPlatform(),
      },
      { merge: true }
    );

    console.log('🔔 [Native Push] Token saved to Firestore');
  } catch (error) {
    console.error('🔔 [Native Push] Error saving token:', error);
  }
}
