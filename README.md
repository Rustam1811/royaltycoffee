# SunfoodApp

## Serverless API (Vercel)

<!--
Smoke tests (manual)

1) Health
   curl -i https://coffee-api-ten.vercel.app/api/health
   Expect: 200 and JSON { ok: true, ... }

2) Ping
   curl -i https://coffee-api-ten.vercel.app/api/ping
   Expect: 200 and JSON { ok: true, now }

3) CORS for bonus settings
   curl -i -H "Origin: https://coffee-admin-nine.vercel.app" "https://coffee-api-ten.vercel.app/api/bonus?action=settings"
   Expect: 200 and header Access-Control-Allow-Origin: https://coffee-admin-nine.vercel.app

4) Orders without admin when ADMIN_AUTH_ENABLED=false
   curl -i -H "Origin: https://coffee-admin-nine.vercel.app" "https://coffee-api-ten.vercel.app/api/orders?action=get"
   Expect: 200 and JSON { ok: true, data: { items: [...] } }
-->

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
