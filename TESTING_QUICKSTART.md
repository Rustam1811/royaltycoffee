# 🚀 Быстрый старт - Тестирование системы

## ✅ Что готово

### 1. Yandex Maps интеграция
- ✅ TypeScript типы (`admin/src/types/yandex-maps.d.ts`)
- ✅ Конфигурация (`admin/src/config/yandex-maps.ts`)
- ✅ Компонент `CourierTrackingMap` (386 строк, 0 ошибок)

### 2. Real-time GPS трекинг
- ✅ `courierLocationService` с Firestore sync
- ✅ Интеграция в `CourierDashboard`
- ✅ Автоматическое обновление каждые 10 секунд
- ✅ UI для старт/стоп трекинга

### 3. Push-уведомления
- ✅ Cloud Function `onOrderStatusChanged`
- ✅ Синхронизация с `ORDER_STATUS_META`
- ✅ FCM интеграция
- ✅ Автоматическая очистка невалидных токенов
- ✅ **Задеплоено в Firebase!**

---

## 📱 Тестирование (5 минут)

### Шаг 1: Проверить уведомления

#### 1.1. Проверить контент уведомлений
```bash
cd functions
node test-notifications.js content
```

**Ожидаемый вывод:**
```
ACCEPTED:
  Title: ✅ Заказ принят
  Body:  Заказ №ORD-001 принят в работу

PREPARING:
  Title: 👨‍🍳 Готовим ваш заказ
  Body:  Заказ №ORD-001 готовится. Скоро будет готов!

READY:
  Title: 🎉 Заказ готов!
  Body:  Заказ №ORD-001 готов. Ожидаем курьера
...
```

#### 1.2. Проверить FCM токен пользователя
```bash
node test-notifications.js check <userId>
```

**Пример:**
```bash
node test-notifications.js check wm8FdwHhUkPP3i3bDtkjL1RW7ou1
```

**Что проверяется:**
- ✅ Пользователь существует
- ✅ `notificationsEnabled: true`
- ✅ `fcmToken` присутствует

**Если токена нет:**
1. Открыть приложение
2. Разрешить уведомления
3. Токен сохранится автоматически

#### 1.3. Создать тестовый заказ
```bash
node test-notifications.js create <userId>
```

**Пример:**
```bash
node test-notifications.js create wm8FdwHhUkPP3i3bDtkjL1RW7ou1
```

**Вывод:**
```
✅ Test order created!
Order ID: abc123xyz
Order Number: TEST-1729776000000
User ID: wm8FdwHhUkPP3i3bDtkjL1RW7ou1

Now update status with:
  node functions/test-notifications.js abc123xyz READY
```

#### 1.4. Обновить статус заказа (запустит уведомление!)
```bash
node test-notifications.js update <orderId> <newStatus>
```

**Пример:**
```bash
node test-notifications.js update abc123xyz READY
```

**Что происходит:**
1. Обновляется статус в Firestore
2. Firestore trigger запускает Cloud Function
3. Функция отправляет FCM уведомление
4. Уведомление приходит на устройство! 📲

#### 1.5. Проверить логи Cloud Function
```bash
firebase functions:log --only onOrderStatusChanged
```

**Ожидаемый лог (успех):**
```
📝 Order abc123xyz updated
Status: NEW → READY
✅ Successfully sent notification for order abc123xyz
```

**Ожидаемый лог (токен отсутствует):**
```
📝 Order abc123xyz updated
Status: NEW → READY
No FCM token for user wm8FdwHhUkPP3i3bDtkjL1RW7ou1
```

---

### Шаг 2: Тестировать GPS трекинг

#### 2.1. Открыть Courier Dashboard
```
http://localhost:5174/courier-dashboard
```

**Логин:** `courier121@gmail.com`  
**Пароль:** `courierisyou2024!`

#### 2.2. Запустить GPS трекинг
1. Нажать кнопку **"Запустить"**
2. Разрешить доступ к геолокации
3. Увидеть координаты в реальном времени

**Индикатор статуса:**
```
GPS Трекинг
Включен • Обновляется каждые 10 сек
📍 43.238293, 76.889709
```

#### 2.3. Проверить Firestore
Открыть Firebase Console → Firestore → `courierLocations`

**Ожидаемая структура:**
```javascript
courierLocations/{courierId}
  ├─ location
  │   ├─ lat: 43.238293
  │   ├─ lng: 76.889709
  │   ├─ accuracy: 20
  │   ├─ heading: 45
  │   └─ speed: 5.5
  ├─ timestamp: Timestamp
  └─ updatedAt: Timestamp
```

**Обновления:** Каждые 10 секунд!

#### 2.4. Открыть карту доставки
1. В Courier Dashboard найти активный заказ
2. Нажать кнопку **"Показать на карте"**
3. Увидеть:
   - 🔴 Красный маркер клиента (дом)
   - 🔵 Синий маркер курьера (авто) - обновляется в реальном времени!
   - 🛣️ Маршрут между ними
   - ⏱️ ETA overlay (время + расстояние)

---

### Шаг 3: Полный сценарий (E2E тест)

#### 3.1. Создать заказ (как клиент)
```bash
# В Firebase Console или через скрипт
node functions/test-notifications.js create wm8FdwHhUkPP3i3bDtkjL1RW7ou1
```

#### 3.2. Принять заказ (как бариста)
1. Открыть Order Management (`http://localhost:5174/orders`)
2. Логин: `barista121@gmail.com` / `baristaisyou2024!`
3. Найти заказ
4. Нажать **"Принять заказ"** (NEW → ACCEPTED)
5. **📲 Клиент получает уведомление: "✅ Заказ принят"**

