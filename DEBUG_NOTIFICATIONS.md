# 🔍 ДЕБАГ: Почему нет уведомлений?

## Шаг 1: Проверь разрешение браузера

Открой Console в DevTools и выполни:

```javascript
// 1. Проверь разрешение на уведомления
console.log('Permission:', Notification.permission);
// Должно быть: 'granted' (если разрешил)
// Если 'default' - не давал разрешение
// Если 'denied' - запретил уведомления

// 2. Проверь есть ли FCM токен
const auth = firebase.auth();
const firestore = firebase.firestore();
const uid = auth.currentUser?.uid;

if (uid) {
  firestore.collection('users').doc(uid).get().then(doc => {
    const data = doc.data();
    console.log('User data:', {
      role: data.role,
      pushOptIn: data.pushOptIn,
      fcmToken: data.fcmToken || 'НЕТ ТОКЕНА'
    });
  });
}
```

## Шаг 2: Проверь Firestore Console

1. Открой: https://console.firebase.google.com/project/coffeeaddict-c9d70/firestore
2. Найди: `users/MswmRmPTBzegI9aex6esxSomUL92`
3. Проверь поля:
   - ✅ `role: 'admin'` - должно быть
   - ✅ `pushOptIn: true` - должно быть (после включения)
   - ✅ `fcmToken: 'xxx...'` - должно быть (после включения)

## Шаг 3: Проверь появлялась ли модалка

**Вопрос**: Ты видел модалку "Включите уведомления" с градиентом?

- ✅ **ДА** - значит модалка работает
- ❌ **НЕТ** - проблема в показе модалки

### Если НЕТ модалки:

```javascript
// Проверь localStorage
console.log('NotificationPrompt dismissed:', localStorage.getItem('notificationPromptDismissed'));
// Если есть значение - пользователь отказался ранее

// Очисти и перезагрузи
localStorage.removeItem('notificationPromptDismissed');
location.reload();
```

## Шаг 4: Проверь Service Worker

```javascript
// Проверь зарегистрирован ли SW
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => console.log('SW scope:', reg.scope));
});

// Проверь FCM Messaging
if ('messaging' in firebase) {
  console.log('Firebase Messaging доступен');
} else {
  console.log('❌ Firebase Messaging НЕ доступен!');
}
```

## Шаг 5: Проверь Cloud Functions логи

```bash
# В терминале на компьютере:
firebase functions:log --only onNewOrderForAdmin --limit 10
```

Ищи:
- ❌ "No admins with notifications enabled"
- ❌ "Failed to send to user"
- ✅ "Sent notification to admin"

## Шаг 6: Ручное включение уведомлений

Если модалка не появилась, включи вручную в консоли:

```javascript
// Запроси разрешение вручную
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
  
  if (permission === 'granted') {
    // Получи FCM токен
    const messaging = firebase.messaging();
    messaging.getToken({
      vapidKey: 'BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU'
    }).then(token => {
      console.log('FCM Token:', token);
      
      // Сохрани в Firestore
      const uid = firebase.auth().currentUser.uid;
      firebase.firestore().collection('users').doc(uid).update({
        fcmToken: token,
        pushOptIn: true,
        role: 'admin'
      }).then(() => {
        console.log('✅ Настройки сохранены!');
      });
    });
  }
});
```

## Частые проблемы:

### 1. "Permission: default" (не давал разрешение)
**Решение**: Включи уведомления через модалку или вручную (Шаг 6)

### 2. "pushOptIn: false" или нет поля
**Решение**: Пользователь не включил уведомления в приложении

### 3. "fcmToken: null" или нет поля
**Решение**: Токен не сохранился, запусти код из Шага 6

### 4. "role: undefined" или нет поля
**Решение**: Запусти `production-setup-once.html` ещё раз

### 5. Модалка не появляется
**Решение**: Очисти localStorage (см. Шаг 3)

### 6. "Firebase Messaging НЕ доступен"
**Решение**: Проверь что браузер поддерживает (Chrome/Edge/Firefox)

---

## 🎯 Быстрая проверка (скопируй в консоль):

```javascript
(async () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const messaging = firebase.messaging();
  
  console.log('=== ПРОВЕРКА УВЕДОМЛЕНИЙ ===');
  console.log('1. Permission:', Notification.permission);
  console.log('2. Current user:', auth.currentUser?.email);
  
  if (auth.currentUser) {
    const doc = await db.collection('users').doc(auth.currentUser.uid).get();
    const data = doc.data();
    console.log('3. User data:', {
      role: data?.role || 'НЕТ',
      pushOptIn: data?.pushOptIn || false,
      fcmToken: data?.fcmToken ? 'ЕСТЬ' : 'НЕТ'
    });
  }
  
  console.log('4. SW:', await navigator.serviceWorker.getRegistrations());
  console.log('=== КОНЕЦ ===');
})();
```

Скопируй результат и пришли мне!
