# 🔔 Web Push Notifications (FCM) — Production Guide

## 📋 Обзор системы

Полная production-ready система Web Push уведомлений для SunfoodApp с использованием Firebase Cloud Messaging.

### Архитектура

- **Frontend**: Ionic + React (Vite), Firebase Web SDK v9+
- **Backend**: Firebase Cloud Functions v2 (TypeScript)
- **Регионы**: `europe-west1` (основные триггеры), `us-central1` (опциональные)
- **Storage**: Firestore для токенов и логов, tokens subcollection

### Реализованные сценарии

1. ✅ **Admin: Новый заказ** — уведомление админам при создании заказа со звуком
2. ✅ **Client: Принятие заказа** — уведомление клиенту при `status = 'accepted'`
3. ✅ **Client: Новая акция** — broadcast всем подписчикам на promotions
4. ✅ **Client: Новая история** — broadcast всем подписчикам на stories
5. ✅ **Client: Достижение** — персональное уведомление при разблокировке achievement
6. ✅ **CRON: Ре-энгейджмент** — ежедневно в 10:00 (Asia/Almaty) пользователям без заказов 7+ дней

---

## 🚀 Deployment

### 1. Environment Variables

#### `.env` (root)
```env
VITE_FCM_VAPID_KEY=YOUR_VAPID_KEY_HERE
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

#### Получение VAPID Key
```bash
# Firebase Console → Project Settings → Cloud Messaging → Web Push Certificates → Generate Key Pair
# Copy the public key (starts with B...)
```

### 2. Firebase Console Setup

1. **Enable Cloud Messaging**
   - Firebase Console → Build → Cloud Messaging
   - Убедись, что API включен

2. **Add Authorized Domains**
   - Firebase Console → Project Settings → Cloud Messaging → Web Configuration
   - Добавь домены: `localhost`, `yourapp.com`, `yourapp.firebaseapp.com`

3. **Deploy Functions**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

4. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Deploy Hosting (для SW)**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### 3. Verify Deployment

```bash
# Check deployed functions
firebase functions:list

# Expected output:
# onNewOrderForAdmin (europe-west1)
# onAchievementUnlocked (europe-west1)
# onPromotionCreated (europe-west1)
# onOrderUpdated (europe-west1)
# onStoryCreated (us-central1)
# reengageInactiveUsers (europe-west1)
```

---

## 📱 Frontend Integration

### Добавить в App.tsx

```typescript
import { useNotificationPrompt } from '@/features/notifications/useNotificationPrompt';
import { NotificationSubscribe } from '@/features/notifications/subscribe';
import { listenToForegroundMessages, showForegroundNotification, playNotificationSound } from '@/features/notifications/api';

function App() {
  const { user } = useAuth();
  const { shouldShow, dismiss, markAsShown } = useNotificationPrompt(user?.uid);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to foreground messages
    const unsubscribe = listenToForegroundMessages((payload) => {
      if (payload.notification) {
        showForegroundNotification(
          payload.notification.title || 'SunfoodApp',
          {
            body: payload.notification.body,
            data: payload.data
          }
        );
        playNotificationSound(); // Only works after user gesture
      }
    });

    return unsubscribe || undefined;
  }, [user?.uid]);

  return (
    <div>
      {/* Your app content */}
      
      {shouldShow && user?.uid && (
        <NotificationSubscribe
          userId={user.uid}
          onClose={dismiss}
          onEnabled={markAsShown}
        />
      )}
    </div>
  );
}
```

---

## 🔊 Sound Configuration

### Web (Browser)

**Ограничение**: Браузеры НЕ поддерживают кастомный звук для фоновых уведомлений. Будет системный звук ОС.

- ✅ **Background**: Системный звук (через `silent: false` в SW)
- ✅ **Foreground**: Кастомный `notify.mp3` (требует user gesture)
- ✅ **Vibration**: `[200, 100, 200]` на Android/поддерживаемых браузерах
- ✅ **requireInteraction**: Уведомление не закрывается до клика

### Android (через FCM)

```typescript
android: {
  notification: {
    sound: 'default',           // Системный звук Android
    defaultSound: true,
    defaultVibrateTimings: true,
    priority: 'high'
  }
}
```

### iOS (APNs через FCM)

```typescript
apns: {
  payload: {
    aps: {
      sound: 'default',  // Системный звук iOS
      badge: 1
    }
  }
}
```

### Foreground Sound (Web)

Добавь файл `public/notify.mp3` (короткий звук <1s, ~50KB).

```typescript
// Will only play after user interaction (click/tap) due to autoplay policy
playNotificationSound();
```

---

## 🧪 Testing

### 1. Test Admin Notifications

1. Открой админку и залогинься
2. Убедись, что в профиле: `role: 'admin'`, `pushOptIn: true`, есть `fcmToken`
3. Создай тестовый заказ от клиента:
   ```javascript
   // Browser console на клиенте
   await addDoc(collection(db, 'orders'), {
     userId: 'client_uid',
     userName: 'Test User',
     status: 'pending',
     shortId: '12345',
     createdAt: new Date()
   });
   ```
4. Админ должен получить уведомление "Новый заказ! 🔔"

### 2. Test Client Notifications

#### Order Accepted
```javascript
// Update order status in Firestore
await updateDoc(doc(db, 'orders', 'ORDER_ID'), {
  status: 'accepted'
});
// Client should receive "Заказ принят! ☕"
```

#### New Promotion
```javascript
await addDoc(collection(db, 'promotions'), {
  title: 'Test Promo',
  description: 'Test description',
  deeplink: '/promotions/test'
});
// All subscribed users receive "Новая акция! 🎉"
```

#### New Story
```javascript
await addDoc(collection(db, 'stories'), {
  title: 'Test Story',
  deeplink: '/stories/test'
});
// All subscribed users receive "Новая история! ✨"
```

### 3. Test Re-engagement CRON

```bash
# Manually trigger CRON job
curl https://europe-west1-coffeeaddict-c9d70.cloudfunctions.net/reengageInactiveUsers

