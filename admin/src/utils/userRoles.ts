/**
 * Система ролей пользователей
 * Определяет права доступа для разных типов пользователей
 */

export enum UserRole {
  CUSTOMER = 'customer',    // Обычный клиент
  BARISTA = 'barista',      // Бариста
  COURIER = 'courier',      // Курьер
  ADMIN = 'admin'           // Администратор
}

export interface UserPermissions {
  canViewOrders: boolean;
  canUpdateOrderStatus: boolean;
  canViewAnalytics: boolean;
  canManageMenu: boolean;
  canManageUsers: boolean;
  canManageBonuses: boolean;
  canViewDeliveries: boolean;
  canUpdateDeliveryStatus: boolean;
  canUpdateLocation: boolean;
}

/**
 * Конфигурация ролей и их ID
 */
export const ROLE_CONFIG = {
  [UserRole.ADMIN]: {
    userIds: ['87053096206'],
    permissions: {
      canViewOrders: true,
      canUpdateOrderStatus: true,
      canViewAnalytics: true,
      canManageMenu: true,
      canManageUsers: true,
      canManageBonuses: true,
      canViewDeliveries: true,
      canUpdateDeliveryStatus: true,
      canUpdateLocation: true,
    }
  },
  [UserRole.COURIER]: {
    userIds: ['87888888888'], // Пример ID курьера
    permissions: {
      canViewOrders: false,
      canUpdateOrderStatus: false,
      canViewAnalytics: false,
      canManageMenu: false,
      canManageUsers: false,
      canManageBonuses: false,
      canViewDeliveries: true,       // Может видеть свои доставки
      canUpdateDeliveryStatus: true,  // Может обновлять статус доставки
      canUpdateLocation: true,        // Может отправлять GPS координаты
    }
  },
  [UserRole.BARISTA]: {
    userIds: ['87777777777'],
    permissions: {
      canViewOrders: true,
      canUpdateOrderStatus: true,
      canViewAnalytics: false,
      canManageMenu: false,
      canManageUsers: false,
      canManageBonuses: false,
      canViewDeliveries: false,
      canUpdateDeliveryStatus: false,
      canUpdateLocation: false,
    }
  },
  [UserRole.CUSTOMER]: {
    userIds: [], // Все остальные пользователи
    permissions: {
      canViewOrders: false,
      canUpdateOrderStatus: false,
      canViewAnalytics: false,
      canManageMenu: false,
      canManageUsers: false,
      canManageBonuses: false,
      canViewDeliveries: false,
      canUpdateDeliveryStatus: false,
      canUpdateLocation: false,
    }
  }
};

/**
 * Получить роль пользователя по ID
 */
export const getUserRole = (userId: string): UserRole => {
  if (ROLE_CONFIG[UserRole.ADMIN].userIds.includes(userId)) {
    return UserRole.ADMIN;
  }
  
  if (ROLE_CONFIG[UserRole.COURIER].userIds.includes(userId)) {
    return UserRole.COURIER;
  }
  
  if (ROLE_CONFIG[UserRole.BARISTA].userIds.includes(userId)) {
    return UserRole.BARISTA;
  }
  
  return UserRole.CUSTOMER;
};

/**
 * Получить права доступа пользователя
 */
export const getUserPermissions = (userId: string): UserPermissions => {
  const role = getUserRole(userId);
  return ROLE_CONFIG[role].permissions;
};

/**
 * Проверить, имеет ли пользователь определенное право
 */
export const hasPermission = (userId: string, permission: keyof UserPermissions): boolean => {
  const permissions = getUserPermissions(userId);
  return permissions[permission];
};

/**
 * Получить название роли на русском
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Администратор';
    case UserRole.COURIER:
      return 'Курьер';
    case UserRole.BARISTA:
      return 'Бариста';
    case UserRole.CUSTOMER:
      return 'Клиент';
    default:
      return 'Неизвестно';
  }
};

/**
 * Получить текущего пользователя из localStorage
 */
export const getCurrentUserId = (): string => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.phone || user.id || user.userId || '87053096206';
    }
  } catch (e) {
    console.error('Ошибка получения ID пользователя:', e);
  }
  return '87053096206'; // Fallback к админу для тестирования
};
