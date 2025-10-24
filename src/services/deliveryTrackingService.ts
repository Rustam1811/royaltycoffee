/**
 * Delivery Tracking Service
 * 
 * Business logic for delivery tracking, courier management, ETA calculation.
 * Clean architecture with pure functions and Firebase integration.
 * 
 * Features:
 * - Status management
 * - ETA calculation
 * - Distance/time tracking
 * - Event logging
 */

import type {
  DeliveryStatus,
  TrackingEvent,
  ETAInfo,
  DeliveryRoute,
} from '../types/delivery';

import { calculateDistance } from '../config/delivery';

/**
 * Status display names (Russian)
 */
export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Заказ принят',
  preparing: 'Готовится',
  ready: 'Готов к выдаче',
  assigned: 'Курьер назначен',
  picked_up: 'Забран курьером',
  on_the_way: 'В пути',
  nearby: 'Курьер рядом',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
};

/**
 * Status icons (emojis)
 */
export const STATUS_ICONS: Record<DeliveryStatus, string> = {
  pending: '⏳',
  preparing: '👨‍🍳',
  ready: '✅',
  assigned: '🚗',
  picked_up: '📦',
  on_the_way: '🚚',
  nearby: '📍',
  delivered: '🎉',
  cancelled: '❌',
};

/**
 * Status colors (Tailwind classes)
 */
export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  picked_up: 'bg-purple-100 text-purple-800 border-purple-200',
  on_the_way: 'bg-orange-100 text-orange-800 border-orange-200',
  nearby: 'bg-pink-100 text-pink-800 border-pink-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Check if status is terminal (final)
 */
export const isTerminalStatus = (status: DeliveryStatus): boolean => {
  return status === 'delivered' || status === 'cancelled';
};

/**
 * Get next possible statuses
 */
export const getNextStatuses = (current: DeliveryStatus): DeliveryStatus[] => {
  const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['assigned', 'cancelled'],
    assigned: ['picked_up', 'cancelled'],
    picked_up: ['on_the_way', 'cancelled'],
    on_the_way: ['nearby', 'delivered', 'cancelled'],
    nearby: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };
  
  return transitions[current] || [];
};

/**
 * Calculate ETA based on courier location and destination
 */
export const calculateETA = (
  courierLocation: { lat: number; lng: number },
  destinationLocation: { lat: number; lng: number },
  averageSpeed: number = 30 // km/h, default urban speed
): ETAInfo => {
  // Calculate distance
  const distance = calculateDistance(
    courierLocation.lat,
    courierLocation.lng,
    destinationLocation.lat,
    destinationLocation.lng
  );
  
  const distanceMeters = distance * 1000;
  
  // Calculate time (accounting for urban traffic)
  const timeHours = distance / averageSpeed;
  const timeSeconds = Math.ceil(timeHours * 3600);
  
  // Add buffer for stops, traffic lights, etc. (20%)
  const bufferedTime = Math.ceil(timeSeconds * 1.2);
  
  const now = Date.now();
  const estimatedArrival = now + bufferedTime * 1000;
  
  // Determine status (on_time if within expected range)
  let status: ETAInfo['status'] = 'on_time';
  let delay: number | undefined;
  
  // Simple heuristic: if time > expected (based on distance), it's delayed
  const expectedTime = (distance / 40) * 3600; // 40 km/h ideal speed
  if (bufferedTime > expectedTime * 1.3) {
    status = 'delayed';
    delay = bufferedTime - expectedTime;
  } else if (bufferedTime < expectedTime * 0.7) {
    status = 'early';
    delay = expectedTime - bufferedTime;
  }
  
  return {
    estimatedArrival,
    remainingDistance: distanceMeters,
    remainingTime: bufferedTime,
    status,
    delay,
    lastUpdated: now,
  };
};

/**
 * Check if courier is nearby (within 500 meters)
 */
export const isCourierNearby = (
  courierLocation: { lat: number; lng: number },
  destinationLocation: { lat: number; lng: number }
): boolean => {
  const distance = calculateDistance(
    courierLocation.lat,
    courierLocation.lng,
    destinationLocation.lat,
    destinationLocation.lng
  );
  
  return distance < 0.5; // < 500 meters
};

/**
 * Create tracking event
 */
export const createTrackingEvent = (
  status: DeliveryStatus,
  message: string,
  actor?: TrackingEvent['actor'],
  location?: { lat: number; lng: number }
): TrackingEvent => {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    status,
    message,
    location,
    actor,
  };
};

/**
 * Format ETA for display
 */
export const formatETA = (eta: ETAInfo): string => {
  const minutes = Math.ceil(eta.remainingTime / 60);
  
  if (minutes < 1) {
    return 'Прибыл';
  }
  
  if (minutes === 1) {
    return '1 минута';
  }
  
  if (minutes < 5) {
    return `${minutes} минуты`;
  }
  
  return `${minutes} минут`;
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  
  const km = meters / 1000;
  return `${km.toFixed(1)} км`;
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format timestamp to readable date and time
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get vehicle icon
 */
export const getVehicleIcon = (type?: 'car' | 'bike' | 'scooter' | 'walking'): string => {
  const icons = {
    car: '🚗',
    bike: '🚴',
    scooter: '🛵',
    walking: '🚶',
  };
  
  return icons[type || 'car'];
};

/**
 * Calculate delivery progress (0-100%)
 */
export const calculateDeliveryProgress = (status: DeliveryStatus): number => {
  const progressMap: Record<DeliveryStatus, number> = {
    pending: 10,
    preparing: 25,
    ready: 40,
    assigned: 50,
    picked_up: 60,
    on_the_way: 80,
    nearby: 95,
    delivered: 100,
    cancelled: 0,
  };
  
  return progressMap[status] || 0;
};

/**
 * Estimate preparation time based on order items count
 */
export const estimatePreparationTime = (itemsCount: number): number => {
  // Base time: 10 minutes
  // Additional time: 2 minutes per item
  const baseTime = 10;
  const perItemTime = 2;
  
  return baseTime + (itemsCount * perItemTime);
};

/**
 * Calculate route polyline for 2GIS (mock - will be replaced with actual API)
 */
export const calculateRoute = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DeliveryRoute> => {
  // Mock implementation - in production, call 2GIS Routing API
  // https://docs.2gis.com/ru/api/routing/overview
  
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng) * 1000; // meters
  const duration = (distance / 1000) / 30 * 3600; // seconds at 30 km/h
  
  // Simple straight line for mock
  const polyline = [
    from,
    to,
  ];
  
  return {
    distance,
    duration,
    polyline,
  };
};

/**
 * Parse 2GIS route response (for actual API integration)
 */
export const parse2GISRoute = (response: unknown): DeliveryRoute => {
  // TODO: Implement when integrating with real 2GIS API
  // Parse response according to 2GIS Routing API documentation
  const r = response as Record<string, unknown>;
  
  return {
    distance: (r.distance as number) || 0,
    duration: (r.duration as number) || 0,
    polyline: (r.geometry as Array<{ lat: number; lng: number }>) || [],
    steps: (r.maneuvers as Array<Record<string, unknown>>)?.map((m: Record<string, unknown>) => ({
      distance: m.distance as number,
      duration: m.duration as number,
      instruction: m.instruction as string,
      polyline: (m.geometry as Array<{ lat: number; lng: number }>) || [],
    })),
  };
};
