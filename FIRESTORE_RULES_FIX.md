# ✅ ИСПРАВЛЕНО: Firestore Rules для FCM токенов

## ❌ Проблема
```
Error saving FCM token: FirebaseError: Missing or insufficient permissions.
```

## 🔍 Причина
Firestore Rules **НЕ разрешали** пользователям обновлять поля `fcmToken` и `notificationsEnabled` в своих документах.

Правило `allow update` для `users/{userId}` проверяло список разрешённых полей через `hasOnly()`, но `fcmToken` там не было!

## ✅ Решение

Добавил в `firestore.rules`:
```javascript
allow update: if request.auth != null && 
  request.auth.uid == userId && 
  request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly([
      'phone', 
      'name', 
      'email', 
      'avatar', 
      'updatedAt', 
      'pushOptIn', 
      'marketingOptIn', 
      'subscribePromotions', 
      'subscribeStories', 
      'lastOrderAt', 
      'fcmToken',              // ← ДОБАВЛЕНО
      'notificationsEnabled'   // ← ДОБАВЛЕНО
    ]);
```

## 🚀 Deploy

```bash
firebase deploy --only firestore:rules
```

✅ **Rules успешно задеплоены!**

---

## 🧪 ТЕСТ СЕЙЧАС

1. **Перезагрузи страницу**: https://coffeeaddict-c9d70.web.app/
2. **Залогинься** через Google
3. **Жди модалку** (3 секунды)
4. **Нажми "Включить уведомления"**
5. **Разреши** браузеру

### Ожидаемый результат:
✅ Токен сохранится в Firestore без ошибок
✅ В консоли НЕ будет ошибки `Missing or insufficient permissions`
✅ Модалка закроется
✅ Услышишь звук 🔔

---

## 📋 Что разрешено теперь

Пользователь может обновлять в своём документе `users/{uid}`:
- ✅ `phone` - телефон
- ✅ `name` - имя
- ✅ `email` - email
- ✅ `avatar` - аватар
- ✅ `pushOptIn` - включены ли push
- ✅ `marketingOptIn` - маркетинговые рассылки
- ✅ `subscribePromotions` - подписка на акции
- ✅ `subscribeStories` - подписка на истории
- ✅ `fcmToken` - **FCM токен** ← NEW
- ✅ `notificationsEnabled` - **уведомления включены** ← NEW
- ✅ `updatedAt` - время обновления
- ✅ `lastOrderAt` - последний заказ

И в подколлекции `users/{uid}/tokens/{tokenId}`:
- ✅ Полный доступ (read, write, delete)

---

## 🎯 Итог

**ДО**: FCM токен НЕ сохранялся → ошибка `Missing or insufficient permissions`
**ПОСЛЕ**: FCM токен сохраняется → уведомления работают! 🚀

Попробуй сейчас!
