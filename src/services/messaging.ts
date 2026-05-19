import { getMessaging, getToken, onMessage, deleteToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import app from '../lib/firebase';
import { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

let currentToken: string | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

const initMessaging = async () => {
  if (Capacitor.isNativePlatform()) return null; // Use native push on mobile
  if (messaging) return messaging;
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
};

export const getFCMToken = async (): Promise<string | null> => {
  const msg = await initMessaging();
  if (!msg) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('🔔 [FCM] Notification permission not granted:', permission);
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('🔔 [FCM] Service Worker registered');

    await navigator.serviceWorker.ready;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('🔔 [FCM] Token obtained:', token.substring(0, 20) + '...');
      currentToken = token;
      await saveFCMTokenToFirestore(token);
    } else {
      console.error('🔔 [FCM] Failed to get token');
    }

    return token;
  } catch (error) {
    console.error('🔔 [FCM] Error getting token:', error);
    return null;
  }
};

export const saveFCMTokenToFirestore = async (token: string): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  try {
    console.log('🔔 [FCM] Saving token to Firestore for user:', user.uid);
    
    // Save token to subcollection (required for Cloud Functions)
    await setDoc(
      doc(db, `users/${user.uid}/tokens/${token}`),
      {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Update user doc with fcmToken + preferences
    // (notifications-v2.js reads userData.fcmToken & notificationsEnabled)
    await setDoc(
      doc(db, 'users', user.uid),
      {
        fcmToken: token,
        notificationsEnabled: true,
        pushOptIn: true,
        subscribePromotions: true,
        subscribeStories: true,
        lastTokenUpdate: serverTimestamp()
      },
      { merge: true }
    );
    
    console.log('🔔 [FCM] Token saved to subcollection successfully');
  } catch (error) {
    console.error('🔔 [FCM] Error saving token:', error);
  }
};

export const refreshFCMToken = async (): Promise<string | null> => {
  const msg = await initMessaging();
  if (!msg) return null;

  try {
    if (currentToken) {
      await deleteToken(msg);
      currentToken = null;
    }

    return await getFCMToken();
  } catch {
    return await getFCMToken();
  }
};

export const setupForegroundMessaging = async (): Promise<(() => void) | null> => {
  const msg = await initMessaging();
  if (!msg) return null;

  console.log('🔔 [FCM] Setting up foreground message listener');

  const unsubscribe = onMessage(msg, (payload) => {
    console.log('🔔 [FCM] Foreground message received:', payload);
    
    const { notification, data } = payload;

    if (!notification) {
      console.warn('🔔 [FCM] No notification in payload');
      return;
    }

    const title = notification.title || 'Royalty Coffee';
    const body = notification.body || '';
    const icon = notification.icon || '/icon-192x192.png';
    const badge = '/coffeeaddict.jpg';
    const tag = data?.tag || 'default';
    const requireInteraction = true;

    console.log('🔔 [FCM] Showing notification:', { title, body });

    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon,
        badge,
        tag,
        requireInteraction,
        data: data || {}
      });

      notif.onclick = () => {
        console.log('🔔 [FCM] Notification clicked');
        if (data?.url || data?.deeplink) {
          const url = data.url || data.deeplink;
          window.location.href = url;
        }
        notif.close();
      };
    } else {
      console.warn('🔔 [FCM] Notification permission not granted or not supported');
    }
  });

  return unsubscribe;
};

export const initializeFCM = async (): Promise<void> => {
  const auth = getAuth();
  if (!auth.currentUser) return;

  await getFCMToken();
  
  // Setup foreground message handler
  const unsubscribe = await setupForegroundMessaging();
  
  // Store unsubscribe function globally if needed for cleanup
  if (unsubscribe && typeof window !== 'undefined') {
    (window as Window & { __fcmUnsubscribe?: () => void }).__fcmUnsubscribe = unsubscribe;
  }
};

export const getCurrentToken = (): string | null => currentToken;
