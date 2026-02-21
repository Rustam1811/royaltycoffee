import { WorkshopRole } from '@/types';

// Базовые пути для каждой роли
export const ROLE_BASE_PATHS: Record<WorkshopRole, string> = {
  superowner: '/owner',
  workshop_owner: '/owner',
  workshop_admin: '/admin',
  workshop_client: '/client',
};

// Страницы доступные каждой роли
export const ROLE_PERMISSIONS: Record<WorkshopRole, string[]> = {
  superowner: [
    'dashboard',
    'menu',
    'menu-editor',
    'orders',
    'clients',
    'analytics',
    'settings',
  ],
  workshop_owner: [
    'dashboard',
    'menu',
    'menu-editor',
    'orders',
    'clients',
    'analytics',
    'settings',
  ],
  workshop_admin: [
    'dashboard',
    'menu',
    'menu-editor',
    'orders',
    'clients',
  ],
  workshop_client: [
    'outlets',
    'menu',
    'orders',
    'analytics',
  ],
};

// Названия страниц для навигации
export const PAGE_LABELS: Record<string, string> = {
  'dashboard': 'Главная',
  'menu': 'Меню',
  'menu-editor': 'Редактор меню',
  'orders': 'Заказы',
  'clients': 'Клиенты',
  'analytics': 'Аналитика',
  'settings': 'Настройки',
  'outlets': 'Мои точки',
};

// Иконки страниц
export const PAGE_ICONS: Record<string, string> = {
  'dashboard': 'home',
  'menu': 'book-open',
  'menu-editor': 'pencil-square',
  'orders': 'clipboard-document-list',
  'clients': 'users',
  'analytics': 'chart-bar',
  'settings': 'cog-6-tooth',
  'outlets': 'building-storefront',
};

// Проверка доступа
export function hasAccess(role: WorkshopRole, page: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(page) ?? false;
}

// Получить редирект после логина
export function getLoginRedirect(role: WorkshopRole): string {
  const basePath = ROLE_BASE_PATHS[role];
  const defaultPage = role === 'workshop_client' ? 'outlets' : 'dashboard';
  return `${basePath}/${defaultPage}`;
}
