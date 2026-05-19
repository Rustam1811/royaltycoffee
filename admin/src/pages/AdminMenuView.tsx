import React from 'react';
// Импортируем клиентское меню
import Menu from '../../../src/pages/menu/Menu';

/**
 * Обёртка для клиентского меню в админке
 * CartProvider уже обернут в App.tsx
 */
export default function AdminMenuView() {
  return (
    <div className="w-full h-full">
      <Menu />
    </div>
  );
}
