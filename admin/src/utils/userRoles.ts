export enum UserRole {
  ADMIN = 'admin',
  BARISTA = 'barista',
  CUSTOMER = 'customer'
}

export const getCurrentUserId = (): string => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.phone || user.id || user.userId || '87053096206';
    }
  } catch {}
  return '87053096206';
};

export const getUserRole = (userId: string): UserRole => {
  if (userId === '87053096206') return UserRole.ADMIN;
  if (userId === '87777777777') return UserRole.BARISTA;
  return UserRole.CUSTOMER;
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return '?????????????';
    case UserRole.BARISTA:
      return '???????';
    default:
      return '????????????';
  }
};
