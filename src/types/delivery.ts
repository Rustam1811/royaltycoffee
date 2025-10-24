/**
 * Delivery System Types
 * 
 * Comprehensive type definitions for the delivery system.
 * Follows Domain-Driven Design principles with clear separation of concerns.
 */

/**
 * Delivery method type
 */
export type DeliveryType = 'pickup' | 'delivery';

/**
 * Delivery status for tracking
 */
export type DeliveryStatus = 
  | 'pending'          // Заказ принят, ждет подтверждения
  | 'preparing'        // Заказ готовится
  | 'ready'            // Заказ готов, ожидает курьера
  | 'assigned'         // Курьер назначен
  | 'picked_up'        // Курьер забрал заказ
  | 'on_the_way'       // Курьер в пути
  | 'nearby'           // Курьер рядом (< 500м)
  | 'delivered'        // Доставлен
  | 'cancelled';       // Отменен

/**
 * Courier information
 */
export interface CourierInfo {
  /** Courier unique ID */
  id: string;
  
  /** Courier name */
  name: string;
  
  /** Courier phone */
  phone: string;
  
  /** Courier photo URL */
  photo?: string;
  
  /** Current location */
  location?: {
    lat: number;
    lng: number;
    heading?: number; // Direction in degrees (0-360)
    speed?: number;   // Speed in km/h
    accuracy?: number; // Location accuracy in meters
    timestamp: number; // Unix timestamp
  };
  
  /** Vehicle type */
  vehicle?: {
    type: 'car' | 'bike' | 'scooter' | 'walking';
    model?: string;
    plate?: string;
  };
  
  /** Rating */
  rating?: number;
  
  /** Total deliveries completed */
  deliveriesCompleted?: number;
  
  /** Whether courier is currently available */
  isAvailable: boolean;
  
  /** Current active orders */
  activeOrders?: string[];
}

/**
 * Tracking event for delivery history
 */
export interface TrackingEvent {
  /** Event unique ID */
  id: string;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Event type/status */
  status: DeliveryStatus;
  
  /** Event description */
  message: string;
  
  /** Location at event time (optional) */
  location?: {
    lat: number;
    lng: number;
  };
  
  /** Who triggered the event (courier, admin, system) */
  actor?: {
    type: 'courier' | 'admin' | 'system' | 'customer';
    id?: string;
    name?: string;
  };
}

/**
 * Route information
 */
export interface DeliveryRoute {
  /** Total distance in meters */
  distance: number;
  
  /** Estimated duration in seconds */
  duration: number;
  
  /** Route polyline (array of coordinates) */
  polyline: Array<{ lat: number; lng: number }>;
  
  /** Turn-by-turn directions */
  steps?: Array<{
    distance: number;
    duration: number;
    instruction: string;
    polyline: Array<{ lat: number; lng: number }>;
  }>;
}

/**
 * ETA (Estimated Time of Arrival) information
 */
export interface ETAInfo {
  /** Estimated arrival timestamp */
  estimatedArrival: number;
  
  /** Remaining distance in meters */
  remainingDistance: number;
  
  /** Remaining time in seconds */
  remainingTime: number;
  
  /** ETA status */
  status: 'on_time' | 'delayed' | 'early';
  
  /** Delay in seconds (positive = delayed, negative = early) */
  delay?: number;
  
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Delivery address with validation
 */
export interface DeliveryAddress {
  /** Street address (required for delivery) */
  street: string;
  
  /** Apartment/suite/floor number */
  apartment?: string;
  
  /** Building entrance/entrance code */
  entrance?: string;
  
  /** Floor number */
  floor?: string;
  
  /** Delivery instructions or notes */
  notes?: string;
  
  /** Geographic coordinates (for distance calculation) */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Delivery zone definition
 */
export interface DeliveryZone {
  /** Zone unique identifier */
  id: string;
  
  /** Zone display name (e.g., "Центр города", "Алматы районы") */
  name: string;
  
  /** Base delivery fee for this zone (₸) */
  baseFee: number;
  
