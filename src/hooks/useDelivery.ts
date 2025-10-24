/**
 * useDelivery Hook
 * 
 * Custom hook for managing delivery state and business logic.
 * 
 * Features:
 * - Address management with validation
 * - Fee calculation with debouncing
 * - Geocoding integration
 * - Clean state management
 * - Memoized callbacks
 * 
 * Usage:
 * ```tsx
 * const delivery = useDelivery(orderAmount);
 * 
 * return (
 *   <DeliveryAddressForm
 *     address={delivery.address}
 *     onChange={delivery.setAddress}
 *     validation={delivery.validation}
 *   />
 * );
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

import type {
  DeliveryAddress,
  DeliveryFee,
  AddressValidation,
  DeliveryTimeSlot,
  DeliveryType,
} from '../types/delivery';

import {
  validateAddress,
  calculateDeliveryFee,
  geocodeAddress,
} from '../services/deliveryService';

import { DELIVERY_TIME_SLOTS } from '../config/delivery';

interface UseDeliveryOptions {
  /** Initial delivery type */
  initialType?: DeliveryType;
  
  /** Initial address */
  initialAddress?: DeliveryAddress;
  
  /** Initial time slot */
  initialTimeSlot?: DeliveryTimeSlot;
  
  /** Auto-geocode address on change */
  autoGeocode?: boolean;
}

interface UseDeliveryReturn {
  /** Current delivery type */
  type: DeliveryType;
  
  /** Set delivery type */
  setType: (type: DeliveryType) => void;
  
  /** Current address */
  address: DeliveryAddress;
  
  /** Set address (partial update supported) */
  setAddress: (address: Partial<DeliveryAddress> | ((prev: DeliveryAddress) => DeliveryAddress)) => void;
  
  /** Address validation result */
  validation: AddressValidation | null;
  
  /** Calculated delivery fee */
  fee: DeliveryFee | null;
  
  /** Selected time slot */
  timeSlot: DeliveryTimeSlot | null;
  
  /** Set time slot */
  setTimeSlot: (slot: DeliveryTimeSlot | null) => void;
  
  /** Available time slots */
  availableTimeSlots: DeliveryTimeSlot[];
  
  /** Whether address is being processed */
  isProcessing: boolean;
  
  /** Whether delivery is valid and ready */
  isReady: boolean;
  
  /** Error message */
  error: string | null;
  
  /** Reset delivery state */
  reset: () => void;
}

const INITIAL_ADDRESS: DeliveryAddress = {
  street: '',
  apartment: '',
  entrance: '',
  floor: '',
  notes: '',
};

/**
 * Main delivery hook
 */
export const useDelivery = (
  orderAmount: number,
  options: UseDeliveryOptions = {}
): UseDeliveryReturn => {
  const {
    initialType = 'pickup',
    initialAddress = INITIAL_ADDRESS,
    initialTimeSlot = null,
    autoGeocode = true,
  } = options;
  
  // State
  const [type, setType] = useState<DeliveryType>(initialType);
  const [address, setAddressState] = useState<DeliveryAddress>(initialAddress);
  const [timeSlot, setTimeSlot] = useState<DeliveryTimeSlot | null>(initialTimeSlot);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce address for geocoding
  const debouncedAddress = useDebounce(address.street, 800);
  
  // Validation (instant)
  const validation = useMemo<AddressValidation | null>(() => {
    if (type === 'pickup') return null;
    return validateAddress(address, orderAmount);
  }, [type, address, orderAmount]);
  
  // Fee calculation (after geocoding)
  const fee = useMemo<DeliveryFee | null>(() => {
    if (type === 'pickup') return null;
    if (!address.coordinates) return null;
    if (!validation?.isValid) return null;
    
    return calculateDeliveryFee(address, orderAmount, timeSlot);
  }, [type, address, orderAmount, timeSlot, validation]);
  
  // Available time slots
  const availableTimeSlots = useMemo(
    () => DELIVERY_TIME_SLOTS.filter(slot => slot.isAvailable),
    []
  );
  
  // Geocode address when it changes
  useEffect(() => {
    if (type === 'pickup') return;
    if (!autoGeocode) return;
    if (!debouncedAddress || debouncedAddress.length < 5) {
      setAddressState(prev => ({ ...prev, coordinates: undefined }));
      return;
    }
    
    let cancelled = false;
    
    const geocode = async () => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const coords = await geocodeAddress(debouncedAddress);
        
        if (!cancelled) {
          if (coords) {
            setAddressState(prev => ({ ...prev, coordinates: coords }));
          } else {
            setError('Не удалось определить координаты адреса');
            setAddressState(prev => ({ ...prev, coordinates: undefined }));
          }
        }
      } catch {
        if (!cancelled) {
          setError('Ошибка определения адреса');
          setAddressState(prev => ({ ...prev, coordinates: undefined }));
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };
    
    geocode();
    
    return () => {
      cancelled = true;
    };
  }, [debouncedAddress, type, autoGeocode]);
  
  // Set address (supports partial update)
  const setAddress = useCallback((update: Partial<DeliveryAddress> | ((prev: DeliveryAddress) => DeliveryAddress)) => {
    if (typeof update === 'function') {
      setAddressState(update);
    } else {
      setAddressState(prev => ({ ...prev, ...update }));
    }
  }, []);
  
  // Reset to initial state
  const reset = useCallback(() => {
    setType(initialType);
    setAddressState(initialAddress);
    setTimeSlot(initialTimeSlot);
    setError(null);
  }, [initialType, initialAddress, initialTimeSlot]);
  
  // Check if delivery is ready
  const isReady = useMemo(() => {
    if (type === 'pickup') return true;
    if (!validation?.isValid) return false;
    if (!validation.isDeliverable) return false;
    if (!fee) return false;
    return true;
  }, [type, validation, fee]);
  
  return {
    type,
    setType,
    address,
    setAddress,
    validation,
    fee,
    timeSlot,
    setTimeSlot,
    availableTimeSlots,
    isProcessing,
    isReady,
    error,
    reset,
  };
};
