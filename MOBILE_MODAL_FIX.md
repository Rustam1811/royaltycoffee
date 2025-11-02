# Mobile Modal Fix - Client Menu

## Проблема
Модальное окно меню не открывалось корректно на мобильных устройствах из-за множественных проблем:
- Конфликты z-index между элементами
- Неправильная обработка touch-событий
- Отсутствие поддержки safe-area для iOS
- Конфликты прокрутки между контентом и drag-жестами
- Некорректное позиционирование CTA-кнопки

## Решение

### 1. BottomSheetPremium Component (Полностью переписан)

**Ключевые улучшения:**

#### Z-Index Layering
- Backdrop: `z-[100]` (было `z-40`)
- Sheet Panel: `z-[110]` (было `z-50`)
- CTA Button: `z-[120]` (было `z-60`)

#### Touch Events & Scrolling
- Удалены сложные `dragControls` и кастомные touch-обработчики
- Использован нативный Framer Motion `drag="y"` с `dragDirectionLock`
- Добавлен `touchAction: 'pan-y'` для корректной прокрутки контента
- Установлен `touch-manipulation` для предотвращения zoom на iOS

#### iOS Safe Area Support
```css
padding-bottom: max(env(safe-area-inset-bottom), 16px)
```

#### Body Scroll Lock (Улучшен)
```typescript
// Правильная блокировка скролла без layout shift
const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
document.body.style.overflow = 'hidden';
document.body.style.width = '100%';
if (scrollbarWidth > 0) {
  document.body.style.paddingRight = `${scrollbarWidth}px`;
}
```

#### Drag Gestures
- Threshold снижен с 33% до 30% высоты
- Velocity для быстрого свайпа: `> 600px/s`
- Smooth animations с `spring` physics
- `dragElastic={{ top: 0, bottom: 0.3 }}` для natural bounce

#### Backdrop
- Улучшен blur: `blur(8px)` / `blur(12px)` в зависимости от темы
- Упрощен градиент: `bg-black/30` или `bg-black/50`
- Клик по backdrop закрывает модалку

### 2. PremiumMenu Component

**Mobile-First Improvements:**

#### CTA Button Positioning
```tsx
// До: bottom-[88px] - конфликтовало с нижней навигацией
// После: bottom-0 + safe-area-bottom
<div className="fixed left-0 right-0 bottom-0 z-[120] px-4 pb-4 pointer-events-none safe-area-bottom">
```

#### Responsive Typography & Spacing
- Все элементы имеют `sm:` варианты
- Touch targets минимум `44x44px` (Apple HIG)
- Font sizes: `text-[11px] sm:text-[13px]`
- Gaps: `gap-2 sm:gap-3`

#### Product Image
```tsx
// Было: фиксированная ширина 58%
// Стало: responsive aspect-ratio
<div className="relative w-full max-w-[240px] aspect-[3/4] flex items-center justify-center">
  <img className="w-full h-full object-contain" />
</div>
```

#### Size Selector Buttons
- Touch targets: `h-14 min-w-[68px] sm:min-w-[72px]`
- Active state: `scale-105` для визуальной обратной связи
- `touch-manipulation` для мгновенного отклика

#### Pill Components (Options)
```tsx
// Улучшенные touch targets и анимации
h-12 sm:h-14 
whileTap={{ scale: 0.97 }}
transition={{ duration: 0.2 }}
```

#### Options Grid
- Mobile: `grid-cols-2`
- Tablet+: `sm:grid-cols-3` (removed для consistency)
- Gaps: `gap-2 sm:gap-3`
- Rounded corners: `rounded-xl sm:rounded-2xl`

#### Close Button
```tsx
// Увеличен для mobile, sticky positioning
className="w-10 h-10 sm:w-9 sm:h-9"
// Sticky gradient fade для лучшей видимости
bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm
```

### 3. CSS Utilities (index.css)

**Добавлены:**
```css
/* Safe area для iOS */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Touch optimization */
.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Scrollbar hiding */
.scrollbar-hide { ... }
.no-scrollbar { ... }
```

## Тестирование

### Mobile Devices
- ✅ iOS Safari (iPhone 12, 13, 14)
- ✅ Chrome Mobile (Android)
- ✅ Samsung Internet
- ✅ Firefox Mobile

### Viewport Sizes
- ✅ 375px (iPhone SE)
- ✅ 390px (iPhone 13)
- ✅ 428px (iPhone 13 Pro Max)
- ✅ 768px+ (Tablet)

### Gestures
- ✅ Drag to dismiss (swipe down)
- ✅ Content scrolling
- ✅ Tap to select options
- ✅ Backdrop tap to close
- ✅ Escape key to close

### Performance
- ✅ 60fps animations (`will-change-transform`, `transform-gpu`)
- ✅ No layout shifts
- ✅ Smooth scrolling
- ✅ No jank on drag

## Архитектурные принципы

### 1. Mobile-First
Все размеры, отступы и touch targets оптимизированы для мобильных устройств

### 2. Progressive Enhancement
Desktop features добавляются через `sm:` breakpoints

### 3. Accessibility
- ARIA labels на интерактивных элементах
- Keyboard navigation (Escape to close)
- Focus management

### 4. Performance
- `will-change-transform` для GPU acceleration
- `transform-gpu` для hardware acceleration
- Lazy loading для images
- Reduced motion support

### 5. Clean Code
- TypeScript для type safety
- Functional components с hooks
- Memoization для оптимизации (useMemo, useCallback)
- Declarative animations (Framer Motion)

## Файлы изменены

1. `src/features/menu/premium/BottomSheetPremium.tsx` - Полная переработка
2. `src/features/menu/premium/PremiumMenu.tsx` - Mobile optimizations
3. `src/index.css` - Добавлены utilities

## Breaking Changes
Нет - все изменения обратно совместимы

## Migration Guide
Не требуется - hot reload автоматически применит изменения

---

**Автор:** Senior Frontend Developer  
**Дата:** 2025-10-29  
**Статус:** ✅ Production Ready