# Or use test endpoint with user ID
curl "https://us-central1-coffeeaddict-c9d70.cloudfunctions.net/testReengage?userId=USER_ID"
```

### 4. Check Logs

```bash
# View function logs
firebase functions:log --only onNewOrderForAdmin
firebase functions:log --only onOrderUpdated
firebase functions:log --only reengageInactiveUsers

# Check notifications log in Firestore
# Collection: notifications_log
```

---

## 🔒 Security

### Firestore Rules

```javascript
// Users can only write their own tokens
match /users/{userId}/tokens/{tokenId} {
  allow write: if request.auth.uid == userId;
}

// Only Cloud Functions can write to suppress collection
match /users/{userId}/notifications_suppress/{type} {
  allow read, write: if false;
}

// Only Cloud Functions can write logs
match /notifications_log/{logId} {
  allow write: if false;
}

// Admin-only writes for promotions/stories
match /promotions/{promoId} {
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Environment Security

- ✅ VAPID key в `.env`, НЕ в коде
- ✅ Firebase config использует `import.meta.env.VITE_*`
- ✅ Service Worker использует hardcoded config (public файл)
- ✅ Cloud Functions используют Admin SDK без хардкода ключей

---

## 🐛 Troubleshooting

### "No admins with notifications enabled"

**Проблема**: onNewOrderForAdmin не находит админов.

**Решение**:
```javascript
// В Firestore Console → users/{admin_uid}
{
  role: 'admin',
  pushOptIn: true,
  fcmToken: 'xxx...'  // Must exist
}
```

### "Failed to get FCM token"

**Причины**:
1. VAPID key не настроен в `.env`
2. Service Worker не зарегистрирован
3. Разрешения не даны

**Решение**:
```bash
# Check SW registration
navigator.serviceWorker.getRegistrations()

# Check permission
Notification.permission  // Should be 'granted'

# Check VAPID key
console.log(import.meta.env.VITE_FCM_VAPID_KEY)
```

### "Notification sound doesn't play"

**Web Background**: Невозможно. Браузер использует системный звук.

**Web Foreground**:
```javascript
// Sound requires user gesture (click/tap)
button.addEventListener('click', () => {
  playNotificationSound();  // Now allowed
});
```

**Android/iOS**: Проверь, что `sound: 'default'` в payload.

### "Duplicate notifications"

**Проблема**: Пользователь получает несколько уведомлений.

**Решение**: Guard уже настроен в `guard.ts`:
```typescript
// Suppress duplicate for 1 hour
await shouldSuppress(userId, 'orderAccepted', 1);
```

### "CRON not running"

**Проверка**:
```bash
# View CRON logs
firebase functions:log --only reengageInactiveUsers

# Verify schedule
firebase functions:config:get
```

**Таймзона**: Убедись, что `Asia/Almaty` правильная для твоего региона.

---

## 📊 Monitoring

### Firestore Collections

1. **`notifications_log`** — лог всех отправленных уведомлений
   ```javascript
   {
     type: 'promotion_created',
     tokensCount: 150,
     successCount: 148,
     failureCount: 2,
     ts: Timestamp
   }
   ```

2. **`users/{uid}/tokens/{token}`** — FCM токены пользователей
   ```javascript
   {
     createdAt: Date,
     updatedAt: Date,
     userAgent: 'Mozilla/5.0...',
     platform: 'Win32'
   }
   ```

3. **`users/{uid}/notifications_suppress/{type}`** — дедупликация
   ```javascript
   {
     type: 'reengage7d',
     lastSentAt: Timestamp
   }
   ```

### Firebase Console

- **Cloud Messaging** → Dashboard: Sent count, delivery rate
- **Cloud Functions** → Logs: Errors, execution time
- **Firestore** → Usage: Read/write counts

---

## ⚙️ Configuration

### Notification Types

| Type | Trigger | Audience | TTL |
|------|---------|----------|-----|
| `newOrderAdmin` | Order created | Admins | None |
| `orderAccepted` | Order status→accepted | Order owner | 1 hour |
| `promotion_created` | Promotion created | subscribePromotions | None |
| `story_created` | Story created | subscribeStories | None |
| `achievement_unlocked` | Achievement created | Achievement owner | 168 hours |
| `reengage7d` | CRON daily 10:00 | Inactive 7+ days | 48 hours |

### Customization

#### Change CRON Schedule
```typescript
// functions/src/cron.ts
export const reengageInactiveUsers = functions.pubsub
  .schedule('0 10 * * *')  // Daily 10:00 AM
  .timeZone('Asia/Almaty')
  .onRun(async () => { ... });
```

#### Change Inactivity Period
```typescript
// functions/src/cron.ts
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);  // Change to 14, 30, etc.
```

#### Customize Modal Delay
```typescript
// src/features/notifications/useNotificationPrompt.ts
const timer = setTimeout(() => {
  setShouldShow(true);
}, 3000);  // Change to 5000 for 5 seconds
```

---

## 📄 Files Created/Updated

### Backend
- `functions/src/admin.ts` — Admin SDK initialization + region exports
- `functions/src/fcm.ts` — FCM utilities with sound/vibrate/requireInteraction
- `functions/src/guard.ts` — Deduplication logic
- `functions/src/triggers.ts` — 5 Firestore triggers
- `functions/src/cron.ts` — Re-engagement scheduler
- `functions/src/index.ts` — Function exports

### Frontend
- `src/lib/firebase.ts` — Messaging initialization with guard
- `src/features/notifications/api.ts` — Token management, preferences
- `src/features/notifications/subscribe.tsx` — Beautiful gradient modal
- `src/features/notifications/useNotificationPrompt.ts` — 3s delay + 7d retry hook
- `public/firebase-messaging-sw.js` — Service Worker with sound config

### Security
- `firestore.rules` — Updated with tokens, suppress, admin rules

### Assets
- `public/notify.mp3` — Notification sound (add manually)

---

## 🎯 Acceptance Criteria

- [x] Звук на Android/iOS (через `sound: 'default'`)
- [x] Вибрация `[200, 100, 200]` на Web/Android
- [x] `requireInteraction: true` — уведомление не закрывается до клика
- [x] Модалка автопоказ через 3 секунды
- [x] Повтор модалки через 7 дней после отказа
- [x] 5 сценариев: admin order, client order accepted, promotions, stories, achievements
- [x] CRON ре-энгейджмент (10:00 Asia/Almaty, 7+ дней без заказа)
- [x] Дедупликация через `notifications_suppress`
- [x] Чистка битых токенов автоматически
- [x] Логи в `notifications_log`
- [x] Без `console.log` в продакшене (только errors)

---

## 📞 Support

**Проблемы?**
1. Проверь [Troubleshooting](#-troubleshooting)
2. Посмотри `firebase functions:log`
3. Проверь `notifications_log` в Firestore
4. Убедись, что VAPID key и env vars настроены

**Production Checklist**:
- [ ] VAPID key в `.env`
- [ ] Firebase domains authorized
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] SW deployed (`firebase deploy --only hosting`)
- [ ] Admin user has `role: 'admin'` + `pushOptIn: true`
- [ ] Test order creates admin notification
- [ ] Client receives notification on order accepted
- [ ] Modal appears 3s after login

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Author**: GitHub Copilot for SunfoodApp
