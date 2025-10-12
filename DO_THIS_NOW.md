# 🎯 ФИНАЛЬНАЯ ИНСТРУКЦИЯ: Включи уведомления ПРЯМО СЕЙЧАС

## Сейчас ты ДОЛЖЕН сделать 2 вещи:

### 1. В АДМИНКЕ - включить уведомления

1. Открой: **https://coffeeaddict-c9d70.web.app/admin/**
2. Залогинься как `admin@mail.com` (или admin121@gmail.com)
3. Открой **DevTools → Console** (F12)
4. **Скопируй и выполни этот скрипт**:

```javascript
(async () => {
  console.log('🔧 НАСТРОЙКА АДМИНА');
  
  const { getAuth } = await import('firebase/auth');
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { getMessaging, getToken } = await import('firebase/messaging');
  
  const auth = getAuth();
  const db = getFirestore();
  const messaging = getMessaging();
  
  if (!auth.currentUser) {
    console.error('❌ Не залогинен! Залогинься сначала!');
    return;
  }
  
  // 1. Запрос разрешения
  console.log('1. Запрашиваю разрешение браузера...');
  const permission = await Notification.requestPermission();
  console.log('   Permission:', permission);
  
  if (permission !== 'granted') {
    console.error('❌ Браузер НЕ разрешил! Разреши в настройках браузера!');
    return;
  }
  
  // 2. Получение FCM токена
  console.log('2. Получаю FCM токен...');
  const token = await getToken(messaging, {
    vapidKey: 'BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU'
  });
  console.log('   Token:', token.substring(0, 30) + '...');
  
  // 3. Сохранение в Firestore
  console.log('3. Сохраняю в Firestore...');
  await setDoc(doc(db, 'users', auth.currentUser.uid), {
    role: 'admin',
    pushOptIn: true,
    fcmToken: token,
    notificationsEnabled: true,
    email: auth.currentUser.email,
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✅ ГОТОВО! Админ настроен!');
  console.log('Теперь создай тестовый заказ в клиенте!');
})();
```

---

### 2. В КЛИЕНТЕ - включить уведомления

1. Открой **НОВУЮ ВКЛАДКУ**: **https://coffeeaddict-c9d70.web.app/**
2. **Залогинься через Google**
3. Открой **DevTools → Console**
4. **Скопируй и выполни**:

```javascript
(async () => {
  console.log('🔧 НАСТРОЙКА КЛИЕНТА');
  
  const { getAuth } = await import('firebase/auth');
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { getMessaging, getToken } = await import('firebase/messaging');
  
  const auth = getAuth();
  const db = getFirestore();
  const messaging = getMessaging();
  
  if (!auth.currentUser) {
    console.error('❌ Залогинься через Google сначала!');
    return;
  }
  
  // 1. Разрешение
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.error('❌ Браузер НЕ разрешил!');
    return;
  }
  
  // 2. FCM токен
  const token = await getToken(messaging, {
    vapidKey: 'BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU'
  });
  
  // 3. Сохранение
  await setDoc(doc(db, 'users', auth.currentUser.uid), {
    pushOptIn: true,
    fcmToken: token,
    subscribePromotions: true,
    subscribeStories: true,
    notificationsEnabled: true,
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✅ ГОТОВО! Клиент настроен!');
})();
```

---

## 3. СОЗДАЙ ТЕСТОВЫЙ ЗАКАЗ

В клиенте (где только что включил уведомления):

1. Добавь что-то в корзину
2. Оформи заказ
3. **Переключись на вкладку АДМИНКИ**
4. **ДОЛЖНО ПРИЙТИ УВЕДОМЛЕНИЕ!** 🔔

---

## 4. Проверка логов

После создания заказа выполни в терминале:

```bash
firebase functions:log --only onNewOrderForAdmin -n 5
```

Должны увидеть:
```
✅ New order created: xxx
✅ Sent notification to admin
```

Если видишь:
```
❌ No admins with notifications enabled
```

Значит скрипт из шага 1 не выполнился! Повтори!

---

## 5. Если ВСЁ РАВНО НЕ РАБОТАЕТ

Проверь в **Firestore Console**:

1. Открой: https://console.firebase.google.com/project/coffeeaddict-c9d70/firestore
2. Перейди в `users` → найди админа
3. **ДОЛЖНО БЫТЬ**:
   ```
   role: "admin"
   pushOptIn: true
   fcmToken: "xxx..."
   ```

Если этих полей НЕТ - скрипт не выполнился! Проверь ошибки в консоли!

---

## 🎯 ИТОГ

После выполнения ОБОИХ скриптов:
- ✅ Админ получает уведомления о новых заказах
- ✅ Клиент получает уведомления о принятии заказа, акциях, историях

**ВЫПОЛНИ СКРИПТЫ И СОЗДАЙ ЗАКАЗ! ПРИШЛИ РЕЗУЛЬТАТ!** 🚀
