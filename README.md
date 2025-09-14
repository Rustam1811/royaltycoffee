# SunfoodApp

## Serverless API (Vercel)

- Все эндпоинты теперь в `api/*.js` как serverless-функции.
- Общие хелперы: `api/_cors.js`, `api/_auth.js`.
- Локально: `npx vercel dev` (или `npm run dev`) → http://localhost:3000/api/ping

### Переменные окружения

Добавьте в Vercel ENV:
- `APP_ORIGIN` — https://coffee-addict.vercel.app
- `ADMIN_ORIGIN` — https://coffee-admin-xxxxx.vercel.app
- `FIREBASE_*` — ключи Firebase Admin

### Деплой

- `npx vercel login`
- `npx vercel link`
- `npx vercel env add APP_ORIGIN` (и остальные)
- `npm run deploy` (использует `vercel deploy --prod`)

### Примечания

- Старый `api-server/server.js` больше не используется.
- При необходимости мигрируйте оставшиеся маршруты из `api/*-unified.js` в соответствующие файлы `api/*.js`.