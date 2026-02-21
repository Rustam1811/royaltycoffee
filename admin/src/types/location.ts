// admin/src/types/location.ts
// Type definitions for multi-location coffee shop network

export type StaffRole = 'owner' | 'admin' | 'barista' | 'kitchen' | 'courier';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  coordinates?: LocationCoordinates;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationStaff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  locationId: string;  // Привязка к точке (для owner = 'all')
  isActive: boolean;
  createdAt: Date;
}

export interface LocationStats {
  locationId: string;
  revenue: number;
  orders: number;
  averageCheck: number;
  growth: number;
}

export interface LocationAnalytics extends Location {
  stats: LocationStats;
}

export const MAX_LOCATIONS = 10;

export const DEFAULT_LOCATION_ID = 'main';

// Роли которые имеют доступ ко всем точкам
export const ALL_LOCATIONS_ROLES: StaffRole[] = ['owner'];
