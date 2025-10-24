# Система документов курьера

## Обзор
Реализована система верификации документов для курьеров с целью защиты от потери заказов и обеспечения юридической ответственности.

## Что было сделано

### 1. Обновлена система ролей
- **Файл**: `admin/src/contexts/UserContext.tsx`
- **Изменения**:
  - Добавлена роль `'courier'` в тип `Role`
  - Добавлен email `courier121@gmail.com` в `COURIER_EMAILS`
  - Обновлена логика определения роли в `roleFromEmail()` и `resolveRoleFromClaimsAndEmail()`

### 2. Создана страница документов курьера
- **Файл**: `admin/src/pages/CourierDocumentsPage.tsx`
- **Функционал**:
  - Загрузка удостоверения личности (лицевая и обратная стороны)
  - Загрузка фотографии курьера
  - Форма с личными данными:
    * ФИО
    * Номер телефона
    * Адрес
    * Контакт для экстренных случаев
    * Телефон экстренного контакта
  - Статусы верификации:
    * `unverified` - не загружено
    * `pending` - на проверке
    * `verified` - проверено администратором

### 3. Интеграция с Firebase
- **Storage**: `courierDocuments/{uid}/{type}_{timestamp}.jpg`
  - `id_front` - лицевая сторона удостоверения
  - `id_back` - обратная сторона удостоверения
  - `photo` - фото курьера
- **Firestore**: коллекция `courierDocuments`
  ```typescript
  interface CourierDocuments {
    uid: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    photoUrl?: string;
    fullName: string;
    phone: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    verificationStatus: 'unverified' | 'pending' | 'verified';
    updatedAt: Timestamp;
  }
  ```

### 4. Обновлена навигация
- **ResponsiveAdminNavigation**: добавлен пункт "Мои документы" с иконкой `DocumentTextIcon`
- **ResponsiveAdminRoutes**: добавлен маршрут `/admin/courier-documents`
- Доступ только для роли `'courier'`

### 5. Миграция системы ролей
Полностью мигрирована старая система `UserRole` enum на новую `Role` string union:
- ✅ `ResponsiveAdminRoutes.tsx`
- ✅ `ResponsiveAdminNavigation.tsx`
- ✅ `MobileAdminRoutes.tsx`
- ✅ `MobileAdminNavigation.tsx`
- ✅ `OrderManagement.tsx`

## Аутентификация

### Учётные записи:
- **Администратор**: `admin121@gmail.com` / `adminisyou`
- **Бариста**: `barista121@gmail.com` / `baristaisyou`
- **Курьер**: `courier121@gmail.com` / `courierisyou`

### Логика входа:
1. Пользователь вводит email/пароль
2. `UserContext` проверяет email по спискам `ADMIN_EMAILS`, `BARISTA_EMAILS`, `COURIER_EMAILS`
3. Назначается соответствующая роль
4. Перенаправление:
   - Курьер → `/admin/courier-dashboard`
   - Остальные → `/admin/dashboard`

## Workflow курьера

### 1. Первый вход
1. Курьер заходит через `courier121@gmail.com`
2. Видит предупреждение о необходимости загрузки документов
3. Переходит в "Мои документы"

### 2. Загрузка документов
1. Загружает фото лицевой стороны удостоверения
2. Загружает фото обратной стороны
3. Загружает своё фото
4. Заполняет личные данные
5. Нажимает "Сохранить документы"
6. Статус меняется на `pending`

### 3. Верификация админом
1. Админ проверяет документы в Firebase Console или через будущую админ-панель
2. Обновляет `verificationStatus` на `verified`
3. Курьер получает доступ к доставкам

## Юридическая защита

### Цель
Обеспечить возможность взыскания ущерба при пропаже заказа.

### Собираемые данные:
- Удостоверение личности (обе стороны)
- Фото курьера
- Полное имя
- Контактный телефон
- Адрес проживания
- Экстренный контакт

### Предупреждения:
На странице документов отображается предупреждение:
```
⚠️ Важно: Загрузка документов обязательна для работы курьером
Без верифицированных документов вы не сможете принимать заказы на доставку
```

## Технические детали

### Firebase Storage Rules
```javascript
match /courierDocuments/{userId}/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

### Firestore Security Rules
```javascript
match /courierDocuments/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Deployment

### URL
- Production: https://coffeeaddict-c9d70.web.app/admin

### Команды деплоя:
```bash
# Сборка админки
cd admin
npm run build

# Деплой на Firebase Hosting
cd ..
firebase deploy --only hosting
```

## Статус проекта

✅ Создана страница документов курьера
✅ Интегрирована Firebase Storage и Firestore
✅ Обновлена навигация и маршрутизация
✅ Мигрирована система ролей на новую архитектуру
✅ Успешно собрано и задеплоено

## Следующие шаги (опционально)

1. **Админ-панель для проверки документов**
   - Страница для просмотра всех курьеров
   - Кнопки одобрения/отклонения документов
   - История изменений статусов

2. **Нотификации**
   - Email-уведомления админу при загрузке документов
   - Push-уведомления курьеру при верификации

3. **Автоматическая проверка**
   - OCR для проверки данных удостоверения
   - Сравнение фото с удостоверением

4. **Блокировка доставок**
   - Запрет на принятие заказов без статуса `verified`
   - Отображение причины блокировки

---

**Дата создания**: 23 октября 2025
**Статус**: ✅ Deployed to production
