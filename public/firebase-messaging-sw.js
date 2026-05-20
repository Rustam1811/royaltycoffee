importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBBtbHO8K_JgMfcsOW2lZO8RGhL4BJiCRU",
  authDomain: "royal-coffee-b1ce9.firebaseapp.com",
  projectId: "royal-coffee-b1ce9",
  storageBucket: "royal-coffee-b1ce9.firebasestorage.app",
  messagingSenderId: "443047563074",
  appId: "1:443047563074:web:31bfd1e43f509e4d42c2db"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  const notificationTitle = payload.notification?.title || 'Royalty Coffee';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: payload.data?.type || 'default',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      ...payload.data,
      url: payload.fcmOptions?.link || payload.data?.deeplink || '/',
      timestamp: Date.now()
    },
    silent: false,
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Открыть'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});


self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event);
  event.notification.close();

  const data = event.notification.data || {};
  
  // Priority: url from data, then deeplink, then type-based routing
  let urlToOpen = data.url || data.deeplink || '/';

  if (!data.url && !data.deeplink) {
    // Fallback to type-based routing
    if (data.type === 'promotion' && data.promotionId) {
      urlToOpen = `/promotions/${data.promotionId}`;
    } else if (data.type === 'story' && data.storyId) {
      urlToOpen = `/stories`;
    } else if (data.type === 'orderAccepted' && data.orderId) {
      urlToOpen = `/orders/${data.orderId}`;
    } else if (data.type === 'newOrderAdmin' && data.orderId) {
      urlToOpen = `/admin/orders/${data.orderId}`;
    } else if (data.type === 'achievement' && data.achievementId) {
      urlToOpen = `/profile/achievements`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing client with same URL
      const matchingClient = clientList.find(client => {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        return clientUrl.pathname === targetUrl.pathname;
      });

      if (matchingClient && 'focus' in matchingClient) {
        return matchingClient.focus();
      }

      // Try to navigate any existing client
      if (clientList.length > 0 && 'navigate' in clientList[0]) {
        return clientList[0].navigate(urlToOpen).then(client => client.focus());
      }

      // Open new window as last resort
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
