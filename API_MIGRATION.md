# API Optimization for Vercel Hobby Plan

## Проблема
На Vercel Hobby плане есть лимит в 12 serverless функций, а у нас было 15+ файлов в папке `api/`.

## Решение
Все API эндпоинты теперь объединены в один файл `api/register.js`, который использует роутинг через query параметр `endpoint`.

## Новая структура

### API Endpoint
- **Единственный файл**: `api/register.js`
- **Роутинг**: `?endpoint=<name>`

### Серверный код
```
src/server/
├── config.js                    # Общая конфигурация Firebase и CORS
├── data/
│   └── test-orders.js           # Тестовые данные
└── handlers/
    ├── register.js              # Регистрация пользователей
    ├── login.js                 # Авторизация
    ├── orders.js                # Управление заказами
    ├── bonus-settings.js        # Настройки бонусной системы
    ├── user-bonus.js            # Бонусы пользователя
    ├── use-bonus.js             # Использование бонусов
    ├── promo-codes.js           # Промокоды
    ├── promotions.js            # Акции
    ├── stories.js               # Stories/новости
    ├── placeOrder.js            # Размещение заказов
    ├── simple-order.js          # Простые заказы
    └── test-bonus.js            # Тестовые бонусы
```

## Использование

### Для фронтенда
Вместо отдельных эндпоинтов используйте один с параметром:

**Было:**
```javascript
fetch('/api/login', { ... })
fetch('/api/orders', { ... })
fetch('/api/user-bonus?userId=123')
```

**Стало:**
```javascript
fetch('/api/register?endpoint=login', { ... })
fetch('/api/register?endpoint=orders', { ... })
fetch('/api/register?endpoint=user-bonus&userId=123')
```

### Доступные endpoints
- `register` (по умолчанию)
- `login`
- `orders`
- `bonus-settings`
- `user-bonus`
- `use-bonus`
- `promo-codes`
- `promotions`
- `stories`
- `placeOrder`
- `simple-order`
- `test-bonus`

## Миграция фронтенда

### Шаг 1: Обновить переменные окружения
Убедитесь что `VITE_BACKEND_URL` указывает на правильный домен.

### Шаг 2: Обновить API вызовы
Найти и заменить все вызовы API:

```bash
# Поиск в коде
grep -r "api/" src/
grep -r "BACKEND_URL" src/
```

### Шаг 3: Обновить импорты
Если есть импорты API функций, обновить пути.

## Что удалить

После успешной миграции можно удалить файлы:
```
api/bonus-settings.js
api/login.js
api/orders.js
api/placeOrder.js
api/promo-codes.js
api/promotions.js
api/simple-order.js
api/stories.js
api/test-bonus.js
api/test-orders.js
api/use-bonus.js
api/user-bonus.js
```

**Оставить только**: `api/register.js`

## Проверка работоспособности

### Тестирование эндпоинтов:
```bash
# Регистрация (по умолчанию)
curl -X POST https://your-domain.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"123","password":"pass"}'

# Другие эндпоинты
curl https://your-domain.vercel.app/api/register?endpoint=stories
curl https://your-domain.vercel.app/api/register?endpoint=user-bonus&userId=123
```

## Преимущества
1. ✅ Соответствие лимитам Vercel Hobby (1 функция вместо 15+)
2. ✅ Упрощенная структура развертывания
3. ✅ Общая конфигурация Firebase
4. ✅ Централизованная обработка CORS
5. ✅ Лучшая производительность (меньше cold starts)
