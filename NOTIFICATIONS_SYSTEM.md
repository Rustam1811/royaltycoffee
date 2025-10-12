# 🔔 Система Push-уведомлений Coffee Addict

## Архитектура

### Технологический стек
- **Firebase Cloud Messaging (FCM)** — доставка уведомлений
- **Firebase Cloud Functions** — автоматические триггеры на события Firestore
- **Service Worker** — обработка фоновых уведомлений в PWA
- **React** — foreground notifications через Notification API

---

## Триггеры уведомлений

### 1️⃣ Новый заказ создан (`onNewOrderForAdmin`)
**Когда:** Клиент создает новый заказ  
**Кому:** Всем админам с `role === 'admin'` и `pushOptIn === true`  
**Содержание:**
```
Заголовок: "Новый заказ! 🔔"
Текст: "Заказ №[shortId] от [userName]"
Deeplink: /admin/orders/[orderId]
```

**Firestore коллекция:** `orders/{orderId}` (onCreate)

---

### 2️⃣ Заказ принят баристой (`onOrderUpdated`)
**Когда:** Статус заказа изменен на `"accepted"`  
**Кому:** Клиенту, создавшему заказ (`userId`)  
**Содержание:**
```
Заголовок: "Заказ принят! ☕"
Текст: "Бариста подтвердил ваш заказ №[shortId]"
Deeplink: /orders/[orderId]
```

**Firestore коллекция:** `orders/{orderId}` (onUpdate)  
**Защита от дубликатов:** TTL 1 час через `shouldSuppress()`

---

### 3️⃣ Новая акция создана (`onPromotionCreated`)
**Когда:** Админ создает новую акцию  
**Кому:** Всем клиентам с `subscribePromotions === true` и `pushOptIn === true`  
**Содержание:**
```
Заголовок: "Новая акция! 🎉"
Текст: [promotion.title]
Deeplink: /promotions/[promotionId]
```

**Firestore коллекция:** `promotions/{promotionId}` (onCreate)  
**Батчинг:** До 500 токенов на запрос (FCM limit)

---

### 4️⃣ Новая история создана (`onStoryCreated`)
**Когда:** Админ публикует новую историю  
**Кому:**
- Если `closeFriendsOnly === true` или `visibility === 'closeFriends'`:  
  → Только клиентам с `isCloseFriend === true`
- Иначе: всем клиентам с `subscribeStories === true` и `pushOptIn === true`

**Содержание:**
```
Заголовок: 
  - Обычная: "Новая история! ✨"
  - Близкие друзья: "Новая история для близких друзей! 💚"
Текст: [story.title] или "Посмотрите нашу новую историю"
Deeplink: /stories/[storyId]
```

**Firestore коллекция:** `stories/{storyId}` (onCreate)  
**Логирование:** Разные типы для `story_created` и `story_created_close_friends`

---

### 5️⃣ Достижение разблокировано (`onAchievementUnlocked`)
**Когда:** Пользователь получает новое достижение  
**Кому:** Конкретному пользователю (`userId`)  
**Содержание:**
```
Заголовок: "Достижение разблокировано! 🏆"
Текст: [achievement.title]
Deeplink: /profile/achievements
```

**Firestore коллекция:** `users/{userId}/achievements/{achievementId}` (onCreate)  
**Защита от дубликатов:** TTL 168 часов (7 дней)

---

## Структура данных Firestore

### User tokens (FCM токены)
```
users/
  {uid}/
    tokens/
      {fcmToken}/ 
        createdAt: Timestamp
        updatedAt: Timestamp
        lastTokenUpdate: Timestamp
```

### User preferences (настройки уведомлений)
```javascript
{
  pushOptIn: boolean,           // Общее согласие на уведомления
  subscribePromotions: boolean, // Подписка на акции
  subscribeStories: boolean,    // Подписка на истории
  isCloseFriend: boolean        // Флаг "близкий друг" для эксклюзивных сториз
}
```

### Admin users
```javascript
{
  role: 'admin',
  pushOptIn: boolean
}
```

---

## FCM функции (fcm.ts)

### `sendToUser(uid, payload)`
Отправка уведомления конкретному пользователю.

**Параметры:**
- `uid` — ID пользователя
- `payload` — объект с полями `{ title, body, type, deeplink, ...customData }`

**Возвращает:** `SendResult { successCount, failureCount, invalidTokens[] }`

---

### `sendToAllSubscribed(topic, payload, closeFriendsOnly)`
Массовая отправка всем подписанным пользователям.

**Параметры:**
- `topic` — `'promotions'` или `'stories'`
- `payload` — объект уведомления
- `closeFriendsOnly` — `true` для фильтрации только близких друзей (опционально)

