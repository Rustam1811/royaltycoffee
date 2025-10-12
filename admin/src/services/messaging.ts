import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, auth, db } from '../lib/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

let currentToken: string | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

const initMessaging = () => {
  if (!messaging && typeof window !== 'undefined') {
    try {
      messaging = getMessaging(app);
    } catch {
      return null;
    }
  }
  return messaging;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
};

export const getFCMToken = async (): Promise<string | null> => {
  const msg = initMessaging();
  if (!msg) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    await navigator.serviceWorker.ready;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      currentToken = token;
      await saveFCMTokenToFirestore(token);
    }

    return token;
  } catch {
    return null;
  }
};

const saveFCMTokenToFirestore = async (token: string): Promise<void> => {
  const user = auth.currentUser;

  if (!user) return;

  try {
    await setDoc(
      doc(db, 'users', user.uid, 'tokens', token),
      {
        token,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'users', user.uid),
      {
        pushOptIn: true,
        notificationsEnabled: true,
        lastTokenUpdate: serverTimestamp()
      },
      { merge: true }
    );
  } catch {
    // Silent fail
  }
};

export const refreshFCMToken = async (): Promise<string | null> => {
  const msg = initMessaging();
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

export const setupForegroundMessaging = (): (() => void) | null => {
  const msg = initMessaging();
  if (!msg) return null;

  const unsubscribe = onMessage(msg, (payload) => {
    const { notification, data } = payload;

    if (!notification) return;

    const title = notification.title || 'Coffee Addict';
    const body = notification.body || '';
    const icon = notification.icon || '/icon-192x192.png';
    const badge = '/icon-96x96.png';
    const tag = data?.tag || 'default';
    const requireInteraction = true;

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
        if (data?.url) {
          window.open(data.url, '_blank');
        }
        notif.close();
      };
    }
  });

  return unsubscribe;
};

export const initializeFCM = async (): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  await getFCMToken();
  setupForegroundMessaging();
};

export const getCurrentToken = (): string | null => currentToken;
