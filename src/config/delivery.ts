/**
 * Delivery Configuration
 * 
 * Business rules, zones, and settings for the delivery system.
 * Centralized configuration for easy maintenance.
 */

import type { DeliveryZone, DeliveryTimeSlot } from '../types/delivery';

/**
 * Coffee shop center coordinates (Astana)
 * Replace with actual coordinates
 */
export const SHOP_COORDINATES = {
  lat: 51.1694,
  lng: 71.4491,
};

/**
 * Delivery zones configuration
 */
export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'center',
    name: 'Центр города',
    baseFee: 500,
    maxRadius: 3,
    minOrderAmount: 1500,
    estimatedTime: { min: 20, max: 35 },
    isActive: true,
  },
  {
    id: 'near',
    name: 'Ближние районы',
    baseFee: 800,
    maxRadius: 7,
    minOrderAmount: 2000,
    estimatedTime: { min: 30, max: 50 },
    isActive: true,
  },
  {
    id: 'far',
    name: 'Дальние районы',
    baseFee: 1200,
    maxRadius: 15,
    minOrderAmount: 3000,
    estimatedTime: { min: 45, max: 70 },
    isActive: true,
  },
];

/**
 * Free delivery threshold (₸)
 * Orders above this amount get free delivery
 */
export const FREE_DELIVERY_THRESHOLD = 5000;

/**
 * Distance-based surcharge calculation
 * Price per km after base radius
 */
export const DISTANCE_SURCHARGE_PER_KM = 100;

/**
 * Night delivery surcharge (21:00 - 08:00)
 */
export const NIGHT_DELIVERY_SURCHARGE = 300;

/**
 * Available delivery time slots
 */
export const DELIVERY_TIME_SLOTS: DeliveryTimeSlot[] = [
  {
    id: 'asap',
    label: 'Как можно скорее',
    isASAP: true,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-1',
    label: '10:00 - 12:00',
    startTime: '10:00',
    endTime: '12:00',
    isASAP: false,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-2',
    label: '12:00 - 14:00',
    startTime: '12:00',
    endTime: '14:00',
    isASAP: false,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-3',
    label: '14:00 - 16:00',
    startTime: '14:00',
    endTime: '16:00',
    isASAP: false,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-4',
    label: '16:00 - 18:00',
    startTime: '16:00',
    endTime: '18:00',
    isASAP: false,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-5',
    label: '18:00 - 20:00',
    startTime: '18:00',
    endTime: '20:00',
    isASAP: false,
    isAvailable: true,
    surcharge: 0,
  },
  {
    id: 'slot-6',
    label: '20:00 - 22:00 (ночной тариф)',
    startTime: '20:00',
    endTime: '22:00',
    isASAP: false,
    isAvailable: true,
    surcharge: NIGHT_DELIVERY_SURCHARGE,
  },
];

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  /** Minimum street address length */
  minStreetLength: 5,
  
  /** Maximum street address length */
  maxStreetLength: 200,
  
  /** Maximum notes length */
  maxNotesLength: 500,
  
  /** Maximum delivery distance (km) */
  maxDeliveryDistance: 15,
  
  /** Minimum order amount for delivery (₸) */
  minOrderAmount: 1500,
};

/**
 * Error messages
 */
export const DELIVERY_ERRORS = {
  STREET_REQUIRED: 'Укажите адрес доставки',
  STREET_TOO_SHORT: 'Адрес слишком короткий (минимум 5 символов)',
  STREET_TOO_LONG: 'Адрес слишком длинный (максимум 200 символов)',
  NOTES_TOO_LONG: 'Комментарий слишком длинный (максимум 500 символов)',
  DISTANCE_TOO_FAR: 'К сожалению, доставка по этому адресу недоступна',
  ORDER_TOO_SMALL: 'Минимальная сумма заказа для доставки не достигнута',
  ZONE_NOT_FOUND: 'Не удалось определить зону доставки',
  INVALID_ADDRESS: 'Некорректный адрес доставки',
  PHONE_REQUIRED: 'Укажите контактный телефон для доставки',
};

/**
 * Helper to check if current time is night time
 */
export const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 21 || hour < 8;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
