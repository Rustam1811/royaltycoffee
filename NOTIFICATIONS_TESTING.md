# 🧪 Тестирование системы уведомлений

## Быстрый чек-лист

### 1. Клиент создает заказ → Админ получает уведомление

**Шаги:**
1. Открой клиентскую часть (браузер или PWA)
2. Создай новый заказ
3. Открой админ-панель в браузере → должно прийти уведомление "Новый заказ! 🔔"

**Firestore триггер:** `onNewOrderForAdmin`  
**Кому:** `role === 'admin' && pushOptIn === true`

---

### 2. Бариста принимает заказ → Клиент получает уведомление

**Шаги:**
1. В админ-панели открой раздел "Заказы"
2. Найди созданный заказ и измени статус на **"Принят"**
3. Клиент должен получить уведомление "Заказ принят! ☕"

**Firestore триггер:** `onOrderUpdated`  
**Условие:** `status` изменился с любого на `"accepted"`  
**Кому:** Пользователю с `userId` из заказа

---

### 3. Админ создает акцию → Подписчикам приходит уведомление

**Шаги:**
1. Админ-панель → "Управление акциями" → "Создать акцию"
2. Заполни форму и нажми "Создать"
3. Всем клиентам с `subscribePromotions === true` придет "Новая акция! 🎉"

**Firestore триггер:** `onPromotionCreated`  
**Кому:** `subscribePromotions === true && pushOptIn === true`  
**Батчинг:** До 500 пользователей за раз

---

### 4. Админ публикует историю → Уведомление с фильтром близких друзей

**Обычная история (всем):**
1. Админ-панель → "Истории" → "Создать"
2. Выбери тип контента (фото/видео/текст)
3. **НЕ ставь галочку** "Close Friends Only"
4. Опубликуй → всем клиентам с `subscribeStories === true` придет "Новая история! ✨"

**История для близких друзей:**
1. Админ-панель → "Истории" → "Создать"
2. **Поставь галочку** "Close Friends Only" или выбери `visibility: 'closeFriends'`
3. Опубликуй → только клиентам с `isCloseFriend === true` придет "Новая история для близких друзей! 💚"

**Firestore триггер:** `onStoryCreated`  
**Логика:**
- Если `closeFriendsOnly === true` → фильтр `isCloseFriend === true`
- Иначе → все с `subscribeStories === true`

---

### 5. Достижение разблокировано (автоматическое)

**Когда происходит:** Система автоматически создает документ в `users/{uid}/achievements/{achievementId}`

**Пример триггеров:**
- Первый заказ → "Первая чашка ☕"
- 10 заказов → "Кофеман 🏆"
- 7 дней подряд → "Верный клиент 💚"

**Firestore триггер:** `onAchievementUnlocked`  
**Кому:** Конкретному пользователю  
**Защита:** TTL 168 часов (не более 1 уведомления в неделю на одно достижение)

---

## Настройка тестовых пользователей

### Создать близкого друга (Close Friend)

1. Firebase Console → Firestore
2. Найди документ пользователя `users/{userId}`
3. Добавь поле:
```json
{
  "isCloseFriend": true,
  "subscribeStories": true,
  "pushOptIn": true
}
```

### Создать админа

```json
{
  "role": "admin",
  "pushOptIn": true,
  "email": "admin@example.com"
}
```

### Включить подписки для тестового клиента

```json
{
  "pushOptIn": true,
  "subscribePromotions": true,
  "subscribeStories": true
}
```

---

## Проверка доставки

### Firebase Console → Functions → Logs

Фильтр:
```
severity="INFO"
textPayload:"Sending notification"
```

### Firestore → notifications_log

Проверь последние записи:
```javascript
db.collection('notifications_log')
  .orderBy('ts', 'desc')
  .limit(10)
  .get()
```

Поля:
- `type` — тип уведомления
- `successCount` — успешно доставлено
- `failureCount` — ошибки
- `tokensCount` — всего токенов

---

## Troubleshooting PWA

### Уведомления не приходят на PWA (домашний экран)

**Проверь:**
1. Service Worker зарегистрирован:
   - DevTools → Application → Service Workers
   - Должен быть `/firebase-messaging-sw.js` в статусе **Activated**

2. FCM токен сохранен:
   - Firestore → `users/{uid}/tokens/{token}`
   - Должна быть хотя бы одна запись

3. Разрешения браузера:
   - `chrome://settings/content/notifications`
   - Сайт должен быть в **Allowed**

4. iOS PWA ограничения:
   - iOS 16.4+ поддерживает Web Push
   - Обязательно **Add to Home Screen** перед запросом разрешения

### Уведомления в браузере работают, в PWA — нет

**Причина:** Разные Service Worker scopes или разные регистрации.

**Решение:**
```javascript
// src/services/messaging.ts
const registration = await navigator.serviceWorker.ready;
const token = await getToken(messaging, {
  vapidKey: VAPID_KEY,
  serviceWorkerRegistration: registration // ВАЖНО!
});
```

### Console ошибка: "messaging/token-subscribe-failed"

**Причина:** VAPID ключ не совпадает или Service Worker не может получить доступ к Firebase.

**Решение:**
1. Проверь `.env.production`:
   ```
   VITE_FIREBASE_VAPID_KEY=BKPPcrrCt_ZQW8z...
   ```

2. Убедись что `public/firebase-messaging-sw.js` инициализирует Firebase с правильным `firebaseConfig`

---

## Проверка через cURL (для Cloud Functions)

### Тест отправки вручную

```bash
curl -X POST https://us-central1-coffeeaddict-c9d70.cloudfunctions.net/testReengage \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Проверка логов

```bash
firebase functions:log --only onPromotionCreated
```

---

## Метрики успеха

✅ **Работает корректно если:**
- Новый заказ → уведомление админу за <5 секунд
- Статус "принят" → уведомление клиенту за <3 секунды
- Акция создана → батч уведомлений за <10 секунд
- История опубликована → фильтр close friends работает
- PWA получает уведомления даже в фоне

❌ **Проблемы если:**
- `successCount === 0` при непустом `tokensCount`
- `failureCount > 50%` от общего числа
- Уведомления приходят дублями (не работает guard)
- Close friends получают обычные истории (баг фильтра)

---

**Дата:** 2025-10-11  
**Версия:** 1.0.0
