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

### 4. Критерии готовности

✅ `https://<PROJECT_ID>.web.app/api/ping` → 200 `{ "ok": true }`

✅ `https://<PROJECT_ID>.web.app/api/health` → 200 `{ "status":"ok", "ts": <number> }`

✅ Админка загружается без CORS/404 ошибок

✅ Все API endpoints возвращают валидный JSON:
- `/api/bonus?action=settings`
- `/api/promo?action=promotions`
- `/api/promo?action=achievements`
- `/api/orders?action=get&admin=true`
- `/api/analytics`
- `/api/users`

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