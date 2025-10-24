/**
 * Delivery Service
 * 
 * Business logic layer for delivery system.
 * Handles address validation, fee calculation, zone detection.
 * 
 * Clean Architecture principles:
 * - Pure functions where possible
 * - No side effects
 * - Single responsibility
 * - Easy to test
 */

import type {
  DeliveryAddress,
  DeliveryZone,
  DeliveryFee,
  AddressValidation,
  DeliveryTimeSlot,
} from '../types/delivery';

import {
  DELIVERY_ZONES,
  SHOP_COORDINATES,
  FREE_DELIVERY_THRESHOLD,
  DISTANCE_SURCHARGE_PER_KM,
  NIGHT_DELIVERY_SURCHARGE,
  VALIDATION_RULES,
  DELIVERY_ERRORS,
  calculateDistance,
  isNightTime,
} from '../config/delivery';

/**
 * Validate delivery address
 * 
 * @param address - Address to validate
 * @param orderAmount - Order total amount (for minimum check)
 * @returns Validation result with errors and deliverability status
 */
export const validateAddress = (
  address: DeliveryAddress,
  orderAmount: number
): AddressValidation => {
  const errors: AddressValidation['errors'] = {};
  
  // Street validation
  if (!address.street || address.street.trim().length === 0) {
    errors.street = DELIVERY_ERRORS.STREET_REQUIRED;
  } else if (address.street.length < VALIDATION_RULES.minStreetLength) {
    errors.street = DELIVERY_ERRORS.STREET_TOO_SHORT;
  } else if (address.street.length > VALIDATION_RULES.maxStreetLength) {
    errors.street = DELIVERY_ERRORS.STREET_TOO_LONG;
  }
  
  // Notes validation
  if (address.notes && address.notes.length > VALIDATION_RULES.maxNotesLength) {
    errors.general = DELIVERY_ERRORS.NOTES_TOO_LONG;
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  // Check if delivery is available
  let isDeliverable = isValid;
  let unavailableReason: string | undefined;
  
  if (orderAmount < VALIDATION_RULES.minOrderAmount) {
    isDeliverable = false;
    unavailableReason = `${DELIVERY_ERRORS.ORDER_TOO_SMALL} (минимум ${VALIDATION_RULES.minOrderAmount}₸)`;
  }
  
  // If coordinates provided, check distance
  if (isValid && address.coordinates) {
    const distance = calculateDistance(
      SHOP_COORDINATES.lat,
      SHOP_COORDINATES.lng,
      address.coordinates.lat,
      address.coordinates.lng
    );
    
    if (distance > VALIDATION_RULES.maxDeliveryDistance) {
      isDeliverable = false;
      unavailableReason = DELIVERY_ERRORS.DISTANCE_TOO_FAR;
    }
  }
  
  return {
    isValid,
    errors,
    isDeliverable,
    unavailableReason,
  };
};

/**
 * Detect delivery zone based on distance
 * 
 * @param distance - Distance from shop in km
 * @returns Delivery zone or null if out of range
 */
export const detectZone = (distance: number): DeliveryZone | null => {
  // Find the smallest zone that can accommodate this distance
  const sortedZones = [...DELIVERY_ZONES]
    .filter(z => z.isActive)
    .sort((a, b) => a.maxRadius - b.maxRadius);
  
  for (const zone of sortedZones) {
    if (distance <= zone.maxRadius) {
      return zone;
    }
  }
  
  return null; // Out of delivery range
};

/**
 * Calculate delivery fee
 * 
 * @param address - Delivery address with coordinates
 * @param orderAmount - Order total amount
 * @param timeSlot - Selected time slot (optional)
 * @returns Calculated delivery fee or null if delivery unavailable
 */
export const calculateDeliveryFee = (
  address: DeliveryAddress,
  orderAmount: number,
  timeSlot?: DeliveryTimeSlot | null
): DeliveryFee | null => {
  // Must have coordinates for calculation
  if (!address.coordinates) {
    return null;
  }
  
  // Calculate distance
  const distance = calculateDistance(
    SHOP_COORDINATES.lat,
    SHOP_COORDINATES.lng,
    address.coordinates.lat,
    address.coordinates.lng
  );
  
  // Detect zone
  const zone = detectZone(distance);
  if (!zone) {
    return null; // Out of delivery range
  }
  
  // Check minimum order amount
  if (orderAmount < zone.minOrderAmount) {
    return null;
  }
  
  // Free delivery for orders above threshold
  if (orderAmount >= FREE_DELIVERY_THRESHOLD) {
    return {
      baseFee: 0,
      distanceSurcharge: 0,
      timeSurcharge: 0,
      total: 0,
      zone,
      estimatedTime: zone.estimatedTime,
    };
  }
  
  // Calculate base fee
  const baseFee = zone.baseFee;
  
  // Calculate distance surcharge (if beyond base radius)
  let distanceSurcharge = 0;
  const baseRadius = DELIVERY_ZONES[0]?.maxRadius || 3; // Use center zone as base
  if (distance > baseRadius) {
    const extraDistance = distance - baseRadius;
    distanceSurcharge = Math.ceil(extraDistance * DISTANCE_SURCHARGE_PER_KM);
  }
  
  // Calculate time surcharge
  let timeSurcharge = 0;
  if (timeSlot && !timeSlot.isASAP) {
    timeSurcharge = timeSlot.surcharge;
  } else if (isNightTime()) {
    timeSurcharge = NIGHT_DELIVERY_SURCHARGE;
  }
  
  return {
    baseFee,
    distanceSurcharge,
    timeSurcharge,
    total: baseFee + distanceSurcharge + timeSurcharge,
    zone,
    estimatedTime: zone.estimatedTime,
  };
};

/**
 * Get coordinates from address string (mock implementation)
 * In production, integrate with geocoding API (Google Maps, Yandex Maps, etc.)
 * 
 * @param address - Address string
 * @returns Promise with coordinates or null if geocoding fails
 */
export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  // Mock implementation - in production, call geocoding API
  // For now, return coordinates near shop with some random offset
  
  if (!address || address.trim().length < 5) {
    return null;
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock: Return coordinates with small random offset
  // In production: call Yandex Maps API, Google Maps API, or 2GIS API
  const randomOffset = () => (Math.random() - 0.5) * 0.05; // ~2-3 km range
  
  return {
    lat: SHOP_COORDINATES.lat + randomOffset(),
    lng: SHOP_COORDINATES.lng + randomOffset(),
  };
};

/**
 * Check if address is within delivery range
 * 
 * @param coordinates - Address coordinates
 * @returns true if within range, false otherwise
 */
export const isWithinDeliveryRange = (coordinates: {
  lat: number;
  lng: number;
}): boolean => {
  const distance = calculateDistance(
    SHOP_COORDINATES.lat,
    SHOP_COORDINATES.lng,
    coordinates.lat,
    coordinates.lng
  );
  
  return distance <= VALIDATION_RULES.maxDeliveryDistance;
};

/**
 * Format delivery time estimate
 * 
 * @param estimatedTime - Time range in minutes
 * @returns Formatted string (e.g., "20-35 мин")
 */
export const formatDeliveryTime = (estimatedTime: {
  min: number;
  max: number;
}): string => {
  return `${estimatedTime.min}-${estimatedTime.max} мин`;
};

/**
 * Get minimum order amount for delivery based on zone
 * 
 * @param distance - Distance from shop in km
 * @returns Minimum order amount in ₸
 */
export const getMinimumOrderAmount = (distance: number): number => {
  const zone = detectZone(distance);
  return zone?.minOrderAmount || VALIDATION_RULES.minOrderAmount;
};
