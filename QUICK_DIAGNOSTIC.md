# 🔍 Быстрая диагностика: Почему не пришло уведомление

## Запусти эти команды в консоли браузера:

### 1. Проверь свой userId
```javascript
// В консоли браузера
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('Мой userId:', auth.currentUser?.phoneNumber || auth.currentUser?.uid);
```

### 2. Проверь есть ли FCM токен в старом формате
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const userId = 'ТВОЙ_НОМЕР_ТЕЛЕФОНА'; // Например: '+77071234567'
const userDoc = await getDoc(doc(db, 'users', userId));
const userData = userDoc.data();

console.log('=== Данные пользователя ===');
console.log('notificationsEnabled:', userData?.notificationsEnabled);
console.log('fcmToken:', userData?.fcmToken ? 'ЕСТЬ ✅' : 'НЕТ ❌');
console.log('pushOptIn:', userData?.pushOptIn);
```

### 3. Проверь есть ли токены в новом формате
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const userId = 'ТВОЙ_НОМЕР_ТЕЛЕФОНА';
const tokensSnap = await getDocs(collection(db, `users/${userId}/tokens`));

console.log('=== Токены (новый формат) ===');
console.log('Количество токенов:', tokensSnap.size);
tokensSnap.forEach(doc => {
  console.log('Token ID:', doc.id.substring(0, 20) + '...');
  console.log('Data:', doc.data());
});
```

### 4. Проверь разрешение на уведомления
```javascript
console.log('=== Разрешение браузера ===');
console.log('Notification.permission:', Notification.permission);
// Должно быть "granted"!

// Если НЕ "granted", запроси разрешение:
if (Notification.permission !== 'granted') {
  await Notification.requestPermission();
}
```

### 5. Проверь Service Worker
```javascript
const regs = await navigator.serviceWorker.getRegistrations();
console.log('=== Service Workers ===');
console.log('Количество:', regs.length);
regs.forEach(reg => {
  console.log('SW:', reg.active?.scriptURL);
});
// Должен быть firebase-messaging-sw.js
```

---

## ❓ Результат проверки:

### Если `fcmToken: НЕТ ❌` и `tokensSnap.size: 0`
**Проблема**: У тебя НЕТ FCM токена!  
**Решение**: Нужно запросить разрешение и получить токен:

```javascript
import { requestNotificationPermission } from '@/features/notifications';

const userId = 'ТВОЙ_НОМЕР_ТЕЛЕФОНА';
const token = await requestNotificationPermission(userId);
console.log('Получен токен:', token ? 'ДА ✅' : 'НЕТ ❌');
```

### Если `notificationsEnabled: false`
**Проблема**: Уведомления выключены в профиле  
**Решение**: Включи в Firestore Console или через код:

```javascript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const userId = 'ТВОЙ_НОМЕР_ТЕЛЕФОНА';
await updateDoc(doc(db, 'users', userId), {
  notificationsEnabled: true,
  pushOptIn: true
});
console.log('✅ Уведомления включены!');
```

### Если `Notification.permission: "default"` или `"denied"`
**Проблема**: Браузер не дал разрешение  
**Решение**:

```javascript
// Запроси разрешение
const permission = await Notification.requestPermission();
console.log('Результат:', permission);

// Если "denied" - нужно вручную разрешить в настройках браузера:
// Chrome: Настройки → Конфиденциальность → Настройки сайтов → Уведомления
```

---

## 🧪 БЫСТРЫЙ ТЕСТ

После настройки токена, протестируй:

```javascript
// В Firestore Console, обнови любой заказ:
// 1. Открой коллекцию "orders"
// 2. Выбери заказ со статусом НЕ "accepted"
// 3. Измени поле "status" на "accepted"
// 4. Жди уведомление через 2-3 секунды!
```

---

## 📊 Скопируй и пришли результаты:

После запуска всех проверок, скопируй результаты console.log и пришли мне. Я скажу что именно не работает!
