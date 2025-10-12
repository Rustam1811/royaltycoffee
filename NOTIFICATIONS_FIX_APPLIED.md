# 🧪 Тест системы уведомлений

## ✅ Что исправлено

**Проблема:** `TypeError: Cannot read properties of undefined (reading 'FieldValue')`

**Причина:** Использовался `await import('firebase-admin')` внутри функции, что возвращало некорректный объект в runtime.

**Решение:**
```typescript
// ❌ БЫЛО:
const admin = await import('firebase-admin');
ts: admin.firestore.FieldValue.serverTimestamp()

// ✅ СТАЛО:
ts: admin.firestore.FieldValue.serverTimestamp() // используем top-level import
```

---

## 📋 Как проверить что всё работает

### 1. Открой Firebase Console → Firestore

**Проверь коллекции:**

#### `users` → найди себя → `tokens`
Должна быть подколлекция с FCM токенами:
```
users/
  {твой_uid}/
    tokens/
      {fcmToken}/
        createdAt: Timestamp
        updatedAt: Timestamp
```

**Если токенов НЕТ:**
1. Открой https://coffeeaddict-c9d70.web.app
2. Разреши уведомления (если не было запроса — перезагрузи страницу)
3. Подожди 2-3 секунды
4. Проверь снова Firestore → должен появиться токен

---

#### `users` → твой документ → поля
Убедись что установлены:
```json
{
  "pushOptIn": true,
  "subscribePromotions": true,
  "subscribeStories": true
}
```

**Если нет — добавь вручную** через Firebase Console (кнопка "Edit Document").

---

### 2. Создай тестовую акцию

1. Админ-панель → "Управление акциями" → "Создать акцию"
2. Заполни:
   - Заголовок: "Тест уведомлений"
   - Описание: "Проверка системы push"
   - Тип скидки: 10%
   - Даты: сегодня — завтра
3. Нажми "Создать"

---

### 3. Проверь логи Cloud Functions

**Команда:**
```bash
firebase functions:log --only onPromotionCreated
```

**Должно быть:**
```
✅ Successfully sent: 1, Failed: 0
✅ Promotion notification sent to 1 users
```

**БЕЗ ошибок** `TypeError: Cannot read properties of undefined`

---

### 4. Проверь Firestore → `notifications_log`

Последняя запись должна быть:
```json
{
  "type": "promotion_created",
  "successCount": 1,
  "failureCount": 0,
  "tokensCount": 1,
  "ts": Timestamp (только что)
}
```

---

### 5. Проверь браузер

**Если приложение ОТКРЫТО:**
- Должно появиться уведомление в браузере (foreground)
- Или внутри приложения (если `onMessage` настроен)

**Если приложение ЗАКРЫТО:**
- Уведомление придет от операционной системы (Service Worker)
- Клик по нему откроет приложение на странице акции

---

## 🐛 Если уведомление НЕ пришло

### Чек-лист:

1. **Проверь DevTools → Application → Service Workers**
   - Должен быть `/firebase-messaging-sw.js` в статусе `Activated`

2. **Проверь разрешения браузера**
   - `chrome://settings/content/notifications`
   - Сайт `coffeeaddict-c9d70.web.app` должен быть в **Allowed**

3. **Проверь FCM токен в Firestore**
   - `users/{uid}/tokens/` должна содержать хотя бы один документ

4. **Проверь настройки пользователя**
   - `pushOptIn === true`
   - `subscribePromotions === true`

5. **Проверь логи Functions**
   - Не должно быть ошибок `TypeError`
   - `successCount` должен быть > 0

---

## 🚀 Следующий тест: PWA на телефоне

1. **Открой PWA** на домашнем экране (Android/iOS)
2. **Закрой приложение** (свайп вверх)
3. **Создай акцию** в админ-панели
4. **Подожди 5-10 секунд**
5. **Уведомление должно прийти** даже когда приложение закрыто!

---

**Дата:** 2025-10-11  
**Версия:** 1.1.0 (исправлен баг с `admin` import)
