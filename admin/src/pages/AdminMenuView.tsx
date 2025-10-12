import React from 'react';
// Импортируем клиентское меню
import Menu from '../../../src/pages/menu/Menu';

/**
 * Обёртка для клиентского меню в админке
 * CartProvider уже обернут в App.tsx
 * Адаптируется под сайдбар админки - уменьшаем размеры карточек и модалки
 */
export default function AdminMenuView() {
  return (
    <div className="w-full h-full admin-menu-compact">
      <style>{`
        /* Компактные карточки для админки */
        .admin-menu-compact .grid {
          /* На маленьких экранах 2 колонки, на больших 3 вместо 4 */
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        
        @media (min-width: 768px) {
          .admin-menu-compact .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        
        @media (min-width: 1024px) {
          .admin-menu-compact .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        
        @media (min-width: 1536px) {
          .admin-menu-compact .grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
        
        /* Уменьшаем высоту карточек */
        .admin-menu-compact button[data-fly-id] {
          height: 280px !important;
        }
        
        /* Уменьшаем отступы */
        .admin-menu-compact button[data-fly-id] > div:last-child {
          padding: 16px !important;
          padding-top: 0 !important;
        }
        
        /* Уменьшаем размер изображения */
        .admin-menu-compact button[data-fly-id] > div:first-of-type {
          padding: 16px !important;
        }
        
        /* Уменьшаем шрифты */
        .admin-menu-compact button[data-fly-id] h3 {
          font-size: 14px !important;
          margin-bottom: 8px !important;
        }
        
        .admin-menu-compact button[data-fly-id] .text-lg {
          font-size: 16px !important;
        }
        
        /* === МОДАЛКА (BottomSheet) === */
        
        /* Уменьшаем макс высоту модалки */
        .admin-menu-compact > div > div[role="presentation"] + div {
          max-height: 85vh !important;
        }
        
        /* Уменьшаем размер главного изображения напитка в модалке */
        .admin-menu-compact img[alt] {
          max-width: 180px !important;
        }
        
        /* Делаем CTA кнопку видимой - поднимаем выше */
        .admin-menu-compact .fixed.bottom-\\[88px\\] {
          bottom: 20px !important;
        }
        
        /* Уменьшаем отступы в модалке */
        .admin-menu-compact .px-6 {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        
        .admin-menu-compact .pt-1 {
          padding-top: 0.5rem !important;
        }
        
        /* Уменьшаем кнопки размеров */
        .admin-menu-compact button[class*="h-14"] {
          height: 3rem !important;
          min-width: 60px !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        
        /* Уменьшаем gap в сетках опций */
        .admin-menu-compact .gap-3 {
          gap: 0.5rem !important;
        }
        
        /* Компактнее кнопка добавления */
        .admin-menu-compact button[class*="h-14"][class*="rounded-full"] {
          height: 3.5rem !important;
          padding-left: 1.5rem !important;
          padding-right: 1.5rem !important;
        }
        
        /* Уменьшаем счетчик количества */
        .admin-menu-compact button[class*="w-12"][class*="h-12"] {
          width: 2.5rem !important;
          height: 2.5rem !important;
        }
        
        .admin-menu-compact div[class*="w-12"] {
          width: 2.5rem !important;
        }
      `}</style>
      <Menu />
    </div>
  );
}
