# Brewly Landing

Premium Apple-inspired landing page built with React 18, TypeScript, Vite and Tailwind CSS. The focus is a light, trustworthy aesthetic for a coffee PWA with an admin console.

## Stack
- React 18, TypeScript, Vite 5
- Tailwind CSS with container queries and custom design tokens
- Framer Motion, Headless UI, Heroicons, clsx
- PWA-ready: custom service worker, manifest, favicon

## Getting Started
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

## Environment Variables
Create `.env` based on `.env.example`:
```
VITE_WA_NUMBER=79990000000
VITE_TG_USERNAME=lumenos_support
```

## Firebase Hosting
1. `firebase login`
2. Update `.firebaserc`
3. `npm run build`
4. `firebase deploy --only hosting`

## Highlights
- Refined design system with glass panels and soft gradients
- Component-based architecture (`src/components`, `src/sections`, `src/hooks`)
- Animations respect `prefers-reduced-motion`
- SEO metadata, robots.txt, sitemap, favicon
- Service worker pre-caches shell and static assets
