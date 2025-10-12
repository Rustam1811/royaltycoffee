# 🔍 ПОЛНАЯ ДИАГНОСТИКА УВЕДОМЛЕНИЙ

## Шаг 1: Проверь АДМИНКУ

Открой https://coffeeaddict-c9d70.web.app/admin/ и выполни в консоли:

```javascript
(async () => {
  console.log('=== ДИАГНОСТИКА АДМИНА ===');
  
  // 1. Проверка переменных окружения
  console.log('1. ENV переменные:');
  console.log('   VITE_FCM_VAPID_KEY:', import.meta.env.VITE_FCM_VAPID_KEY ? 'ЕСТЬ (' + import.meta.env.VITE_FCM_VAPID_KEY.substring(0, 20) + '...)' : '❌ НЕТ');
  console.log('   VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? 'ЕСТЬ' : '❌ НЕТ');
  
  // 2. Проверка Firebase Auth
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  console.log('2. Auth:', user ? '✅ Залогинен: ' + user.email : '❌ НЕ ЗАЛОГИНЕН');
  
  if (!user) {
    console.error('❌ ПРОБЛЕМА: Залогинься сначала!');
    return;
  }
  
  // 3. Проверка Firestore
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const db = getFirestore();
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  
  if (!userDoc.exists()) {
    console.error('❌ ПРОБЛЕМА: Документ пользователя НЕ существует!');
    return;
  }
  
  const data = userDoc.data();
  console.log('3. Firestore данные:', {
    role: data.role || '❌ НЕТ',
    pushOptIn: data.pushOptIn || false,
    fcmToken: data.fcmToken ? 'ЕСТЬ' : '❌ НЕТ',
    notificationsEnabled: data.notificationsEnabled !== false
  });
  
  // 4. Проверка Notification API
  console.log('4. Notification API:');
  console.log('   Поддерживается:', 'Notification' in window ? '✅' : '❌');
  console.log('   Permission:', Notification.permission);
  
  // 5. Проверка Service Worker
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log('5. Service Worker:', registrations.length > 0 ? '✅ ЕСТЬ' : '❌ НЕТ');
  registrations.forEach(reg => {
    console.log('   Scope:', reg.scope);
    console.log('   Active:', reg.active?.state);
  });
  
  // 6. Проверка Firebase Messaging
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    console.log('6. Firebase Messaging:', supported ? '✅ Поддерживается' : '❌ НЕ поддерживается');
  } catch (e) {
    console.error('6. Firebase Messaging:', '❌ Ошибка:', e.message);
  }
  
  console.log('=== ИТОГ ===');
  
  // Итоговая проверка
  const issues = [];
  if (!import.meta.env.VITE_FCM_VAPID_KEY) issues.push('VAPID key отсутствует');
  if (!import.meta.env.VITE_FIREBASE_API_KEY) issues.push('Firebase config отсутствует');
  if (!data.role) issues.push('role не установлена');
  if (!data.pushOptIn) issues.push('pushOptIn не установлена (нужно включить уведомления)');
  if (!data.fcmToken) issues.push('fcmToken отсутствует (нужно включить уведомления)');
  if (Notification.permission !== 'granted') issues.push('Браузер НЕ разрешил уведомления');
  if (registrations.length === 0) issues.push('Service Worker не зарегистрирован');
  
  if (issues.length === 0) {
    console.log('✅ ВСЁ В ПОРЯДКЕ! Уведомления должны работать!');
    console.log('Создай тестовый заказ и проверь.');
  } else {
    console.error('❌ НАЙДЕНЫ ПРОБЛЕМЫ:');
    issues.forEach((issue, i) => console.error(`   ${i + 1}. ${issue}`));
  }
})();
```

---

## Шаг 2: Проверь КЛИЕНТА

Открой https://coffeeaddict-c9d70.web.app/ и выполни в консоли:

```javascript
(async () => {
  console.log('=== ДИАГНОСТИКА КЛИЕНТА ===');
  
  // 1. Проверка переменных окружения
  console.log('1. ENV переменные:');
  console.log('   VITE_FCM_VAPID_KEY:', import.meta.env.VITE_FCM_VAPID_KEY ? 'ЕСТЬ' : '❌ НЕТ');
  
  // 2. Проверка Firebase Auth
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  console.log('2. Auth:', user ? '✅ Залогинен: ' + user.email : '❌ НЕ ЗАЛОГИНЕН');
  
  if (!user) {
    console.error('❌ ПРОБЛЕМА: Залогинься через Google!');
    return;
  }
  
  // 3. Проверка Firestore
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const db = getFirestore();
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  
  const data = userDoc.exists() ? userDoc.data() : {};
  console.log('3. Firestore данные:', {
    pushOptIn: data.pushOptIn || false,
    subscribePromotions: data.subscribePromotions || false,
    subscribeStories: data.subscribeStories || false,
    fcmToken: data.fcmToken ? 'ЕСТЬ' : '❌ НЕТ'
  });
  
  // 4. Проверка Notification API
  console.log('4. Notification permission:', Notification.permission);
  
  // 5. Проверка Service Worker
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log('5. Service Worker:', registrations.length > 0 ? '✅ ЕСТЬ' : '❌ НЕТ');
  
  console.log('=== ИТОГ ===');
  
  const issues = [];
  if (!data.pushOptIn) issues.push('pushOptIn не установлена');
  if (!data.fcmToken) issues.push('fcmToken отсутствует');
  if (Notification.permission !== 'granted') issues.push('Браузер НЕ разрешил');
  
  if (issues.length === 0) {
    console.log('✅ Клиент настроен правильно!');
  } else {
    console.error('❌ ПРОБЛЕМЫ:', issues);
  }
})();
```

---

## Шаг 3: Проверь Cloud Functions

В терминале:

```bash
firebase functions:log --only onNewOrderForAdmin -n 5
```

Ищи:
- ✅ "New order created: xxx"
- ❌ "No admins with notifications enabled"
- ❌ "Failed to send to user"

---

## Шаг 4: Проверь Firestore Console

1. Открой: https://console.firebase.google.com/project/coffeeaddict-c9d70/firestore
2. Перейди в коллекцию `users`
3. Найди админа (email: admin@mail.com или admin121@gmail.com)
4. Проверь поля:
   - `role: "admin"` ✅ Должно быть
   - `pushOptIn: true` ✅ Должно быть
   - `fcmToken: "xxx..."` ✅ Должно быть

---

## Шаг 5: Ручное включение (если модалка не появляется)

### В АДМИНКЕ:

```javascript
import { getMessaging, getToken } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

// 1. Запроси разрешение
const permission = await Notification.requestPermission();
console.log('Permission:', permission);

if (permission === 'granted') {
  // 2. Получи токен
  const token = await getToken(messaging, {
    vapidKey: 'BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU'
  });
  
  console.log('FCM Token:', token);
  
  // 3. Сохрани в Firestore
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'users', uid), {
    role: 'admin',
    pushOptIn: true,
    fcmToken: token,
    email: auth.currentUser.email,
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✅ Всё сохранено!');
}
```

---

## ПРИШЛИ МНЕ РЕЗУЛЬТАТЫ ВСЕХ ПРОВЕРОК!

Скопируй вывод консоли из:
1. Диагностики админки
2. Диагностики клиента
3. Firebase Functions логов

Тогда точно найдём проблему! 🎯
