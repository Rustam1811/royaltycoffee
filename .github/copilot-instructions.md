# AI Coding Agent Instructions for SunfoodApp

This repo contains a Vite + React + TypeScript client (mobile-first) and a separate Admin SPA, backed by Firebase (web SDK on client) and a lightweight Node/Express API for local dev and Firebase Functions in prod.

Key architecture
- Client app under `src/` (React 18, Tailwind). Admin app under `admin/` (separate Vite project). Shared runtime: React Router v5, Framer Motion, Heroicons, i18next. Firebase web SDK is initialized in `src/lib/firebase.ts`.
- API surface is mounted at `/api/*` in prod via Firebase Hosting rewrites (`firebase.json`). In dev, Vite proxy maps `/api` to the local API server on 3001. Avoid absolute URLs; call relative `/api/...` from both apps.
- Promotions/Achievements unified endpoint: `api/promo.js` (server). Admin pages (e.g., `admin/pages/PromotionManagement.tsx`) call it via `${API_BASE}/promo?action=...`.

Conventions and patterns
- Env configuration: use `import.meta.env.VITE_*`. For API base, prefer `'/api'` default; dev uses Vite proxy. Admin has `admin/src/config/api.ts` exporting `API_BASE`.
- UI vs business logic: keep UI components declarative; put data access in services/hooks (see `src/services/stories.ts`). Normalize external data at the boundary.
- Tailwind: use concise utility classes; avoid inline styles unless necessary. Use small presentational components for reuse.
- Animations: lightweight Framer Motion transitions; mount/unmount via `<AnimatePresence>`.
- Routing: React Router v5 with `Switch/Route`. Admin is mounted at `/admin` inside the main app via `src/App.tsx` and has its own Vite build with `base: '/admin/'`.

Critical workflows
- Start client dev server: `npm run dev` (Vite on 5173). Dev proxy sends `/api` → `http://localhost:3001`.
- Start local API: `start-api-server.bat` (Express on 3001; mounts `api/promo.js`). Test: `http://localhost:3001/api/promo?action=promotions`.
- Start Admin dev: open `admin/` Vite (`port: 5174`). Ensure `admin/src/config/api.ts` points to `/api` and add proxy to admin Vite if needed.
- Build client: `npm run build` → `dist/`. Build Admin: `cd admin && npm run build` (or `npm run export-admin`). Deploy to Firebase Hosting: `npm run deploy` (hosting rewrites route `/api` to functions).

Data and integrations
- Firebase Web SDK configured via Vite env keys in `src/lib/firebase.ts`. Missing keys throw at startup to prevent partial init.
- Firestore access pattern: service modules (e.g., `src/services/stories.ts`) expose typed functions and normalize Firestore Timestamp/field types.
- Server promo API (`api/promo.js`) handles CORS, unifies promo codes, promotions, achievements; uses Firebase Admin initialized from env or service account.

Gotchas and local rules
- Service Worker: disabled in dev; production SW is served from `public/sw.js`. Use `sw-reset.html` to clear SW cache if dev gets stale.
- CORS: don’t call production absolute URLs in dev. Use `/api` + proxy. Admin should also use `/api` to match prod and avoid CORS.
- Encoding: ensure TSX files are UTF‑8 without BOM to avoid Vite transform errors.
- Router v5: use `Switch/Route/NavLink` patterns; avoid v6 APIs.

Examples
- API usage (client): `fetch('/api/promo?action=promotions')` via relative path.
- Stories service: `src/services/stories.ts` shows data normalization and strict typing.
- Admin API base: `admin/src/config/api.ts` exports `API_BASE` read from `import.meta.env.VITE_API_BASE` with fallback `'/api'`.

When editing
- Keep components small and typed. Extract hooks for data fetching/stateful logic. Avoid console logs; use errors surfaced in UI or return values.
- Use Tailwind consistently; prefer semantic, minimal class combinations.
- For server code, ensure headers/CORS for cross-origin if absolutely required; otherwise rely on same-origin `/api`.

If anything is unclear (e.g., missing admin proxy or envs), ask to confirm desired dev/prod behavior before changing globals.
