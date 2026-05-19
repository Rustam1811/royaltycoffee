# Multi-Location Management System

## Архитектура

Система управления сетью из 10 кофеен с раздельными админками и централизованной аналитикой.

### Основные компоненты

#### 1. **Типы и интерфейсы** (`admin/src/types/location.ts`)
- `Location` - информация о точке (название, адрес, телефон, статус)
- `LocationStats` - статистика точки (выручка, заказы, средний чек, рост)
- `LocationAnalytics` - объединенные данные локации + статистика
- `MAX_LOCATIONS = 10` - максимальное количество точек

#### 2. **Контекст локаций** (`admin/src/contexts/LocationContext.tsx`)
- Управление состоянием выбранной локации
- Кэширование выбора в `localStorage`
- Автоматическая загрузка списка локаций
- Хук `useLocation()` для доступа к контексту

#### 3. **Сервис** (`admin/src/services/locationService.ts`)
- `getLocations()` - получить все локации
- `getLocation(id)` - получить одну локацию
- `createLocation(data)` - создать новую локацию (макс 10)
- `updateLocation(id, data)` - обновить локацию
- `deleteLocation(id)` - удалить локацию
- `getLocationStats(id)` - получить статистику точки
- `getAllLocationsAnalytics()` - получить аналитику всех точек

#### 4. **API** (`admin/api/locations.js`)
Серверный endpoint с Firebase Admin:
- **GET** `/api/locations?action=list` - список всех локаций
- **GET** `/api/locations?action=get&id=XXX` - одна локация
- **POST** `/api/locations?action=create` - создать локацию
- **PUT** `/api/locations?action=update&id=XXX` - обновить локацию
- **DELETE** `/api/locations?action=delete&id=XXX` - удалить локацию
- **GET** `/api/locations?action=stats&id=XXX` - статистика локации
- **GET** `/api/locations?action=analytics` - аналитика всех локаций

#### 5. **UI Компоненты**

##### `LocationSelector` (`admin/src/components/LocationSelector.tsx`)
- Dropdown для выбора активной локации
- Отображается только для owner
- Показывает название, адрес и статус каждой точки
- Индикатор текущей выбранной локации

##### `DashboardPage` (`admin/src/pages/DashboardPage.tsx`)
- Главный дашборд с общей аналитикой (только для owner)
- Карточки сводной статистики: общая выручка, заказы, средний чек
- Рейтинг точек по выручке с цветовой индикацией (золото, серебро, бронза)
- Индикатор роста/падения для каждой точки

##### `LocationsManagementPage` (`admin/src/pages/LocationsManagementPage.tsx`)
- Управление точками (только для owner)
- Грид с карточками локаций
- Создание/редактирование/удаление точек
- Подтверждение удаления (двойной клик)
- Счетчик использованных точек (N из 10)

##### `LocationFormModal` (`admin/src/components/LocationFormModal.tsx`)
- Модальное окно для создания/редактирования точки
- Поля: название, адрес, телефон, активность
- Валидация обязательных полей
- Анимированное появление/исчезновение

### Интеграция с заказами

#### Обновления в типах заказов
- Добавлено поле `locationId` в интерфейс `Order`
- API заказов поддерживает фильтрацию по `locationId`

#### Фильтрация заказов
В `OrderManagement.tsx`:
- **Owner** видит все заказы со всех точек
- **Остальные роли** видят только заказы своей выбранной точки
- Real-time обновления через Firestore с учетом фильтра по локации

### Firestore структура

#### Коллекция `locations`
```
locations/
  {locationId}/
    name: string
    address: string
    phone: string
    isActive: boolean
    createdAt: Timestamp
    updatedAt: Timestamp
```

#### Коллекция `orders` (обновлено)
```
orders/
  {orderId}/
    ...existing fields...
    locationId: string  // <-- новое поле
```

### Роуты

- `/admin/dashboard` - главный дашборд (для owner - аналитика сети, для остальных - старая версия)
- `/admin/locations` - управление точками (только owner)

### Навигация

Обновлено в `ResponsiveAdminNavigation.tsx`:
- Пункт "Точки" (owner only)
- `LocationSelector` в header (owner only)

### Права доступа

#### Owner (role: 'owner')
- ✅ Видит все 10 точек
- ✅ Может переключаться между точками через LocationSelector
- ✅ Доступ к дашборду с общей аналитикой
- ✅ Управление точками (создание, редактирование, удаление)
- ✅ Видит заказы со всех точек

#### Admin / Barista / Other roles
- ❌ Не видят LocationSelector
- ❌ Нет доступа к странице управления точками
- ❌ Нет доступа к общей аналитике
- ✅ Работают только с заказами своей точки
- ✅ У каждой точки своя админка

### Production Deployment

#### 1. Firebase Functions
Добавить `locations.js` в `functions/` и обновить `functions/index.js`:
```javascript
exports.locations = require('./locations');
```

#### 2. Firebase Hosting
Обновить `firebase.json`:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/locations**",
        "function": "locations"
      }
    ]
  }
}
```

#### 3. Firestore Rules
Добавить правила для коллекции `locations`:
```
match /locations/{locationId} {
  allow read: if isStaff();
  allow write: if isOwner();
}
```

#### 4. Firestore Indexes
Создать индекс для заказов:
```
Collection: orders
Fields: locationId (Ascending), createdAt (Descending)
```

### Зависимости

Установлены:
- `@headlessui/react` - для LocationSelector dropdown
- `clsx` - для условных классов
- `tailwind-merge` - для слияния Tailwind классов

### Environment Variables

Убедитесь, что установлены переменные окружения:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
```

### Тестирование

1. **Создание локации**: `/admin/locations` → "Добавить точку"
2. **Переключение локации**: LocationSelector в header (только owner)
3. **Просмотр аналитики**: `/admin/dashboard` (только owner)
4. **Фильтрация заказов**: автоматически по выбранной локации

### Масштабирование

Если нужно увеличить лимит точек:
1. Изменить `MAX_LOCATIONS` в `admin/src/types/location.ts`
2. Обновить проверку лимита в `admin/api/locations.js`

---

## 🎉 Система готова к продакшену!
