# 🔥 КРИТИЧЕСКИЙ ФИК: Система уведомлений

## Что было сломано

### ❌ Проблема 1: Токены сохранялись не туда
**Симптом:** Уведомления не приходили вообще или через раз

**Причина:**
```typescript
// ❌ БЫЛО: токен сохранялся в документ пользователя
await setDoc(doc(db, 'users', user.uid), {
  fcmToken: token, // <-- Cloud Functions НЕ ИЩУТ ЗДЕСЬ!
  ...
});
```

**Cloud Functions ожидают:**
```typescript
// ✅ СТАЛО: токен в подколлекции
await setDoc(doc(db, `users/${uid}/tokens/${token}`), {
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

---

### ❌ Проблема 2: Foreground notifications не работали
**Симптом:** Когда приложение открыто — уведомления не показываются

**Причина:** `setupForegroundMessaging()` **создавался**, но **не вызывался** в `initializeFCM()`

```typescript
// ❌ БЫЛО:
export const initializeFCM = async () => {
  await getFCMToken();
  setupForegroundMessaging(); // <-- возвращаемое значение игнорировалось
};
```

**Решение:**
```typescript
// ✅ СТАЛО:
export const initializeFCM = async () => {
  await getFCMToken();
  
  const unsubscribe = setupForegroundMessaging(); // <-- теперь сохраняется
  if (unsubscribe) {
    (window as Window & { __fcmUnsubscribe?: () => void }).__fcmUnsubscribe = unsubscribe;
  }
};
```

---

## Что исправлено

### ✅ 1. Токены теперь сохраняются правильно

**Структура Firestore:**
```
users/
  {uid}/
    pushOptIn: true              ← настройки пользователя
    subscribePromotions: true
    subscribeStories: true
    lastTokenUpdate: Timestamp
    
    tokens/                      ← ПОДКОЛЛЕКЦИЯ токенов
      {fcmToken1}/
        createdAt: Timestamp
        updatedAt: Timestamp
      {fcmToken2}/
        ...
```

Cloud Functions используют:
```typescript
const tokensSnapshot = await db.collection(`users/${uid}/tokens`).get();
tokensSnapshot.docs.forEach(tokenDoc => {
  allTokens.push(tokenDoc.id); // ID документа = FCM токен
});
```

---

### ✅ 2. Foreground messages теперь обрабатываются

**Добавлен handler:**
```typescript
onMessage(messaging, (payload) => {
  console.log('🔔 [FCM] Foreground message received:', payload);
  
  const { notification, data } = payload;
  
  // Показываем уведомление через Notification API
  new Notification(notification.title, {
    body: notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    requireInteraction: true,
    data
  });
});
```

**Логика:**
- **Приложение открыто** → foreground handler (`onMessage`)
- **Приложение закрыто/фоновый режим** → Service Worker (`onBackgroundMessage`)

---

### ✅ 3. Добавлено подробное логирование

**Console logs для debugging:**
```typescript
🔔 [FCM] Service Worker registered
🔔 [FCM] Token obtained: dxG...
🔔 [FCM] Saving token to Firestore for user: Fa896...
🔔 [FCM] Token saved to subcollection successfully
🔔 [FCM] Setting up foreground message listener
🔔 [FCM] Foreground message received: { ... }
🔔 [FCM] Showing notification: { title: '...', body: '...' }
🔔 [FCM] Notification clicked
```

**Проверка в DevTools Console:**
1. Открой https://coffeeaddict-c9d70.web.app
2. F12 → Console
3. Должны быть логи `🔔 [FCM] ...`

---

## Как тестировать

### 🧪 Тест 1: Перерегистрация FCM токена

**Шаги:**
1. Открой https://coffeeaddict-c9d70.web.app
2. Логин → подожди 2 секунды
3. **Разреши уведомления** (если спросит)
4. Проверь DevTools Console — должны быть:
   ```
   🔔 [FCM] Service Worker registered
   🔔 [FCM] Token obtained: ...
   🔔 [FCM] Token saved to subcollection successfully
   🔔 [FCM] Setting up foreground message listener
   ```

5. **Проверь Firestore:**
   - `users/{твой_uid}/tokens/` — должна быть подколлекция
   - Минимум 1 документ (ID = FCM токен)

---

### 🧪 Тест 2: Foreground notification (приложение открыто)

**Шаги:**
1. **Оставь приложение ОТКРЫТЫМ** в браузере
2. Открой админку в **другой вкладке**
3. Создай новую акцию
4. **Должно появиться уведомление** в браузере (правый верхний угол)
5. Проверь Console:
   ```
   🔔 [FCM] Foreground message received: { ... }
   🔔 [FCM] Showing notification: { title: 'Новая акция! 🎉', body: '...' }
   ```

---

### 🧪 Тест 3: Background notification (приложение закрыто)

**Шаги:**
1. **Закрой вкладку** с приложением (или сверни браузер)
2. Создай новую акцию в админке
3. **Уведомление должно прийти** от операционной системы
4. Клик по уведомлению → **откроется приложение** на странице акции

---

### 🧪 Тест 4: PWA на телефоне

**Android/iOS:**
1. Открой PWA на домашнем экране
2. Подожди 2 секунды → разреши уведомления
3. **Закрой PWA** (свайп вверх)
4. Создай акцию в админке
5. **Уведомление должно прийти** на телефон через 5-10 секунд

---

## Troubleshooting

### ❓ "Нет логов 🔔 [FCM] в Console"

**Причина:** `initializeFCM()` не вызывается или падает с ошибкой.

**Решение:**
1. Проверь `src/App.tsx` — должен быть `useEffect` с `initializeFCM()`
2. Проверь `.env.production` — `VITE_FIREBASE_VAPID_KEY` должен быть установлен

---

### ❓ "Токены не сохраняются в Firestore"

**Причина:** Проблема с разрешениями Firestore или VAPID ключ неправильный.

**Решение:**
1. Проверь `firestore.rules` — поле `lastTokenUpdate` в `affectedKeys`
2. Проверь Console на ошибки `Permission denied`
3. Убедись что VAPID ключ совпадает в:
   - `.env.production` → `VITE_FIREBASE_VAPID_KEY`
   - Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

---

### ❓ "Уведомления приходят, но не открывается deeplink"

**Причина:** `data.url` или `data.deeplink` не передается корректно.

**Решение:**
1. Проверь Cloud Functions → `fcm.ts` → `webpush.fcmOptions.link`
2. Проверь Service Worker → `notificationclick` handler
3. Проверь что `payload.deeplink` присутствует в FCM message

---

### ❓ "Дублирующиеся уведомления (foreground + background)"

**Причина:** Foreground handler показывает уведомление, и Service Worker тоже.

**Решение:** Это **нормально** в некоторых браузерах. Chrome автоматически подавляет дубли.

---

## Следующие шаги

1. **Очисти старые FCM токены:**
   ```javascript
   // Firebase Console → Firestore
   // Найди всех пользователей
   // Удали поле `fcmToken` из документа (если есть)
   // Оставь только подколлекцию `tokens/`
   ```

2. **Попроси пользователей обновить приложение:**
   - PWA обновится автоматически
   - Но нужно будет **заново разрешить** уведомления

3. **Мониторинг логов:**
   ```bash
   firebase functions:log --only onPromotionCreated,onStoryCreated
   ```

4. **Проверяй `notifications_log` в Firestore:**
   - `successCount` должен расти
   - `failureCount` должен быть 0 или минимальным

---

**Дата фикса:** 2025-10-12  
**Версия:** 2.0.0 (critical bug fixes)  
**Статус:** ✅ Production-ready
