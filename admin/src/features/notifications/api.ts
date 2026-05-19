import { getMessagingOrNull } from '@/lib/firebase';
import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export interface NotificationPreferences {
  pushOptIn: boolean;
  subscribePromotions?: boolean;
  subscribeStories?: boolean;
}

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string;

if (!VAPID_KEY) {
  console.error('VITE_FCM_VAPID_KEY is not set in environment');
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function getFCMToken(): Promise<string | null> {
  const messaging = getMessagingOrNull();
  
  if (!messaging) {
    console.error('Messaging not initialized');
    return null;
  }

  if (!VAPID_KEY) {
    console.error('VAPID key not configured');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export async function saveToken(uid: string, token: string): Promise<void> {
  const tokenRef = doc(db, `users/${uid}/tokens/${token}`);
  
  await setDoc(tokenRef, {
    createdAt: new Date(),
    updatedAt: new Date(),
    userAgent: navigator.userAgent,
    platform: navigator.platform
  }, { merge: true });
}

export async function setUserPushPrefs(
  uid: string,
  prefs: NotificationPreferences
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  
  await updateDoc(userRef, {
    pushOptIn: prefs.pushOptIn,
    ...(prefs.subscribePromotions !== undefined && { subscribePromotions: prefs.subscribePromotions }),
    ...(prefs.subscribeStories !== undefined && { subscribeStories: prefs.subscribeStories })
  });
}

export async function enableNotifications(
  uid: string,
  preferences?: Partial<NotificationPreferences>
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission denied'
      };
    }

    const token = await getFCMToken();
    
    if (!token) {
      return {
        success: false,
        error: 'Failed to get FCM token'
      };
    }

    await saveToken(uid, token);

    await setUserPushPrefs(uid, {
      pushOptIn: true,
      subscribePromotions: preferences?.subscribePromotions ?? true,
      subscribeStories: preferences?.subscribeStories ?? true
    });

    return {
      success: true,
      token
    };
  } catch (error) {
    console.error('Error enabling notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function listenToForegroundMessages(
  onMessageReceived: (payload: MessagePayload) => void
): (() => void) | null {
  const messaging = getMessagingOrNull();
  
  if (!messaging) {
    return null;
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    onMessageReceived(payload);
  });

  return unsubscribe;
}

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  const audio = new Audio('/notify.mp3');
  audio.volume = 0.5;
  
  audio.play().catch((error) => {
    console.warn('Could not play notification sound (user gesture required):', error);
  });
}

export function showForegroundNotification(payload: MessagePayload): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = payload.notification?.title || 'Новое уведомление';
  const options: NotificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.type || 'general',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: payload.data
  };

  playNotificationSound();

  new Notification(title, options);
}
