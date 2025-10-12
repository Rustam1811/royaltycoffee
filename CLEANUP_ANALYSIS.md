# 🗑️ Анализ используемых и неиспользуемых файлов

## ✅ Используется в ПРОДАКШЕНЕ (НЕ ТРОГАТЬ)

### 1. **Firebase Hosting + Functions**
```
firebase.json              ← конфигурация хостинга
firestore.rules            ← правила безопасности БД
firestore.indexes.json     ← индексы для запросов
storage.rules              ← правила для Storage
functions/                 ← Cloud Functions (Node.js 20)
  ├── src/
  │   ├── index.ts         ← entry point
  │   ├── fcm.ts           ← Push notifications
  │   ├── triggers.ts      ← Firestore triggers
  │   └── admin.ts         ← Firebase Admin SDK init
  └── package.json
```

**Routing в продакшене:**
- `/api/**` → Cloud Function `api` (us-central1)
- `/admin/**` → `/admin/index.html` (SPA)
- `/**` → `/index.html` (клиент SPA)

---

### 2. **Клиентское приложение**
```
src/                       ← React 18 + TypeScript
  ├── services/
  │   └── messaging.ts     ← FCM клиент (ИСПОЛЬЗУЕТСЯ!)
  ├── pwa/
  │   └── pwa-updater.ts   ← Service Worker auto-update
  └── ...

public/
  ├── firebase-messaging-sw.js  ← FCM Service Worker (КРИТИЧНО!)
  ├── icon-*.png                ← PWA иконки
  └── manifest.webmanifest      ← PWA манифест

dist/                      ← Build output (деплоится на Firebase Hosting)
```

---

### 3. **Админ-панель**
```
admin/                     ← Vite + React SPA
  ├── src/
  │   └── services/
  │       └── messaging.ts ← FCM для админа (уведомления о заказах)
  └── package.json

Билдится в: dist/admin/
```

---

## ❌ НЕ ИСПОЛЬЗУЕТСЯ (можно удалить)

### 1. **Локальные API серверы (не нужны)**
```bash
❌ api-server.js              # Express dev server (не используется)
❌ api-server/                # Папка с альтернативным сервером
❌ simple-api.js              # Тестовый API
❌ start-api-server.bat       # Запуск локального сервера
❌ start-api-server.sh        # То же для Unix
❌ start-api-development.bat  # Deprecated
❌ start-api-production.bat   # Deprecated
```

**Причина:** В dev используется Vite proxy → `http://localhost:3001`, но сам сервер запускается через **Cloud Functions Emulator** или напрямую обращение к продакшн Cloud Functions.

---

### 2. **Vercel (не используется)**
```bash
❌ vercel.json                # Vercel конфигурация
❌ vercel-api/                # API handlers для Vercel
❌ .vercel/                   # Vercel кеш
❌ .vercelignore              # Ignore файл
❌ vite-api-plugin.ts         # Плагин для Vercel
```

**Причина:** Проект деплоится на **Firebase Hosting**, а не Vercel.

---

### 3. **Устаревшие API директории**
```bash
❌ api-desable/               # Отключенная версия API
❌ apps/                      # Старая структура
```

---

### 4. **Тестовые HTML файлы**
```bash
❌ test-achievements-promotions.html
❌ test-api-direct.js
❌ test-api.js
❌ test-api.sh
❌ test-bonus.js
❌ test-call.js
❌ test-call2.js
❌ test-debug.js
❌ test-init-bonus-settings.html
❌ test-instagram-stories.html
❌ test-promo.js
❌ test-promotions-api.html
❌ test-push-notifications-flow.html
❌ test-story-upload.html
❌ production-setup-once.html
❌ quick-check.html
❌ diagnostic-87053096206.html
❌ sw-reset.html
```

**Можно оставить только:**
- `setup-push.html` (полезен для debugging FCM)

---

### 5. **Старые скрипты**
```bash
❌ setup-admin-auto.js
❌ setup-admin-manual.bat
❌ setup-client-notifications.js
❌ check-user-87053096206.js
❌ check-fcm-tokens.js         # Не работает без serviceAccountKey.json
❌ create-test-orders.js
❌ auto-setup-admin.bat
❌ start-all.bat
❌ start-dev.bat
❌ deploy-admin.bat            # Не нужен, есть firebase deploy
❌ deploy-notifications.bat
❌ deploy-notifications.sh
❌ deploy-push.bat
```

---