#### 3.3. Начать готовить (как бариста)
1. Нажать **"Начать готовить"** (ACCEPTED → PREPARING)
2. **📲 Клиент получает уведомление: "👨‍🍳 Готовим ваш заказ"**

#### 3.4. Заказ готов (как бариста)
1. Нажать **"Заказ готов"** (PREPARING → READY)
2. **📲 Клиент получает уведомление: "🎉 Заказ готов!"**

#### 3.5. Назначить курьера (как admin/dispatcher)
1. В Order Management выбрать курьера
2. Нажать **"Назначить курьера"** (READY → ASSIGNED)
3. **📲 Клиент получает уведомление: "🚗 Назначен курьер"**

#### 3.6. Забрать заказ (как курьер)
1. Открыть Courier Dashboard (`http://localhost:5174/courier-dashboard`)
2. Логин: `courier121@gmail.com` / `courierisyou2024!`
3. Нажать **"Запустить GPS трекинг"**
4. Найти заказ, нажать **"Забрал заказ"** (ASSIGNED → PICKED_UP)
5. **📲 Клиент получает уведомление: "📦 Курьер забрал заказ"**

#### 3.7. В пути к клиенту (как курьер)
1. Нажать **"В пути"** (PICKED_UP → ON_THE_WAY)
2. **📲 Клиент получает уведомление: "🛵 Курьер в пути"**
3. GPS автоматически обновляет позицию каждые 10 сек
4. Клиент может видеть курьера на карте в реальном времени!

#### 3.8. Доставлено (как курьер)
1. Нажать **"Доставлено"** (ON_THE_WAY → DELIVERED)
2. **📲 Клиент получает уведомление: "✨ Заказ доставлен! Приятного аппетита!"**
3. GPS трекинг автоматически останавливается

---

## 🔍 Отладка

### Проблема: Уведомления не приходят

**Проверка 1:** FCM токен
```bash
node functions/test-notifications.js check <userId>
```
- ✅ Должен быть `fcmToken: ✅ Present`
- ❌ Если `fcmToken: ❌ Missing` → открыть приложение, разрешить уведомления

**Проверка 2:** Статус изменился?
```bash
firebase functions:log --only onOrderStatusChanged
```
- Должен быть лог: `Status: OLD → NEW`
- Если нет → статус не изменился

**Проверка 3:** `notifyCustomer = true`?
Посмотреть в `functions/src/orderNotifications.js`:
```javascript
ORDER_STATUS_META.READY.notifyCustomer // должно быть true
```

**Проверка 4:** Cloud Function задеплоена?
```bash
firebase functions:list | grep onOrderStatusChanged
```

---

### Проблема: GPS не обновляется

**Проверка 1:** Разрешена геолокация?
- В браузере должно быть разрешение на геолокацию
- Проверить: Chrome DevTools → Console → Geolocation API

**Проверка 2:** GPS запущен?
- Индикатор должен быть зеленый
- Текст: "Включен • Обновляется каждые 10 сек"

**Проверка 3:** Данные в Firestore?
```bash
# Firebase Console → Firestore → courierLocations/{courierId}
# Должно обновляться каждые 10 секунд
```

**Проверка 4:** Есть активные доставки?
- GPS работает только если есть хотя бы один заказ в статусе:
  - `assigned`, `picked_up`, `on_the_way`, `nearby`

---

## 📊 Мониторинг

### Firebase Console
1. **Functions** → `onOrderStatusChanged`
   - Metrics: Invocations, Errors, Execution time
   - Logs: Real-time function logs

2. **Firestore** → `courierLocations`
   - Проверить real-time updates GPS

3. **Firestore** → `notifications`
   - История всех отправленных уведомлений

### Terminal Logs
```bash
# Cloud Function logs
firebase functions:log --only onOrderStatusChanged

# Admin dev server
cd admin && npm run dev

# Main app dev server
npm run dev
```

---

## ✅ Готово к продакшену!

### Что работает:
1. ✅ Yandex Maps с real-time маркерами
2. ✅ GPS трекинг курьера (Firestore sync)
3. ✅ Push-уведомления (Cloud Function)
4. ✅ Полный order workflow (10 статусов)
5. ✅ Админ панель (Order Management)
6. ✅ Courier Dashboard
7. ✅ Barista Dashboard

### Следующие шаги (опционально):
- [ ] Добавить Client Dashboard для отслеживания заказа
- [ ] Добавить SMS уведомления (через Twilio/Firebase)
- [ ] Добавить Email уведомления
- [ ] Добавить аналитику (Google Analytics, Mixpanel)
- [ ] Добавить оценку доставки (rating)

---

## 📞 Справка

**Учетные записи (admin панель):**
```
Admin:    admin121@gmail.com    / adminisyou2024!
Barista:  barista121@gmail.com  / baristaisyou2024!
Courier:  courier121@gmail.com  / courierisyou2024!
```

**URLs:**
```
Main App:  http://localhost:5173
Admin:     http://localhost:5174
```

**Документация:**
- `ORDER_STATUS_SYSTEM.md` - Архитектура статусов
- `ORDER_STATUS_NOTIFICATIONS.md` - Cloud Function docs
- `COURIER_MAP_INTEGRATION.md` - Yandex Maps integration
- `LOGIN_CREDENTIALS.md` - Credentials

**Команды:**
```bash
# Test notifications
node functions/test-notifications.js content
node functions/test-notifications.js check <userId>
node functions/test-notifications.js create <userId>
node functions/test-notifications.js update <orderId> <status>

# Deploy
firebase deploy --only functions:onOrderStatusChanged
firebase deploy --only hosting

# Logs
firebase functions:log --only onOrderStatusChanged
```

**Enjoy! 🚀☕**
