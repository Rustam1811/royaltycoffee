# Firebase Deploy Instructions

## Пошаговое развертывание SunfoodApp на Firebase

### 1. Билд админки
```bash
cd admin
npm ci
npm run build
```

### 2. Установка Firebase CLI и деплой
```bash
# Установка Firebase CLI (если не установлен)
npm i -g firebase-tools

# Авторизация в Firebase
firebase login

# Установка проекта Firebase
firebase use <PROJECT_ID>

# Установка зависимостей для функций
cd functions
npm ci

# Деплой функций и хостинга
cd ..
firebase deploy --only functions:api,hosting
```

### 3. Локальное тестирование
```bash
# Запуск эмулятора Firebase
firebase emulators:start

# Проверка endpoints:
# http://localhost:5001/<PROJECT_ID>/europe-west1/api/ping
# http://localhost:5000/api/ping (через hosting)
```

### 4. Настройка Firebase Authentication

Для доступа к админке нужно создать пользователей:

1. Откройте [Firebase Console](https://console.firebase.google.com/project/coffeeaddict-c9d70/authentication/users)
2. Во вкладке Authentication → Users создайте пользователей:
   - Email: `admin121@gmail.com`, Password: `admin123` (или свой пароль)
   - Email: `barista121@gmail.com`, Password: `barista123`

### 5. Критерии готовности

✅ `https://coffeeaddict-c9d70.web.app/api/ping` → 200 `{ "ok": true }`

✅ `https://coffeeaddict-c9d70.web.app/api/health` → 200 `{ "status":"ok", "ts": <number> }`

✅ Админка загружается и перенаправляет на `/login`

✅ После авторизации показывает данные без CORS ошибок

✅ Все API endpoints возвращают валидный JSON с тестовыми данными:
- `/api/bonus?action=settings` → настройки бонусной системы
- `/api/promo?action=promotions` → список промо-акций
- `/api/promo?action=achievements` → достижения
- `/api/orders?action=get&admin=true` → список заказов с деталями
- `/api/analytics` → статистика с графиками
- `/api/users` → список пользователей

### 5. Быстрые команды

```bash
# Только функции
firebase deploy --only functions:api

# Только хостинг
firebase deploy --only hosting

# Полный деплой
firebase deploy --only functions:api,hosting
```

### 6. Переменные окружения

Admin использует относительные пути `/api/...` вместо абсолютных URLs.

Конфигурация в `admin/.env.production`:
```
VITE_API_BASE=/api
```

### 7. Структура проекта

```
functions/
├── index.js       # Express приложение с API endpoints
└── package.json   # Firebase Functions 2nd gen, Node 20+

admin/
├── dist/          # Скомпилированная админка
└── .env.production

firebase.json      # Hosting + Functions routing
```