**Логика:**
1. Получает список пользователей с `pushOptIn === true` и `subscribe[Topic] === true`
2. Если `closeFriendsOnly === true`, добавляет фильтр `isCloseFriend === true`
3. Собирает все FCM токены из `users/{uid}/tokens/`
4. Отправляет батчами по 500 токенов
5. Удаляет невалидные токены через `cleanupInvalidTokens()`

---

### `sendMulticast(tokens, payload, retries)`
Low-level функция для отправки с retry логикой.

**Фичи:**
- Retry до 3 раз с exponential backoff (1s, 2s, 4s)
- Автоматическая очистка невалидных токенов
- Поддержка Android/iOS/Web платформ

**Конфигурация уведомления:**
```javascript
{
  webpush: {
    notification: {
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: payload.type,
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
      channelId: 'default'
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
}
```

---

## Service Worker (firebase-messaging-sw.js)

### Background message handler
```javascript
messaging.onBackgroundMessage((payload) => {
  // Показывает уведомление даже когда приложение закрыто
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [{ action: 'open', title: 'Открыть' }]
  });
});
```

### Notification click handler
```javascript
self.addEventListener('notificationclick', (event) => {
  // Routing логика:
  // 1. Проверяет data.url или data.deeplink
  // 2. Fallback на type-based routing (promotion/story/order/achievement)
  // 3. Пытается сфокусировать существующую вкладку
  // 4. Если нет — открывает новую
});
```

---

## Логирование

Все уведомления логируются в Firestore:

```
notifications_log/
  {autoId}/
    uid: string | null          // ID получателя (если single-user)
    type: string                // Тип события (new_order_admin, promotion_created и т.д.)
    ts: Timestamp               // Время отправки
    tokensCount: number         // Всего токенов
    successCount: number        // Успешно доставлено
    failureCount: number        // Ошибки доставки
```

**Типы событий:**
- `new_order_admin`
- `order_accepted`
- `promotion_created`
- `story_created`
- `story_created_close_friends`
- `achievement_unlocked`

---

## Защита от дубликатов (guard.ts)

### `shouldSuppress(userId, key, ttlHours)`
Проверяет, было ли уведомление отправлено недавно.

**Использование:**
```typescript
const suppress = await shouldSuppress(userId, 'orderAccepted', 1);
if (suppress) return; // Не отправлять повторно в течение 1 часа
```

### `markAsSent(userId, key, ttlHours)`
Помечает уведомление как отправленное с TTL.

**Firestore структура:**
```
notification_guard/
  {userId}/
    {key}/
      ts: Timestamp
      ttl: number (hours)
```

---

## Troubleshooting

### ❌ PWA на домашнем экране не получает уведомления

**Причины:**
1. **iOS не поддерживает Web Push в PWA** (до iOS 16.4)
2. **Service Worker не зарегистрирован** — проверь DevTools > Application > Service Workers
3. **Токен не сохранен** — проверь `users/{uid}/tokens/` в Firestore

**Решение:**
```javascript
// В src/services/messaging.ts
const registration = await navigator.serviceWorker.ready;
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY',
  serviceWorkerRegistration: registration
});
```

### ❌ Уведомления не приходят в фоне (браузер работает)

**Причина:** Foreground notifications обрабатываются через `onMessage()`, а не Service Worker.

**Решение:**
```javascript
// src/services/messaging.ts
onMessage(messaging, (payload) => {
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  });
});
```

### ❌ Близкие друзья не получают уведомления

**Причина:** Поле `isCloseFriend` не установлено в документе пользователя.

**Решение:**
```javascript
// Firestore Console
db.collection('users').doc(userId).update({
  isCloseFriend: true
});
```

---

## Чек-лист деплоя

- [ ] Установлен VAPID ключ в `.env.production`
- [ ] `firebase-messaging-sw.js` доступен по `/firebase-messaging-sw.js`
- [ ] HTTP headers для Service Worker: `Cache-Control: no-cache`
- [ ] Firestore rules разрешают запись в `users/{uid}/tokens/{token}`
- [ ] Cloud Functions задеплоены: `firebase deploy --only functions`
- [ ] Manifest.json содержит `gcm_sender_id: "103953800507"`
- [ ] Иконки PWA добавлены: `/icon-192x192.png`, `/icon-96x96.png`

---

## Roadmap

### Планируемые улучшения
- [ ] Scheduled notifications (отложенные уведомления)
- [ ] Rich media notifications (картинки в уведомлениях)
- [ ] Action buttons (кнопки действий в уведомлениях)
- [ ] Notification preferences page (страница настроек для каждого типа)
- [ ] Analytics dashboard (метрики доставки/открытия)
- [ ] A/B testing для текстов уведомлений

---

**Автор:** Senior Engineer  
**Дата:** 2025-10-11  
**Версия:** 1.0.0
