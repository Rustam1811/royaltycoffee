/**
 * Workshop Types - Типы для модуля цеха
 */

// Роли в системе цеха
export type WorkshopRole = 'workshop_admin' | 'workshop_client' | 'workshop_owner' | 'superowner';

// Локализованная строка
export interface LocalizedString {
  ru: string;
  kz: string;
  en: string;
}

// Продукт цеха (круассан, панини и т.д.)
export interface WorkshopProduct {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  unit: 'шт' | 'кг' | 'порция';
  image?: string;
  categoryId: string;
  isAvailable: boolean;
  minOrder?: number; // минимальный заказ
  createdAt: Date;
  updatedAt: Date;
}

// Категория продукции
export interface WorkshopCategory {
  id: string;
  name: LocalizedString;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

// Точка клиента (кофейня, магазин и т.д.)
export interface ClientOutlet {
  id: string;
  name: string;
  address: string;
  phone?: string;
  deliveryTime?: string; // время доставки, например "08:00"
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

// Клиент цеха (заказчик)
export interface WorkshopClient {
  id: string;
  uid: string; // Firebase UID
  email: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  outlets: ClientOutlet[]; // точки клиента (6-7 адресов)
  isActive: boolean;
  onboardingCompleted: boolean; // заполнил ли клиент данные при первом входе
  createdAt: Date;
  updatedAt: Date;
}

// Элемент заказа
export interface OrderItem {
  productId: string;
  productName: LocalizedString;
  quantity: number;
  price: number;
  unit: string;
  subtotal: number;
}

// Статус заказа
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled';

// Заказ
export interface WorkshopOrder {
  id: string;
  clientId: string;
  clientName: string;
  outletId: string;
  outletName: string;
  outletAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
}

// Шаблон быстрого заказа (последний заказ для точки)
export interface QuickOrderTemplate {
  id: string;
  clientId: string;
  outletId: string;
  items: OrderItem[];
  lastUsed: Date;
}

// Аналитика по дням
export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  clientId: string;
  outletId?: string;
  totalOrders: number;
  totalAmount: number;
  itemsSummary: Record<string, { quantity: number; amount: number }>;
}

// Месячная аналитика
export interface MonthlyAnalytics {
  month: string; // YYYY-MM
  clientId: string;
  totalOrders: number;
  totalAmount: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
  }>;
}

// Контекст пользователя цеха
export interface WorkshopUser {
  uid: string;
  email: string | null;
  role: WorkshopRole;
  clientId?: string; // для клиентов - ID клиента
  companyName?: string;
}

// Настройки цеха
export interface WorkshopSettings {
  id: string;
  orderCutoffTime: string; // время окончания приёма заказов на завтра "18:00"
  minOrderAmount?: number;
  workingDays: number[]; // 0-6 (воскресенье-суббота)
  contactPhone: string;
  contactEmail: string;
}
