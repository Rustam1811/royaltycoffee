# 🔔 Чек-лист: Почему не пришло уведомление о принятии заказа

## ✅ Что должно быть выполнено:

### 1. Cloud Function задеплоена
```bash
firebase functions:list
```
Должна быть функция `onOrderUpdated` в списке!

### 2. У пользователя есть FCM токен
Проверь в Firestore Console:
```
users/{userId}/tokens/{tokenId}
```
Должен быть хотя бы один документ с токеном.

### 3. У пользователя включены пуш-уведомления
В Firestore `users/{userId}` должно быть:
```json
{
  "pushOptIn": true
}
```

### 4. Заказ правильно обновляется
При принятии заказа в Firestore должно измениться:
```json
{
  "status": "accepted",  // Было другое значение, стало "accepted"
  "userId": "номер_телефона_пользователя"  // Должен быть заполнен!
}
```

### 5. Нет suppression (дедупликации)
Проверь что нет записи:
```
users/{userId}/notifications_suppress/orderAccepted
```
Если есть - удали её или подожди 1 час.

### 6. Проверь логи функции
```bash
firebase functions:log --only onOrderUpdated
```
Должны быть логи о срабатывании функции.

### 7. Проверь notifications_log
В Firestore Console смотри коллекцию:
```
notifications_log
```
Должна быть запись с `type: "order_accepted"` и счётчиками успеха/ошибок.

---

## 🐛 Типичные проблемы:

### Проблема 1: Функция не задеплоена
**Решение**: Запусти деплой
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Проблема 2: У пользователя нет токена
**Решение**: Пользователь должен:
1. Зайти в приложение
2. Разрешить уведомления в браузере
3. Токен сохранится автоматически

### Проблема 3: `userId` в заказе пустой или неправильный
**Решение**: При создании заказа обязательно указывай `userId` (номер телефона пользователя)

### Проблема 4: VAPID ключ не настроен
**Решение**: Добавь в `.env.local`:
```env
VITE_FCM_VAPID_KEY=твой_vapid_ключ
```

### Проблема 5: Service Worker не зарегистрирован
**Решение**: Проверь в DevTools → Application → Service Workers
Должен быть активен `firebase-messaging-sw.js`

---

## 🧪 Как протестировать прямо сейчас:

### Вариант 1: Через Firestore Console
1. Открой Firestore Console
2. Найди коллекцию `orders`
3. Выбери любой заказ со статусом НЕ "accepted"
4. Измени поле `status` на `"accepted"`
5. Жди уведомление (приходит через 1-3 секунды)

### Вариант 2: Через код
```javascript
// В консоли браузера или в коде админки
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const orderId = 'твой_order_id';
await updateDoc(doc(db, 'orders', orderId), {
  status: 'accepted',
  userId: '+77071234567'  // Твой номер телефона
});
```

### Вариант 3: Через тестовый HTML
Открой `test-push-notifications-flow.html` в браузере и используй секцию "3️⃣ Update Order Status"

---

## 📊 Проверь результат:

1. **Пришло уведомление в браузер?** ✅
2. **Есть запись в `notifications_log`?** ✅
3. **Счётчик `successCount > 0`?** ✅

Если всё три пункта ✅ → система работает!

Если хотя бы один ❌ → смотри логи:
```bash
firebase functions:log
```
