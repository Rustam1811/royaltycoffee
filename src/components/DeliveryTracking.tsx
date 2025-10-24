/**
 * DeliveryTracking Component
 * 
 * Complete delivery tracking UI for customers showing:
 * - Current status with timeline
 * - Live map with courier location
 * - ETA and distance
 * - Courier information
 * - Real-time updates via Firebase
 * 
 * Like Yandex.Eda / Glovo tracking experience
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

import DeliveryMap from './DeliveryMap';
import type {
  DeliveryTrackingState,
  TrackingEvent,
} from '../types/delivery';

import {
  STATUS_LABELS,
  STATUS_ICONS,
  formatETA,
  formatDistance,
  formatTime,
  getVehicleIcon,
  calculateDeliveryProgress,
} from '../services/deliveryTrackingService';

interface DeliveryTrackingProps {
  /** Order ID */
  orderId: string;
  
  /** Initial tracking state */
  initialState?: DeliveryTrackingState;
  
  /** Callback when tracking state updates */
  onUpdate?: (state: DeliveryTrackingState) => void;
}

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({
  orderId,
  initialState,
  onUpdate,
}) => {
  const [trackingState, setTrackingState] = useState<DeliveryTrackingState | null>(
    initialState || null
  );
  const [isLoading, setIsLoading] = useState(!initialState);
  
  // TODO: Subscribe to real-time updates via Firebase
  useEffect(() => {
    // Mock: Load tracking state
    // In production: Subscribe to Firestore document
    // const unsubscribe = firestore
    //   .collection('orders')
    //   .doc(orderId)
    //   .onSnapshot(doc => {
    //     const data = doc.data();
    //     setTrackingState(data.trackingState);
    //     onUpdate?.(data.trackingState);
    //   });
    
    // Mock implementation
    if (!initialState) {
      setTimeout(() => {
        // Mock data
        setTrackingState({
          orderId,
          status: 'on_the_way',
          address: {
            street: 'Улица Абая, 10',
            apartment: '25',
            coordinates: { lat: 43.240, lng: 76.890 },
          },
          courier: {
            id: 'courier-1',
            name: 'Иван',
            phone: '+77001234567',
            photo: 'https://i.pravatar.cc/150?u=courier1',
            location: {
              lat: 43.235,
              lng: 76.885,
              heading: 45,
              speed: 35,
              accuracy: 10,
              timestamp: Date.now(),
            },
            vehicle: {
              type: 'car',
              model: 'Toyota Camry',
              plate: '777 ABC 01',
            },
            rating: 4.8,
            deliveriesCompleted: 1250,
            isAvailable: true,
            activeOrders: [orderId],
          },
          events: [
            {
              id: 'e1',
              timestamp: Date.now() - 1800000,
              status: 'pending',
              message: 'Заказ принят',
              actor: { type: 'system' },
            },
            {
              id: 'e2',
              timestamp: Date.now() - 1200000,
              status: 'preparing',
              message: 'Заказ готовится',
              actor: { type: 'admin', name: 'Бариста' },
            },
            {
              id: 'e3',
              timestamp: Date.now() - 600000,
              status: 'ready',
              message: 'Заказ готов',
              actor: { type: 'admin' },
            },
            {
              id: 'e4',
              timestamp: Date.now() - 300000,
              status: 'assigned',
              message: 'Курьер назначен',
              actor: { type: 'admin' },
            },
            {
              id: 'e5',
              timestamp: Date.now() - 180000,
              status: 'picked_up',
              message: 'Курьер забрал заказ',
              actor: { type: 'courier', name: 'Иван' },
            },
            {
              id: 'e6',
              timestamp: Date.now() - 60000,
              status: 'on_the_way',
              message: 'Курьер в пути',
              actor: { type: 'courier', name: 'Иван' },
            },
          ],
          eta: {
            estimatedArrival: Date.now() + 600000, // 10 minutes
            remainingDistance: 3200, // 3.2 km
            remainingTime: 600, // 10 minutes
            status: 'on_time',
            lastUpdated: Date.now(),
          },
          shopLocation: {
            lat: 43.238949,
            lng: 76.889709,
          },
          isActive: true,
          lastUpdated: Date.now(),
        });
        setIsLoading(false);
      }, 1000);
    }
    
    // Return cleanup
    return () => {
      // unsubscribe();
    };
  }, [orderId, initialState, onUpdate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-slate-600">Загрузка информации о доставке...</div>
        </div>
      </div>
    );
  }
  
  if (!trackingState) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-2xl mb-2">😔</div>
          <div className="text-slate-900 font-semibold mb-1">Заказ не найден</div>
          <div className="text-slate-600 text-sm">Проверьте номер заказа</div>
        </div>
      </div>
    );
  }
  
  const progress = calculateDeliveryProgress(trackingState.status);
  
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Заказ #{orderId.slice(-6)}</div>
              <div className="text-lg font-bold text-slate-900">
                {STATUS_LABELS[trackingState.status]}
              </div>
            </div>
            <div className="text-4xl">
              {STATUS_ICONS[trackingState.status]}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 relative">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-500 text-right">
              {progress}% завершено
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ETA Card */}
        {trackingState.eta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <ClockIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-slate-900">
                  {formatETA(trackingState.eta)}
                </div>
                <div className="text-sm text-slate-600">
                  Осталось {formatDistance(trackingState.eta.remainingDistance)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Courier Info */}
        {trackingState.courier && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              {trackingState.courier.photo ? (
                <img
                  src={trackingState.courier.photo}
                  alt={trackingState.courier.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl">
                  👤
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  {trackingState.courier.name}
                </div>
                <div className="text-sm text-slate-600 flex items-center gap-2">
                  {getVehicleIcon(trackingState.courier.vehicle?.type)} Курьер
                  {trackingState.courier.rating && (
                    <span className="flex items-center gap-1">
                      <span>⭐</span>
                      <span>{trackingState.courier.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`tel:${trackingState.courier.phone}`}
                className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
              >
                <PhoneIcon className="w-6 h-6" />
              </a>
            </div>
            
            {trackingState.courier.vehicle && (
              <div className="text-sm text-slate-600">
                {trackingState.courier.vehicle.model} • {trackingState.courier.vehicle.plate}
              </div>
            )}
          </motion.div>
        )}
        
        {/* Map */}
        {trackingState.courier?.location && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DeliveryMap
              shopLocation={trackingState.shopLocation}
              customerLocation={trackingState.address.coordinates!}
              courierLocation={trackingState.courier.location}
              courierInfo={trackingState.courier}
              route={trackingState.route}
              height="400px"
              showRoute
              followCourier
            />
          </motion.div>
        )}
        
        {/* Delivery Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-6 h-6 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-slate-900 mb-1">Адрес доставки</div>
              <div className="text-sm text-slate-600">
                {trackingState.address.street}
                {trackingState.address.apartment && `, кв. ${trackingState.address.apartment}`}
              </div>
              {trackingState.address.notes && (
                <div className="mt-2 text-sm text-slate-500 italic">
                  {trackingState.address.notes}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="font-semibold text-slate-900 mb-4">История заказа</div>
          <div className="space-y-4">
            {trackingState.events
              .slice()
              .reverse()
              .map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isFirst={index === 0}
                  isLast={index === trackingState.events.length - 1}
                />
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Timeline Event Component
const TimelineEvent: React.FC<{
  event: TrackingEvent;
  isFirst: boolean;
  isLast: boolean;
}> = ({ event, isFirst, isLast }) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isFirst
              ? 'bg-blue-100 text-blue-600'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isFirst ? (
            <CheckCircleIcon className="w-6 h-6" />
          ) : (
            <div className="text-lg">{STATUS_ICONS[event.status]}</div>
          )}
        </motion.div>
        {!isLast && (
          <div className="w-0.5 h-8 bg-slate-200 my-1" />
        )}
      </div>
      <div className="flex-1 pb-4">
        <div className="font-semibold text-slate-900">{event.message}</div>
        <div className="text-sm text-slate-500">{formatTime(event.timestamp)}</div>
        {event.actor && event.actor.name && (
          <div className="text-xs text-slate-400 mt-1">
            {event.actor.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryTracking;
