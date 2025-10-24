/**
 * Delivery Address Form Component
 * 
 * Clean, reusable form for collecting delivery address.
 * Features:
 * - Real-time validation
 * - Clean UI with Tailwind
 * - Accessible form inputs
 * - Mobile-optimized
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPinIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

import type { DeliveryAddress, AddressValidation } from '../types/delivery';

interface DeliveryAddressFormProps {
  /** Current address value */
  address: DeliveryAddress;
  
  /** Callback when address changes */
  onChange: (address: DeliveryAddress) => void;
  
  /** Validation result (optional) */
  validation?: AddressValidation;
  
  /** Whether form is disabled */
  disabled?: boolean;
  
  /** Whether address is being processed (geocoding) */
  isProcessing?: boolean;
}

const DeliveryAddressForm: React.FC<DeliveryAddressFormProps> = ({
  address,
  onChange,
  validation,
  disabled = false,
  isProcessing = false,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const handleChange = useCallback(
    (field: keyof DeliveryAddress, value: string) => {
      onChange({
        ...address,
        [field]: value,
      });
    },
    [address, onChange]
  );
  
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);
  
  const showError = (field: keyof AddressValidation['errors']) =>
    touched[field] && validation?.errors[field];
  
  return (
    <div className="space-y-4">
      {/* Street Address */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <MapPinIcon className="w-4 h-4" />
          Адрес доставки
        </label>
        <div className="relative">
          <input
            type="text"
            value={address.street}
            onChange={e => handleChange('street', e.target.value)}
            onBlur={() => handleBlur('street')}
            placeholder="Улица, дом"
            disabled={disabled || isProcessing}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
              showError('street')
                ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-400'
                : 'border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {isProcessing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <AnimatePresence>
          {showError('street') && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 flex items-start gap-2 text-sm text-red-600"
            >
              <ExclamationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validation?.errors.street}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Apartment/Suite */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <HomeIcon className="w-4 h-4" />
            Квартира
          </label>
          <input
            type="text"
            value={address.apartment || ''}
            onChange={e => handleChange('apartment', e.target.value)}
            placeholder="№"
            disabled={disabled || isProcessing}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all disabled:opacity-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <BuildingOfficeIcon className="w-4 h-4" />
            Подъезд
          </label>
          <input
            type="text"
            value={address.entrance || ''}
            onChange={e => handleChange('entrance', e.target.value)}
            placeholder="№"
            disabled={disabled || isProcessing}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all disabled:opacity-50"
          />
        </div>
      </div>
      
      {/* Floor */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Этаж
        </label>
        <input
          type="text"
          value={address.floor || ''}
          onChange={e => handleChange('floor', e.target.value)}
          placeholder="Номер этажа"
          disabled={disabled || isProcessing}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all disabled:opacity-50"
        />
      </div>
      
      {/* Delivery Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-4 h-4" />
          Комментарий к доставке
        </label>
        <textarea
          value={address.notes || ''}
          onChange={e => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          placeholder="Код домофона, ориентиры, пожелания..."
          rows={3}
          disabled={disabled || isProcessing}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all resize-none disabled:opacity-50"
        />
        <div className="mt-1 text-xs text-slate-500">
          {address.notes?.length || 0} / 500
        </div>
      </div>
      
      {/* General Error */}
      <AnimatePresence>
        {validation?.errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
          >
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-900 mb-1">Ошибка</div>
              <div className="text-sm text-red-700">{validation.errors.general}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delivery Unavailable Warning */}
      <AnimatePresence>
        {validation && !validation.isDeliverable && validation.unavailableReason && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3"
          >
            <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900 mb-1">
                Доставка недоступна
              </div>
              <div className="text-sm text-amber-700">{validation.unavailableReason}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryAddressForm;