### 6. **Markdown документация (устарела)**
```bash
❌ ADMIN_NOTIFICATIONS_FIX.md
❌ APPLE_SIGNIN_GUIDE.md
❌ APPLE_SIGNIN_REMOVED.md
❌ AUTO_SETUP_COMPLETE.md
❌ CHECK_ADMIN_QUICK.md
❌ DEBUG_ADMIN_FIRESTORE.md
❌ DEBUG_NOTIFICATIONS.md
❌ DEBUG_ORDER_NOTIFICATION.md
❌ DEPLOY_SUCCESS.md
❌ DO_THIS_NOW.md
❌ FINAL_FIX_NOTIFICATIONS.md
❌ FIREBASE_CONFIG_FIX.md
❌ FIRESTORE_RULES_FIX.md
❌ FOR_CLIENT_READY.md
❌ FULL_DIAGNOSTICS.md
❌ PRODUCTION_CHECKLIST.md
❌ PUSH_CHEATSHEET.md
❌ PUSH_IMPLEMENTATION_SUMMARY.md
❌ PUSH_NOTIFICATIONS_ARCHITECTURE.md
❌ PUSH_NOTIFICATIONS_MANIFEST.md
❌ PUSH_NOTIFICATIONS_PRODUCTION.md
❌ PUSH_NOTIFICATIONS_QUICKSTART.md
❌ PUSH_NOTIFICATIONS_README.md
❌ PUSH_QUICKSTART.md
❌ QUICK_DIAGNOSTIC.md
❌ README_PUSH.md
❌ STORIESPLAYER_ERROR_FIX.md
❌ VAPID_KEY_FIX.md
```

**Можно оставить только:**
- `NOTIFICATIONS_SYSTEM.md` (архитектура)
- `NOTIFICATIONS_TESTING.md` (как тестировать)
- `NOTIFICATIONS_CRITICAL_FIX.md` (последний важный фикс)

---

### 7. **Временные файлы**
```bash
❌ temp_head.txt
❌ tmp_before.txt
❌ tmp_UserContext_full.txt
❌ replacements.txt
❌ admin-data.json
❌ users.json
❌ bonus-settings-default.json  # Может быть нужен, проверь
❌ cors.json                     # Не используется
```

---

### 8. **Trash**
```bash
❌ _trash/                    # Уже мусорка
```

---

## ✅ ОСТАВИТЬ (используется в dev)

### Dev только
```bash
✅ api/                       # Cloud Functions source (может использоваться локально)
✅ cypress/                   # E2E тесты
✅ cypress.config.ts
✅ tests/                     # Unit тесты
✅ scripts/                   # Build скрипты
✅ shared/                    # Общий код между клиентом/админом
✅ reports/                   # Отчеты тестов
```

### Config файлы
```bash
✅ .env*                      # Env переменные
✅ .gitignore
✅ .firebaserc                # Firebase проект
✅ package.json
✅ tsconfig.json
✅ vite.config.ts
✅ tailwind.config.cjs
✅ postcss.config.js
✅ eslint.config.js
✅ env.d.ts
✅ three.d.ts                 # Type definitions
```

---

## 🗑️ Команда для очистки

```bash
# ВНИМАНИЕ: Сделай git commit перед этим!

# 1. Vercel
rm -rf vercel-api vercel.json .vercel .vercelignore vite-api-plugin.ts

# 2. Старые API серверы
rm -rf api-server api-desable apps
rm api-server.js simple-api.js
rm start-api-*.bat start-api-*.sh start-all.bat start-dev.bat

# 3. Тестовые файлы
rm test-*.html test-*.js diagnostic-*.html quick-check.html sw-reset.html production-setup-once.html

# 4. Старые скрипты
rm setup-*.js setup-*.bat deploy-*.bat deploy-*.sh auto-setup-*.bat
rm check-*.js create-test-orders.js

# 5. Устаревшая документация
rm ADMIN_*.md APPLE_*.md AUTO_*.md CHECK_*.md DEBUG_*.md DEPLOY_*.md
rm DO_THIS_NOW.md FINAL_*.md FIREBASE_*.md FIRESTORE_*.md FOR_*.md FULL_*.md
rm PRODUCTION_*.md PUSH_*.md QUICK_*.md README_PUSH.md STORIES*.md VAPID_*.md

# 6. Временные файлы
rm temp_*.txt tmp_*.txt replacements.txt admin-data.json users.json cors.json

# 7. Trash
rm -rf _trash

# 8. Оставить только актуальную документацию
# (уже созданы: NOTIFICATIONS_SYSTEM.md, NOTIFICATIONS_TESTING.md, NOTIFICATIONS_CRITICAL_FIX.md)
```

---

## 📊 Итого

**Было файлов:** ~150+  
**Можно удалить:** ~80 файлов  
**Останется:** ~70 файлов (только используемые)

**Экономия места:** ~10-20 MB  
**Главное:** Проект станет **чище** и **понятнее**

---

## ⚠️ Перед удалением

1. **Сделай git commit:**
   ```bash
   git add .
   git commit -m "feat: cleanup before removing unused files"
   git push
   ```

2. **Проверь что используется `api/` директория:**
   ```bash
   grep -r "api/" vite.config.ts firebase.json
   ```

3. **Если сомневаешься — создай backup:**
   ```bash
   mkdir ../SunfoodApp_backup_$(date +%Y%m%d)
   cp -r . ../SunfoodApp_backup_$(date +%Y%m%d)/
   ```

---

**Дата анализа:** 2025-10-12  
**Статус:** Готово к очистке ✅
