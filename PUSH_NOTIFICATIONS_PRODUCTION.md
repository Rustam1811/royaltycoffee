# 🔔 Push-уведомления — Production Ready

## 📋 Что реализовано

### ✅ Автоматическая модалка при первом входе
- Красивый UI с градиентом и анимациями (Framer Motion)
- Показывается через 3 секунды после входа (не раздражает)
- Один раз для нового пользователя
- Если отклонил — напоминание через 7 дней
- Если дал разрешение — больше не показывается

### ✅ Умная логика показа
- Проверка поддержки браузера (только современные браузеры)
- Не показывается если уже дал/отклонил разрешение
- Сохранение состояния в localStorage
- Автоматическая инициализация Firebase Messaging

### ✅ Готовые Cloud Functions (все задеплоены!)
- **onOrderStatusChanged** (v2, europe-west1) — уведомления о статусе заказа
- **onPromotionCreated** (v2, europe-west1) — новые акции
- **onStoryCreated** (v1, us-central1) — новые истории
- **reengageInactiveUsers** (v1, us-central1) — CRON реактивация (10:00 AM Asia/Almaty)
- **onNewsCreated** (v1, us-central1) — новости

### ✅ Полная интеграция
- Service Worker регистрируется автоматически
- Foreground notifications со звуком
- Background notifications через Service Worker
- Настройки в профиле пользователя

---

## 🚀 Как это работает для пользователя

### Сценарий 1: Новый пользователь (первый вход)
1. Пользователь заходит в приложение → логинится
2. Через **3 секунды** появляется красивая модалка:
   ```
   ┌─────────────────────────────────────┐
   │  🔔 Не пропусти свой заказ! ☕      │
   │                                     │
   │  Разреши уведомления, чтобы         │
   │  мгновенно узнавать когда твой      │
   │  кофе готов                         │
   │                                     │
   │  ✓ Статус заказа                    │
   │  ✓ Акции и скидки                   │
   │  ✓ Бонусы                           │
   │                                     │
   │  [🔔 Включить уведомления]          │
   │  [Может позже]                      │
   └─────────────────────────────────────┘
   ```

3. **Если нажал "Включить":**
   - Браузер показывает native prompt
   - При разрешении → FCM токен сохраняется в Firestore
   - Модалка больше не показывается
   - Уведомления работают ✅

4. **Если нажал "Может позже":**
   - Модалка закрывается
   - Напоминание через 7 дней
   - Может включить вручную в Профиле

### Сценарий 2: Возвращающийся пользователь
- Если УЖЕ дал разрешение → модалка НЕ показывается
- Если отклонил давно → модалка показывается снова (через 7 дней)
- В любой момент может включить в Профиле → Настройки уведомлений

### Сценарий 3: PWA (добавлено на главный экран)
- Service Worker уже зарегистрирован
- Модалка работает так же
- Уведомления приходят даже когда PWA закрыто

---

## 🛠️ Технические детали

### Файлы созданы:
```
src/
  components/
    NotificationPrompt.tsx          # Красивая модалка
  hooks/
    useNotificationPrompt.ts        # Логика показа
  services/
    notifications.ts                # Уже был, использует VAPID ключ
  App.tsx                           # Интеграция модалки
  
public/
  firebase-messaging-sw.js          # Service Worker (уже был)
```

### Как это работает под капотом:

1. **При входе пользователя** (`App.tsx`):
   ```tsx
   const { shouldShow, dismiss, markAsShown } = useNotificationPrompt(user?.uid);
   
   // Модалка рендерится условно
   {shouldShow && user?.uid && (
     <NotificationPrompt
       userId={user.uid}
       onClose={dismiss}
       onEnabled={markAsShown}
     />
   )}
   ```

2. **Hook `useNotificationPrompt`** проверяет:
   - Есть ли пользователь?
   - Поддерживает ли браузер Notification API?
   - Какой текущий permission? (granted/denied/default)
   - Показывали ли раньше? (localStorage)
   - Прошло ли 7 дней с отклонения?

3. **При клике "Включить"** (`NotificationPrompt.tsx`):
   ```tsx
   const handleEnable = async () => {
     const token = await requestNotificationPermission(userId);
     if (token) {
       onEnabled(); // Скрывает модалку навсегда
     }
   };
   ```

4. **Сервис `requestNotificationPermission`**:
   - Запрашивает `Notification.requestPermission()`
   - Получает FCM токен через `getToken(messaging, { vapidKey })`
   - Сохраняет в `users/{userId}.fcmToken` (старый формат для совместимости)

5. **Cloud Function `onOrderStatusChanged`** (europe-west1):
   - Слушает изменения в `orders/{orderId}`
   - Когда `status` меняется → отправляет FCM через Admin SDK
   - Читает токен из `users/{userId}.fcmToken`

---

## 📝 Переменные окружения

### Обязательно нужен VAPID ключ!

Добавь в `.env` или `.env.local`:
```bash
VITE_FCM_VAPID_KEY=BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU
```

**Без этого ключа уведомления НЕ РАБОТАЮТ!**

Как получить:
1. Firebase Console → Project Settings → Cloud Messaging
2. Web Push certificates → Generate key pair (если нет)
3. Скопировать "Key pair"

---

## 🧪 Как протестировать

### Тест 1: Модалка показывается
1. Открой приложение в **инкогнито** (чистый localStorage)
2. Залогинься
3. Подожди **3 секунды**
4. Должна появиться модалка ✅

