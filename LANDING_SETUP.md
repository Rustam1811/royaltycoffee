# Landing Page Setup

## Структура проекта

Проект теперь состоит из трёх приложений:

1. **Client App** (`src/`) - React PWA приложение для пользователей
2. **Admin Panel** (`admin/`) - панель администратора
3. **Landing Page** (`public/landing/`) - лендинг для привлечения клиентов

## Разработка

### Запуск лендинга в dev режиме

```bash
npm run dev:landing
```

Лендинг будет доступен на `http://localhost:5173`

### Запуск всего проекта локально

```bash
npm run dev:local
```

Это запустит Functions, Web и Admin параллельно.

## Билд и деплой

### Сборка всех приложений

```bash
npm run build:all
```

Это соберёт:
- Client App → `dist/`
- Admin Panel → `dist/admin/`
- Landing → `dist/landing/`

### Деплой на Firebase Hosting

```bash
npm run deploy
```

Эта команда:
1. Соберёт все три приложения
2. Задеплоит их на Firebase Hosting

## Маршрутизация (Firebase Hosting)

После деплоя:

- `/` → Landing Page (`/landing/index.html`)
- `/app/**` → Client App (`/app/index.html`)
- `/login` → Client App (`/app/index.html`)
- `/admin/**` → Admin Panel (`/admin/index.html`)
- `/api/**` → Firebase Functions
- `**` (все остальные) → Client App (`/app/index.html`)

## Разработка лендинга

Лендинг находится в `public/landing/`:

- Отдельный Vite проект с собственным `package.json`
- React 18 + TypeScript
- Tailwind CSS 3.4
- Framer Motion для анимаций
- Heroicons для иконок

### Важные файлы

- `public/landing/src/App.tsx` - главный компонент
- `public/landing/src/sections/` - секции лендинга
- `public/landing/vite.config.ts` - конфигурация (base: '/landing/', outDir: '../../dist/landing')

## Тестирование локально

После сборки можно протестировать через Firebase emulators:

```bash
npm run build:all
firebase emulators:start --only hosting
```

Или через Vite preview:

```bash
npm run preview:landing
```
