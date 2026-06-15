/**
 * Role-Based Access Control Configuration
 * Конфигурация доступов по ролям
 */

import { Role } from '@/contexts/UserContext';

// Базовые пути для каждой роли
export const ROLE_BASE_PATHS: Record<Role, string> = {
  superowner: '/superowner',
  owner: '/owner',
  admin: '/admin', 
  barista: '/barista',
  courier: '/courier',
  user: '/app'
};

// Страницы доступные каждой роли
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  superowner: [
    'dashboard',
    'locations',
    'analytics',
    'menu',
    'menu-editor',
    'orders',
    'users',
    'staff',
    'bonuses',
    'achievements',
    'promotions',
    'stories',
    'pos',
    'delivery',
    'couriers',
    'settings',
    'workshop',
    'iiko-settings',
  ],
  owner: [
    'dashboard',
    'analytics',
    'menu',
    'menu-editor',
    'orders',
    'users',
    'staff',
    'bonuses',
    'achievements',
    'promotions',
    'stories',
    'pos',
    'delivery',
    'couriers'
  ],
  admin: [
    'dashboard',
    'menu',
    'menu-editor',
    'orders',
    'users',
    'bonuses',
    'promotions',
    'stories',
    'pos'
  ],
  barista: [
    'menu',
    'orders',
    'pos'
  ],
  courier: [
    'courier-dashboard',
    'courier-documents',
    'delivery'
  ],
  user: []
};

// Названия страниц для навигации
export const PAGE_LABELS: Record<string, string> = {
  'dashboard': 'Главная',
  'locations': 'Точки',
  'analytics': 'Аналитика',
  'menu': 'Меню',
  'menu-editor': 'Редактор меню',
  'orders': 'Заказы',
  'users': 'Клиенты',
  'staff': 'Персонал',
  'bonuses': 'Бонусы',
  'achievements': 'Достижения',
  'promotions': 'Акции',
  'stories': 'Stories',
  'pos': 'Касса',
  'delivery': 'Доставка',
  'couriers': 'Курьеры',
  'settings': 'Настройки',
  'courier-dashboard': 'Мои доставки',
  'courier-documents': 'Документы',
  'workshop': 'Цех',
  'iiko-settings': 'iiko интеграция',
};

// Иконки страниц (heroicons names)
export const PAGE_ICONS: Record<string, string> = {
  'dashboard': 'HomeIcon',
  'locations': 'MapPinIcon',
  'analytics': 'ChartBarIcon',
  'menu': 'Squares2X2Icon',
  'menu-editor': 'PencilSquareIcon',
  'orders': 'ClipboardDocumentListIcon',
  'users': 'UsersIcon',
  'staff': 'UserGroupIcon',
  'bonuses': 'GiftIcon',
  'achievements': 'TrophyIcon',
  'promotions': 'TagIcon',
  'stories': 'PhotoIcon',
  'pos': 'CreditCardIcon',
  'delivery': 'TruckIcon',
  'couriers': 'UserGroupIcon',
  'settings': 'Cog6ToothIcon',
  'courier-dashboard': 'TruckIcon',
  'courier-documents': 'DocumentIcon',
  'workshop': 'BuildingOffice2Icon',
  'iiko-settings': 'BuildingStorefrontIcon',
};

// Проверка доступа к странице
export function hasAccess(role: Role, page: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(page) ?? false;
}

// Получение домашней страницы для роли
export function getHomePage(role: Role): string {
  switch (role) {
    case 'superowner':
      return 'dashboard';
    case 'owner':
      return 'dashboard';
    case 'admin':
      return 'dashboard';
    case 'barista':
      return 'pos';
    case 'courier':
      return 'courier-dashboard';
    default:
      return '';
  }
}

// Построение полного пути
export function buildPath(role: Role, page: string, locationId?: string): string {
  const base = ROLE_BASE_PATHS[role];
  
  if (role === 'superowner') {
    // superowner без locationId в пути
    return `${base}/${page}`;
  }
  
  if (locationId) {
    return `${base}/${locationId}/${page}`;
  }
  
  return `${base}/${page}`;
}

// Редирект на правильный путь после логина
export function getLoginRedirect(role: Role, locationId?: string): string {
  const homePage = getHomePage(role);
  return buildPath(role, homePage, locationId);
}