### Тест 2: Включение уведомлений
1. Нажми "Включить уведомления" в модалке
2. Браузер попросит разрешение → Разреши
3. Открой DevTools → Console
4. Должно быть: `✅ FCM Token obtained: cXXX...`
5. Проверь Firestore: `users/87053096206/fcmToken` должен быть заполнен

### Тест 3: Уведомление о заказе
1. Создай заказ или открой существующий в Firestore
2. Измени `status` на `"accepted"`
3. Через 2-3 секунды должно прийти уведомление 🔔

### Тест 4: Модалка не показывается повторно
1. Включи уведомления
2. Перезагрузи страницу
3. Модалка НЕ должна показаться ✅

### Тест 5: Напоминание через 7 дней
1. Нажми "Может позже"
2. Открой DevTools → Application → Local Storage
3. Найди ключ `notification-prompt-dismissed-at`
4. Измени timestamp на старую дату (7+ дней назад)
5. Перезагрузи — модалка покажется снова ✅

---

## 🎨 UI/UX особенности

### Модалка:
- **Градиент**: синий → фиолетовый (brand colors)
- **Анимация**: spring animation для плавности
- **Иконка**: колокольчик в белом круге на градиенте
- **3 преимущества**: статус, акции, бонусы
- **2 кнопки**: "Включить" (яркая) и "Может позже" (ненавязчивая)
- **Privacy note**: "Вы сможете отключить в любой момент"

### Тайминги:
- **3 секунды** после входа — показ модалки (не раздражает)
- **7 дней** — повторное напоминание если отклонил
- **2-3 секунды** — доставка уведомления после триггера

### Адаптивность:
- Mobile-first дизайн
- Центрируется на больших экранах
- Slide-up анимация снизу на мобилке
- Тач-friendly кнопки (min 44px)

---

## 🔒 Безопасность

### Firestore Rules:
```javascript
// Пользователь может писать только свой токен
match /users/{userId} {
  allow write: if request.auth.uid == userId;
}

// Cloud Functions пишут в notifications_suppress
match /users/{userId}/notifications_suppress/{type} {
  allow write: if false; // Только Functions
}
```

### Service Worker:
- Регистрируется только на HTTPS (или localhost)
- Токены уникальны для каждого браузера
- Автоматически удаляются при отзыве разрешения

---

## 📊 Мониторинг

### Что логируется:
- Все отправленные уведомления → `notifications_log` collection
- Неудачные попытки (invalid tokens) → автоматическое удаление
- Супрессия дубликатов → `notifications_suppress` subcollection

### Метрики в Firebase Console:
- Cloud Messaging → Dashboard
- Количество отправленных/доставленных
- Open rate (если настроена аналитика)

---

## 🐛 Troubleshooting

### Модалка не показывается:
- Проверь что пользователь авторизован (`user?.uid` не null)
- Проверь localStorage: `notification-prompt-shown`
- Проверь что браузер поддерживает Notification API
- Открой консоль — ошибок быть не должно

### Уведомления не приходят:
1. **Проверь VAPID ключ** в `.env`:
   ```bash
   echo $VITE_FCM_VAPID_KEY
   ```
   
2. **Проверь FCM токен** в Firestore:
   ```javascript
   // В консоли браузера
   const snap = await getDoc(doc(db, 'users', '87053096206'));
   console.log(snap.data().fcmToken);
   ```

3. **Проверь разрешение браузера**:
   ```javascript
   console.log(Notification.permission); // должно быть "granted"
   ```

4. **Проверь Service Worker**:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

5. **Проверь Cloud Function логи**:
   ```bash
   firebase functions:log --only onOrderStatusChanged
   ```

### Модалка показывается постоянно:
- Очисти localStorage: `localStorage.clear()`
- Или удали ключ: `localStorage.removeItem('notification-prompt-shown')`

---

## 🚢 Деплой на прод

### Checklist:
- ✅ VAPID ключ в продакшн `.env`
- ✅ Cloud Functions задеплоены (проверено: `firebase functions:list`)
- ✅ Service Worker в `public/firebase-messaging-sw.js`
- ✅ Firestore rules обновлены
- ✅ Компиляция без ошибок

### Команды:
```bash
# Билд клиента
npm run build

# Деплой на Firebase Hosting
firebase deploy --only hosting

# Деплой функций (если нужно)
cd functions && npm run build && firebase deploy --only functions
```

---

## 🎓 Для других разработчиков

### Если нужно изменить текст модалки:
Редактируй `src/components/NotificationPrompt.tsx`:
- Строка 69: заголовок
- Строка 73: описание
- Строки 78-106: список преимуществ
- Строка 117: текст кнопки

### Если нужно изменить тайминг показа:
Редактируй `src/hooks/useNotificationPrompt.ts`:
- Строка 6: `REMIND_AFTER_DAYS = 7` — период напоминания
- Строка 49: `setTimeout(() => {}, 3000)` — задержка показа

### Если нужно добавить аналитику:
В `NotificationPrompt.tsx` добавь:
```tsx
const handleEnable = async () => {
  // Твоя аналитика
  analytics.track('notification_prompt_accepted');
  
  const token = await requestNotificationPermission(userId);
  // ...
};
```

---

## ✨ Итог

**Что получили:**
- ✅ Production-ready решение
- ✅ Красивый UI/UX
- ✅ Умная логика показа
- ✅ Полная интеграция
- ✅ Все функции задеплоены
- ✅ Работает в PWA
- ✅ Безопасно
- ✅ Легко поддерживать

**Как работает для пользователя:**
1. Заходит → видит модалку через 3 сек
2. Включает → получает уведомления
3. Заказывает кофе → моментально узнает когда готово

**Готово к проду!** 🚀
