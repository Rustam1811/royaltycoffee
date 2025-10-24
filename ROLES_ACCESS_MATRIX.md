# Матрица доступа по ролям

## Роли в системе

1. **Admin** (`admin121@gmail.com` / `adminisyou`) - Полный доступ
2. **Barista** (`barista121@gmail.com` / `baristaisyou`) - Работа с заказами и меню
3. **Courier** (`courier121@gmail.com` / `courierisyou`) - Доставка заказов

---

## Таблица доступа

| Страница | Маршрут | Admin | Barista | Courier | Описание |
|----------|---------|-------|---------|---------|----------|
| **Главная** | `/admin/dashboard` | ✅ | ✅ | ❌ | Общая статистика и дашборд |
| **Мои доставки** | `/admin/courier-dashboard` | ❌ | ❌ | ✅ | Личные доставки курьера с GPS |
| **Мои документы** | `/admin/courier-documents` | ❌ | ❌ | ✅ | Загрузка удостоверений курьера |
| **Заказы** | `/admin/orders` | ✅ | ✅ | ✅ | Управление заказами |
| **POS** | `/admin/pos` | ✅ | ✅ | ❌ | Касса для приёма заказов |
| **Меню** | `/admin/menu` | ✅ | ✅ | ❌ | Управление меню продуктов |
| **Аналитика** | `/admin/analytics` | ✅ | ❌ | ❌ | Графики и отчёты |
| **Бонусы** | `/admin/bonuses` | ✅ | ❌ | ❌ | Настройки бонусной системы |
| **Достижения** | `/admin/achievements` | ✅ | ❌ | ❌ | Управление достижениями |
| **Акции** | `/admin/promotions` | ✅ | ❌ | ❌ | Промо-коды и акции |
| **Истории** | `/admin/stories` | ✅ | ❌ | ❌ | Instagram Stories |
| **Пользователи** | `/admin/users` | ✅ | ❌ | ❌ | База клиентов |
| **Доставка** | `/admin/delivery` | ✅ | ❌ | ❌ | Настройки доставки |
| **Курьеры** | `/admin/couriers` | ✅ | ❌ | ❌ | Управление курьерами |

---

## Детальное описание по ролям

### 👑 Admin (Администратор)
**Доступ**: Полный

**Основные функции**:
- Управление всеми заказами
- Настройка меню и цен
- Аналитика и отчёты
- Управление бонусами, достижениями, акциями
- Контент-менеджмент (Stories)
- База пользователей
- Настройки доставки
- Управление курьерами и баристами

**Навигация**:
```
📊 Главная
📋 Заказы
💳 POS
🍰 Меню
📈 Аналитика
🎁 Бонусы
🏆 Достижения
📢 Акции
📸 Истории
👥 Пользователи
🚚 Доставка
📍 Курьеры
```

---

### ☕ Barista (Бариста)
**Доступ**: Работа с заказами и меню

**Основные функции**:
- Просмотр и обработка заказов
- Изменение статуса заказов (готовка, готово)
- Работа с POS-системой (касса)
- Просмотр и редактирование меню

**Навигация**:
```
📊 Главная
📋 Заказы
💳 POS
🍰 Меню
```

**Ограничения**:
- ❌ Нет доступа к аналитике
- ❌ Не может управлять бонусами/акциями
- ❌ Не видит базу пользователей
- ❌ Не управляет курьерами

---

### 🚚 Courier (Курьер)
**Доступ**: Доставка заказов

**Основные функции**:
- Просмотр своих доставок
- GPS-трекинг в реальном времени
- Обновление статуса доставки
- Просмотр всех заказов (для координации)
- Загрузка документов (удостоверение, фото)

**Навигация**:
```
🚚 Мои доставки
📄 Мои документы
📋 Заказы
```

**Требования**:
- ⚠️ Обязательная загрузка документов
- ⚠️ Верификация администратором
- 🔒 Без верификации нельзя принимать доставки

---

## Логика редиректов

### При входе в систему:

```typescript
if (userRole === 'courier') {
  redirect('/admin/courier-dashboard')
} else {
  redirect('/admin/dashboard')
}
```

### Стартовые страницы:
- **Admin** → `/admin/dashboard` (Главная)
- **Barista** → `/admin/dashboard` (Главная)
- **Courier** → `/admin/courier-dashboard` (Мои доставки)

---

## Технические детали

### Конфигурация ролей
Файл: `admin/src/contexts/UserContext.tsx`

```typescript
export type Role = "owner" | "admin" | "barista" | "courier" | "user";

const ADMIN_EMAILS = ["admin121@gmail.com"];
const BARISTA_EMAILS = ["barista121@gmail.com"];
const COURIER_EMAILS = ["courier121@gmail.com"];
```

### Проверка доступа в навигации
Файл: `admin/src/components/ResponsiveAdminNavigation.tsx`

```typescript
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'orders',
    label: 'Заказы',
    icon: ClipboardDocumentListIcon,
    route: 'orders',
    roles: ['admin', 'barista', 'courier'] // Доступ для всех
  },
  {
    id: 'menu',
    label: 'Меню',
    icon: CogIcon,
    route: 'menu',
    roles: ['admin', 'barista'] // Только админ и бариста
  },
  // ...
];
```

### Проверка доступа в маршрутах
Файл: `admin/src/routes/ResponsiveAdminRoutes.tsx`

```typescript
<Route exact path="/admin/analytics">
  <div className="bg-white rounded-lg shadow p-6">
    {userRole === 'admin' ? <Analytics /> : <div>Нет доступа</div>}
  </div>
</Route>
```

---

## Примеры использования

### Бариста заходит в систему:
1. Логин: `barista121@gmail.com` / Пароль: `baristaisyou`
2. Попадает на "Главная"
3. Видит меню: Главная, Заказы, POS, Меню
4. Может обрабатывать заказы
5. Может работать с кассой
6. Может просматривать/редактировать меню

### Курьер заходит в систему:
1. Логин: `courier121@gmail.com` / Пароль: `courierisyou`
2. Попадает на "Мои доставки"
3. Видит меню: Мои доставки, Мои документы, Заказы
4. При первом входе должен загрузить документы
5. После верификации может брать доставки
6. Может отслеживать GPS и обновлять статусы

---

## Безопасность

### Firebase Security Rules

```javascript
// Firestore
match /orders/{orderId} {
  // Все авторизованные пользователи могут читать
  allow read: if request.auth != null;
  
  // Только админ и бариста могут создавать/обновлять
  allow write: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.role == 'barista');
}

match /courierDocuments/{userId} {
  // Курьер может читать только свои документы
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Курьер может писать только свои документы
  allow write: if request.auth != null && request.auth.uid == userId;
  
  // Админ может читать все документы
  allow read: if request.auth != null && request.auth.token.role == 'admin';
}
```

---

## Changelog

### 2025-10-23
- ✅ Добавлена роль Courier
- ✅ Создана система документов курьера
- ✅ Обновлена навигация для всех ролей
- ✅ Бариста получил доступ к Меню
- ✅ Курьер получил доступ к Заказам
- ✅ Мигрирована система ролей на новую архитектуру

---

**URL Production**: https://coffeeaddict-c9d70.web.app/admin
