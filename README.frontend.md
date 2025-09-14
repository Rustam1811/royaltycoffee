# coffee-addict (frontend)

Single production domain setup via rewrites.

Deploy
- vercel --prod

Demo routes (after deploy):
- /login → client SPA
- /admin/login → admin (proxied)
- /api/ping → backend health-check (proxied)
- /firebase-api/promo?action=codes&userId=123 → Firebase Cloud Functions

Notes
- Admin uses normal paths (/login, /dashboard) and is proxied by Vercel rewrites.
- All API calls should use API_BASE = import.meta.env.VITE_API_BASE || '/api'.
- Firebase Functions base: /firebase-api.