  /** Maximum delivery radius from center (km) */
  maxRadius: number;
  
  /** Minimum order amount for this zone (₸) */
  minOrderAmount: number;
  
  /** Estimated delivery time (minutes) */
  estimatedTime: {
    min: number;
    max: number;
  };
  
  /** Whether delivery is available to this zone */
  isActive: boolean;
}

/**
 * Calculated delivery fee breakdown
 */
export interface DeliveryFee {
  /** Base delivery fee (₸) */
  baseFee: number;
  
  /** Distance-based surcharge (₸) */
  distanceSurcharge: number;
  
  /** Time-based surcharge (e.g., night delivery) (₸) */
  timeSurcharge: number;
  
  /** Total delivery fee (₸) */
  total: number;
  
  /** Zone applied for calculation */
  zone: DeliveryZone;
  
  /** Estimated delivery time range */
  estimatedTime: {
    min: number;
    max: number;
  };
}

/**
 * Address validation result
 */
export interface AddressValidation {
  /** Whether the address is valid */
  isValid: boolean;
  
  /** Validation errors (field-level) */
  errors: {
    street?: string;
    apartment?: string;
    general?: string;
  };
  
  /** Whether delivery is available to this address */
  isDeliverable: boolean;
  
  /** Reason if delivery is not available */
  unavailableReason?: string;
}

/**
 * Delivery time slot
 */
export interface DeliveryTimeSlot {
  /** Slot unique identifier */
  id: string;
  
  /** Display label (e.g., "Как можно скорее", "12:00-13:00") */
  label: string;
  
  /** Start time (24-hour format) */
  startTime?: string;
  
  /** End time (24-hour format) */
  endTime?: string;
  
  /** Whether this is ASAP delivery */
  isASAP: boolean;
  
  /** Whether this slot is available */
  isAvailable: boolean;
  
  /** Additional cost for this time slot (₸) */
  surcharge: number;
}

/**
 * Complete delivery information for order
 */
export interface DeliveryInfo {
  /** Delivery type */
  type: DeliveryType;
  
  /** Delivery address (only for delivery type) */
  address?: DeliveryAddress;
  
  /** Selected delivery time slot (only for delivery type) */
  timeSlot?: DeliveryTimeSlot;
  
  /** Calculated delivery fee (only for delivery type) */
  fee?: DeliveryFee;
  
  /** Customer phone for delivery contact */
  phone?: string;
  
  /** Current delivery status */
  status?: DeliveryStatus;
  
  /** Assigned courier (if any) */
  courier?: CourierInfo;
  
  /** Tracking events history */
  trackingEvents?: TrackingEvent[];
  
  /** Current route information */
  route?: DeliveryRoute;
  
  /** ETA information */
  eta?: ETAInfo;
}

/**
 * Delivery validation state
 */
export interface DeliveryState {
  /** Current delivery type */
  type: DeliveryType;
  
  /** Delivery address */
  address: DeliveryAddress;
  
  /** Address validation result */
  validation: AddressValidation;
  
  /** Calculated delivery fee */
  fee: DeliveryFee | null;
  
  /** Selected time slot */
  timeSlot: DeliveryTimeSlot | null;
  
  /** Whether delivery data is being validated/calculated */
  isProcessing: boolean;
  
  /** General error message */
  error: string | null;
}

/**
 * Complete delivery tracking state (for real-time updates)
 */
export interface DeliveryTrackingState {
  /** Order ID */
  orderId: string;
  
  /** Current status */
  status: DeliveryStatus;
  
  /** Delivery address */
  address: DeliveryAddress;
  
  /** Assigned courier */
  courier?: CourierInfo;
  
  /** Tracking events */
  events: TrackingEvent[];
  
  /** Current route */
  route?: DeliveryRoute;
  
  /** ETA information */
  eta?: ETAInfo;
  
  /** Shop location (origin) */
  shopLocation: {
    lat: number;
    lng: number;
  };
  
  /** Whether tracking is active */
  isActive: boolean;
  
  /** Last update timestamp */
  lastUpdated: number;
}
