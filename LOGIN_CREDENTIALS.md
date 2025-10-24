# 🔐 Учётные данные для входа в админ-панель

## Production URL
**https://coffeeaddict-c9d70.web.app/admin**

---

## 👥 Учётные записи

### 👑 Администратор
- **Email**: `admin121@gmail.com`
- **Пароль**: `adminisyou`
- **Доступ**: Полный (14 разделов)

### ☕ Бариста
- **Email**: `barista121@gmail.com`
- **Пароль**: `baristaisyou`
- **Доступ**: Главная, Заказы, POS, Меню

### 🚚 Курьер
- **Email**: `courier121@gmail.com`
- **Пароль**: `courierisyou`
- **Доступ**: Мои доставки, Мои документы, Заказы

---

## 📋 Что видит каждая роль

### 👑 Admin - Полный доступ
```
✅ Главная
✅ Заказы
✅ POS
✅ Меню
✅ Аналитика
✅ Бонусы
✅ Достижения
✅ Акции
✅ Истории
✅ Пользователи
✅ Доставка
✅ Курьеры
```

### ☕ Barista - Работа с заказами
```
✅ Главная
✅ Заказы
✅ POS
✅ Меню
```

### 🚚 Courier - Доставка
```
✅ Мои доставки (GPS-трекинг)
✅ Мои документы (загрузка ID)
✅ Заказы (просмотр)
```

---

## 🚀 Быстрый старт

### 1. Открыть админ-панель
```
https://coffeeaddict-c9d70.web.app/admin
```

### 2. Войти с нужной ролью
- Админ → `admin121@gmail.com` / `adminisyou`
- Бариста → `barista121@gmail.com` / `baristaisyou`
- Курьер → `courier121@gmail.com` / `courierisyou`

### 3. Проверить функционал

#### Для админа:
- Открыть "Аналитика" - должна быть доступна
- Открыть "Курьеры" - список курьеров (пока пустой)
- Открыть "Доставка" - управление доставками

#### Для баристы:
- Открыть "Заказы" - список заказов
- Открыть "POS" - касса
- Открыть "Меню" - управление меню
- Попытаться открыть "Аналитика" - должен быть запрещён доступ

#### Для курьера:
- Открыть "Мои доставки" - личные доставки с GPS
- Открыть "Мои документы" - загрузка удостоверения
- Открыть "Заказы" - все заказы
- Попытаться открыть другие разделы - не должны отображаться в меню

---

## 📦 Состояние данных

### ✅ Удалены mock-данные
- ❌ `mockCouriers` в DeliveryManagement.tsx
- ❌ `mockCouriers` в CourierManagement.tsx
- ❌ `mockDeliveries` в CourierDashboard.tsx

### 🔄 Требуется интеграция с Firebase
Следующие компоненты готовы к подключению Firestore:
1. **CourierManagement** - коллекция `couriers`
2. **DeliveryManagement** - коллекция `orders` с фильтром `type: 'delivery'`
3. **CourierDashboard** - коллекция `orders` с фильтром `courierId: user.uid`

---

## 🔒 Безопасность

### Firebase Authentication
- Email/Password authentication включён
- Роли определяются по email allowlist в `UserContext.tsx`

### Firestore Rules (требуется настройка)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Проверка роли по email
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email in ['admin121@gmail.com'];
    }
    
    function isBarista() {
      return request.auth != null && 
             request.auth.token.email in ['barista121@gmail.com'];
    }
    
    function isCourier() {
      return request.auth != null && 
             request.auth.token.email in ['courier121@gmail.com'];
    }
    
    // Заказы
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow write: if isAdmin() || isBarista();
    }
    
    // Документы курьеров
    match /courierDocuments/{userId} {
      allow read: if isAdmin() || (request.auth.uid == userId && isCourier());
      allow write: if request.auth.uid == userId && isCourier();
    }
    
    // Курьеры
    match /couriers/{courierId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

---

## 📝 Следующие шаги

### 1. Создать учётные записи в Firebase Auth
```bash
# В Firebase Console:
1. Authentication → Users → Add user
2. Email: admin121@gmail.com, Password: adminisyou
3. Email: barista121@gmail.com, Password: baristaisyou
4. Email: courier121@gmail.com, Password: courierisyou
```

### 2. Настроить Firestore Collections
```
couriers/
  {courierId}/
    - name
    - phone
    - email
    - isAvailable
    - rating
    - vehicle
    
orders/
  {orderId}/
    - type: 'delivery' | 'pickup'
    - status
    - courierId
    - customerInfo
    - deliveryAddress
    
courierDocuments/
  {userId}/
    - idFrontUrl
    - idBackUrl
    - photoUrl
    - fullName
    - phone
    - verificationStatus
```

### 3. Обновить Firestore Rules
Применить правила безопасности из раздела выше

### 4. Протестировать все роли
- Вход под каждой учёткой
- Проверка доступа к разделам
- Работа с данными

---

## 🐛 Troubleshooting

### Проблема: "Нет доступа" при входе
**Решение**: Проверить email в `admin/src/contexts/UserContext.tsx`:
```typescript
const ADMIN_EMAILS   = ["admin121@gmail.com"];
const BARISTA_EMAILS = ["barista121@gmail.com"];
const COURIER_EMAILS = ["courier121@gmail.com"];
```

### Проблема: Не отображаются пункты меню
**Решение**: Проверить `roles` в `ResponsiveAdminNavigation.tsx`:
```typescript
{
  id: 'orders',
  label: 'Заказы',
  route: 'orders',
  roles: ['admin', 'barista', 'courier'] // Кто может видеть
}
```

### Проблема: Firebase Auth error
**Решение**: Проверить `.env` файлы с Firebase credentials

---

## 📊 Статус проекта

- ✅ Роли настроены (admin, barista, courier)
- ✅ Email изменены на @gmail.com
- ✅ Mock-данные удалены
- ✅ Навигация настроена для каждой роли
- ✅ Система документов курьера готова
- ✅ Задеплоено в production
- ⏳ Требуется создание учёток в Firebase Auth
- ⏳ Требуется интеграция с Firestore

---

**Дата**: 23 октября 2025  
**Deployed**: https://coffeeaddict-c9d70.web.app/admin
