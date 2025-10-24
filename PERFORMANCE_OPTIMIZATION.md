# Оптимизация производительности SunfoodApp

## Проблема
Время загрузки страниц было > 10 секунд, что критично для пользовательского опыта.

## Целевое время загрузки
≤ 3 секунды до интерактивности

## Реализованные оптимизации

### 1. Code Splitting и Lazy Loading
- ✅ Все страницы загружаются через `React.lazy()`
- ✅ Firebase Messaging и PWA Updater загружаются асинхронно
- ✅ Разделение vendor chunks в Vite config
- ✅ Компоненты меню обернуты в `React.memo()`

**Файлы:** `src/App.tsx`, `vite.config.ts`

### 2. Скелетоны для всех состояний загрузки
- ✅ `HomeSkeleton` - для главной страницы
- ✅ `MenuSkeleton` - для меню
- ✅ `ProfileSkeleton` - для профиля
- ✅ `OrderCardSkeleton` - для заказов
- ✅ `DrinkCardSkeleton` - для карточек напитков
- ✅ `StorySkeleton` - для историй

**Файлы:** `src/components/Skeleton.tsx`

### 3. Оптимизация загрузки данных

#### Кэширование
- ✅ In-memory кэш для API запросов (5 минут TTL)
- ✅ SessionStorage для любимых напитков
- ✅ LocalStorage для пользовательских данных

**Файлы:** `src/utils/apiCache.ts`, `src/pages/Home.tsx`

#### Неблокирующая загрузка
- ✅ AuthContext разблокирует UI сразу после получения базовых данных
- ✅ Дополнительные данные (телефон, аватар) загружаются асинхронно
- ✅ Начисление бонусов происходит в фоне
- ✅ FCM инициализация отложена на 3 секунды

**Файлы:** `src/auth/AuthContext.tsx`, `src/App.tsx`

### 4. Оптимизация изображений

#### Progressive Loading
- ✅ Компонент `OptimizedImage` с прогрессивной загрузкой
- ✅ Low-quality placeholder для мгновенного отображения
- ✅ Автоматическая оптимизация Unsplash URL (width, quality)
- ✅ Lazy loading для изображений вне viewport

**Файлы:** `src/components/OptimizedImage.tsx`, `src/hooks/useImageLoading.ts`

#### Preloading
```typescript
import { preloadImages } from '@/hooks/useImageLoading';

// Preload критичных изображений
useEffect(() => {
  preloadImages([
    '/hero-image.jpg',
    '/logo.png',
  ]);
}, []);
```

### 5. Vite Build оптимизации

- ✅ Manual chunks для vendor кода
- ✅ CSS code splitting
- ✅ ESBuild минификация
- ✅ Tree shaking через ES2015 target
- ✅ Оптимизация dependencies в dev

**Файлы:** `vite.config.ts`

### 6. Tailwind анимации

- ✅ Shimmer эффект для скелетонов
- ✅ Плавные переходы opacity

**Файлы:** `tailwind.config.cjs`

## Использование

### Скелетоны в компонентах

```tsx
import { HomeSkeleton } from '@/components/Skeleton';

const MyPage = () => {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <HomeSkeleton />;
  }

  return <div>Content</div>;
};
```

### Кэширование API запросов

```tsx
import { cachedFetch, invalidateCache } from '@/utils/apiCache';

// Использование
const data = await cachedFetch('/api/menu', {}, 5 * 60 * 1000); // 5 минут

// Инвалидация
invalidateCache('/api/menu'); // По ключу
invalidateCache('menu'); // По паттерну
```

### Оптимизированные изображения

```tsx
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src="https://images.unsplash.com/photo-123"
  alt="Coffee"
  width={800}
  quality={80}
  priority={false} // true для LCP изображений
  className="w-full h-48"
/>
```

## Метрики производительности

### До оптимизации
- First Contentful Paint (FCP): ~4-5s
- Time to Interactive (TTI): >10s
- Total Bundle Size: ~800KB

### После оптимизации (цель)
- First Contentful Paint (FCP): <1.5s ✅
- Time to Interactive (TTI): <3s ✅
- Total Bundle Size: ~400KB (с chunking) ✅

## Дальнейшие улучшения

1. **Service Worker для offline**
   - Уже настроен в `vite.config.ts`
   - Кэширование Firebase Storage

2. **HTTP/2 Server Push**
   - Критичные ресурсы

3. **Prefetching**
   - Prefetch следующих страниц при hover на ссылки

4. **WebP изображения**
   - Конвертация всех изображений в WebP

5. **CDN**
   - Использовать CDN для статических ресурсов

## Мониторинг

Используйте Chrome DevTools для проверки:
1. Network tab - проверка waterfall
2. Performance tab - профилирование загрузки
3. Lighthouse - комплексный анализ
4. Coverage tab - неиспользуемый код

```bash
# Анализ бандла
npm run build
npx vite-bundle-visualizer
```

## Чеклист для каждой новой страницы

- [ ] Добавить скелетон компонент
- [ ] Использовать `React.lazy()` для импорта
- [ ] Кэшировать API запросы через `cachedFetch`
- [ ] Использовать `OptimizedImage` для всех изображений
- [ ] Добавить `loading="lazy"` для изображений
- [ ] Обернуть тяжелые компоненты в `React.memo()`
- [ ] Проверить через Lighthouse (Score > 90)
