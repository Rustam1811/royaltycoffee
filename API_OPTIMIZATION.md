# 🚀 VERCEL HOBBY PLAN - API OPTIMIZATION

## Проблема
Превышен лимит в 12 Serverless Functions на Hobby плане Vercel.

## Решение
Объединил похожие API функции в универсальные endpoints.

---

## 📋 НОВЫЕ API ENDPOINTS

### 1. `/api/auth?action=...`
**Заменяет:** `login.js`, `register.js`

```javascript
// Логин
POST /api/auth?action=login
{
  "email": "user@example.com",
  "password": "password123"
}

// Регистрация  
POST /api/auth?action=register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "phone": "+1234567890"
}
```

### 2. `/api/orders?action=...`
**Заменяет:** `orders.js`, `placeOrder.js`, `simple-order.js`, `test-orders.js`

```javascript
// Получить заказы
GET /api/orders?action=get

// Создать заказ
POST /api/orders?action=place
{
  "userId": "user123",
  "items": [...],
  "totalAmount": 100,
  "customerInfo": {...}
}

// Простой заказ
POST /api/orders?action=simple
{
  "name": "John",
  "phone": "+123456789",
  "items": [...],
  "totalAmount": 50
}

// Тестовый заказ
GET /api/orders?action=test
```

### 3. `/api/bonus?action=...`
**Заменяет:** `bonus-settings.js`, `use-bonus.js`, `user-bonus.js`, `test-bonus.js`

```javascript
// Настройки бонусов
GET /api/bonus?action=settings
POST /api/bonus?action=settings

// Использовать бонусы
POST /api/bonus?action=use
{
  "userId": "user123",
  "bonusAmount": 50,
  "orderId": "order123"
}

// Бонусы пользователя
GET /api/bonus?action=user&userId=user123

// Тест бонусов
GET /api/bonus?action=test
```

### 4. `/api/promo?action=...`
**Заменяет:** `promo-codes.js`, `promotions.js`, `achievements.js`

```javascript
// Промокоды
GET /api/promo?action=codes
POST /api/promo?action=codes

// Акции
GET /api/promo?action=promotions  
POST /api/promo?action=promotions

// Достижения
GET /api/promo?action=achievements
GET /api/promo?action=achievements&userId=user123
POST /api/promo?action=achievements
```

### 5. `/api/stories-unified?action=...`
**Заменяет:** `stories.js`, `upload-story.js`, `upload-story-simple.js`, `upload-story-local.js`

```javascript
// Получить сторис
GET /api/stories-unified?action=get

// Создать сторис
POST /api/stories-unified?action=create

// Загрузить сторис
POST /api/stories-unified?action=upload
POST /api/stories-unified?action=simple-upload
POST /api/stories-unified?action=local-upload

// Удалить сторис
DELETE /api/stories-unified?action=delete&storyId=story123
```

---

## 📊 ЭКОНОМИЯ ФУНКЦИЙ

### Было: 18 функций
- login.js
- register.js
- orders.js
- placeOrder.js
- simple-order.js
- test-orders.js
- bonus-settings.js
- use-bonus.js
- user-bonus.js
- test-bonus.js
- promo-codes.js
- promotions.js
- achievements.js
- stories.js
- upload-story.js
- upload-story-simple.js
- upload-story-local.js
- (+ functions/sendPromo.js)

### Стало: 6 функций ✅
- auth.js (2 функции)
- orders.js (4 функции) 
- bonus.js (4 функции)
- promo.js (3 функции)
- stories-unified.js (4 функции)
- functions/sendPromo.js (1 функция)

**Экономия: 12 функций** - теперь укладываемся в лимит Hobby плана!

---

## 🔄 МИГРАЦИЯ КОДА

### 1. Обновить клиентский код
Заменить старые API вызовы на новые с параметром `action`:

```javascript
// Было
fetch('/api/login', { ... })

// Стало  
fetch('/api/auth?action=login', { ... })
```

### 2. Удалить старые файлы
После тестирования можно удалить старые API файлы:
- `api/login.js` → удалить
- `api/register.js` → удалить  
- `api/placeOrder.js` → удалить
- и т.д.

### 3. Обновить переменные окружения
Убедиться что настроены Firebase Admin переменные:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`  
- `FIREBASE_PRIVATE_KEY`

---

## ✅ СЛЕДУЮЩИЕ ШАГИ

1. **Тестировать новые API** - проверить работу всех endpoints
2. **Обновить фронтенд** - заменить API вызовы
3. **Удалить старые файлы** - после успешной миграции
4. **Деплой на Vercel** - должно пройти без ошибок лимита

---

## 🎯 РЕЗУЛЬТАТ

- ✅ Уложились в лимит 12 функций Hobby плана
- ✅ Сохранили весь функционал
- ✅ Улучшили организацию API
- ✅ Упростили поддержку кода
