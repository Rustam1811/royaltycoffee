/**
 * Courier Dashboard
 * 
 * Real-time delivery orders dashboard for couriers
 * - View assigned deliveries from Firestore
 * - GPS tracking integration
 * - Update delivery status
 * - Track route on Yandex Maps
 */

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { UserContext } from '@/contexts/UserContext';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { CourierTrackingMap } from '@/components/CourierTrackingMap';
import { OrderStatus, OrderType } from '@/types/orderStatus';
import DeliveryStatusBadge from '@/components/DeliveryStatusBadge';
import type { DeliveryStatus } from '@/components/DeliveryStatusBadge';
import { courierLocationService } from '@/services/courierLocationService';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    apartment?: string;
    coordinates?: { lat: number; lng: number };
  };
  amount: number;
  status: DeliveryStatus;
  eta?: {
    remainingTime: number;
    remainingDistance: number;
  };
  createdAt: number;
}

const CourierDashboard: React.FC = () => {
  const { user } = useContext(UserContext);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  
  // Real-time subscription to delivery orders from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('type', '==', 'delivery'),
      where('status', 'in', ['READY', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY']),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders: DeliveryOrder[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderNumber: data.orderNumber || doc.id.slice(-6),
          customerName: data.customerName || 'Клиент',
          customerPhone: data.customerPhone || data.phone || '',
          address: {
            street: data.address?.street || data.deliveryAddress || '',
            apartment: data.address?.apartment,
            coordinates: data.address?.coordinates,
          },
          amount: data.total || data.amount || 0,
          status: mapOrderStatusToDelivery(data.status),
          eta: data.eta,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
        };
      });
      
      setDeliveries(orders);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching deliveries:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);
  
  // Map OrderStatus to DeliveryStatus
  const mapOrderStatusToDelivery = (status: string): DeliveryStatus => {
    const mapping: Record<string, DeliveryStatus> = {
      'READY': 'ready',
      'ASSIGNED': 'assigned',
      'PICKED_UP': 'picked_up',
      'ON_THE_WAY': 'on_the_way',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
    };
    return mapping[status] || 'pending';
  };
  
  // GPS Tracking with courierLocationService
  useEffect(() => {
    if (!user?.uid) return;
    
    if (isTrackingEnabled) {
      // Start GPS tracking for first active delivery
      const activeDelivery = deliveries.find(d => 
        ['assigned', 'picked_up', 'on_the_way', 'nearby'].includes(d.status)
      );
      
      if (activeDelivery) {
        courierLocationService.startTracking(user.uid, activeDelivery.id)
          .catch(err => {
            console.error('Failed to start tracking:', err);
            setTrackingError('Не удалось запустить GPS');
            setIsTrackingEnabled(false);
          });
      }
      
      // Subscribe to location updates
      const unsubscribe = courierLocationService.subscribeToLocation(
        user.uid,
        (location) => {
          if (location) {
            setCurrentLocation({
              lat: location.lat,
              lng: location.lng,
            });
            setTrackingError(null);
          }
        }
      );
      
      return () => {
        unsubscribe();
        courierLocationService.stopTracking();
      };
    } else {
      // Stop tracking when disabled
      courierLocationService.stopTracking();
      setCurrentLocation(null);
    }
  }, [isTrackingEnabled, user?.uid, deliveries]);
  
  const updateDeliveryStatus = async (orderId: string, newStatus: DeliveryStatus) => {
    try {
      // TODO: Use orderStatusService.updateStatus() instead
      setDeliveries(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };
  
  const getNextStatuses = (currentStatus: DeliveryStatus): DeliveryStatus[] => {
    const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      pending: [],
      preparing: [],
      ready: [],
      assigned: ['picked_up', 'cancelled'],
      picked_up: ['on_the_way', 'cancelled'],
      on_the_way: ['nearby', 'delivered', 'cancelled'],
      nearby: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };
    
    return transitions[currentStatus] || [];
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-600">Загрузка доставок...</div>
        </div>
      </div>
    );
  }
  
  const activeDeliveries = deliveries.filter(d => 
    ['assigned', 'picked_up', 'on_the_way', 'nearby'].includes(d.status)
  );
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои доставки</h1>
          <p className="text-gray-600">Активных: {activeDeliveries.length}</p>
        </div>
        
        {/* GPS Tracking Control */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MapPinIcon className={`w-8 h-8 ${isTrackingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">GPS Трекинг</h3>
                <p className="text-sm text-gray-600">
                  {isTrackingEnabled ? 'Включен • Обновляется каждые 10 сек' : 'Выключен'}
                </p>
                {trackingError && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ {trackingError}
                  </p>
                )}
                {currentLocation && !trackingError && (
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setIsTrackingEnabled(!isTrackingEnabled)}
              disabled={activeDeliveries.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeDeliveries.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isTrackingEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isTrackingEnabled ? (
                <>
                  <StopIcon className="w-5 h-5" />
                  Остановить
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Запустить
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Deliveries List */}
        {activeDeliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет активных доставок</h3>
            <p className="text-gray-600">Новые доставки появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map(delivery => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                courierLocation={currentLocation}
                onStatusUpdate={updateDeliveryStatus}
                getNextStatuses={getNextStatuses}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Delivery Card Component - Minimalist Design
const DeliveryCard: React.FC<{
  delivery: DeliveryOrder;
  courierLocation: { lat: number; lng: number } | null;
  onStatusUpdate: (orderId: string, status: DeliveryStatus) => void;
  getNextStatuses: (status: DeliveryStatus) => DeliveryStatus[];
}> = ({ delivery, courierLocation, onStatusUpdate, getNextStatuses }) => {
  const nextStatuses = getNextStatuses(delivery.status);
  const [showMap, setShowMap] = React.useState(false);
  const { user } = useContext(UserContext);
  
  // Map old DeliveryStatus to new OrderStatus enum
  const mapToOrderStatus = (status: DeliveryStatus): OrderStatus => {
    const mapping: Partial<Record<DeliveryStatus, OrderStatus>> = {
      assigned: OrderStatus.ASSIGNED,
      picked_up: OrderStatus.PICKED_UP,
      on_the_way: OrderStatus.ON_THE_WAY,
      nearby: OrderStatus.ON_THE_WAY,
      delivered: OrderStatus.DELIVERED,
      cancelled: OrderStatus.CANCELLED,
      pending: OrderStatus.NEW,
      preparing: OrderStatus.PREPARING,
      ready: OrderStatus.READY,
    };
    return mapping[status] || OrderStatus.ASSIGNED;
  };

  const currentOrderStatus = mapToOrderStatus(delivery.status);
  
  const courierInfo = {
    id: user?.uid || 'courier-123',
    name: user?.email?.split('@')[0] || 'Курьер',
    phone: '+7 777 123 4567',
    photo: undefined,
    vehicleType: '🛵 Мотоцикл',
    vehiclePlate: 'A123BC',
    isOnline: true,
  };

  const eta = delivery.eta ? {
    remainingTime: delivery.eta.remainingTime,
    remainingDistance: delivery.eta.remainingDistance,
  } : undefined;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{delivery.orderNumber}</h3>
            <p className="text-sm text-gray-600">
              {new Date(delivery.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <DeliveryStatusBadge status={delivery.status} size="md" />
        </div>

        {/* Minimalist Progress Timeline */}
        <div className="mb-6">
          <OrderStatusTimeline
            currentStatus={currentOrderStatus}
            orderType={OrderType.DELIVERY}
            compact={true}
          />
        </div>
        
        {/* Customer Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{delivery.customerName}</span>
            <a
              href={`tel:${delivery.customerPhone}`}
              className="text-blue-600 hover:text-blue-700 ml-2"
            >
              {delivery.customerPhone}
            </a>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <div>{delivery.address.street}</div>
              {delivery.address.apartment && (
                <div className="text-gray-600">Кв. {delivery.address.apartment}</div>
              )}
            </div>
          </div>
          
          {delivery.eta && (
            <div className="flex items-center gap-4 text-sm p-3 bg-blue-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-900">
                  {Math.ceil(delivery.eta.remainingTime / 60)} минут
                </div>
                <div className="text-blue-700">
                  {(delivery.eta.remainingDistance / 1000).toFixed(1)} км
                </div>
              </div>
            </div>
          )}
          
          <div className="text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
            {delivery.amount} ₸
          </div>
        </div>

        {/* Map Toggle */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <MapPinIcon className="w-5 h-5" />
          {showMap ? 'Скрыть карту' : 'Показать маршрут'}
        </button>
        
        {/* Action Buttons */}
        {nextStatuses.length > 0 && (
          <div className="space-y-2">
            {nextStatuses.map(status => (
              <button
                key={status}
                onClick={() => onStatusUpdate(delivery.id, status)}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  status === 'cancelled'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : status === 'delivered'
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {status === 'delivered' && <CheckCircleIcon className="w-5 h-5" />}
                {status === 'cancelled' && <XCircleIcon className="w-5 h-5" />}
                {status === 'picked_up' && '📦'}
                {status === 'on_the_way' && '🚚'}
                {status === 'nearby' && '📍'}
                {' '}
                {status === 'picked_up' && 'Забрал заказ'}
                {status === 'on_the_way' && 'Еду к клиенту'}
                {status === 'nearby' && 'Я рядом'}
                {status === 'delivered' && 'Доставлено'}
                {status === 'cancelled' && 'Отменить'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Yandex Map */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200"
          >
            <CourierTrackingMap
              customerLocation={{
                lat: delivery.address.coordinates?.lat || 43.238293,
                lng: delivery.address.coordinates?.lng || 76.889709,
              }}
              customerAddress={`${delivery.address.street}${delivery.address.apartment ? ', кв. ' + delivery.address.apartment : ''}`}
              courierInfo={courierInfo}
              courierLocation={courierLocation || undefined}
              eta={eta}
              onCallCourier={() => window.open(`tel:${delivery.customerPhone}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CourierDashboard;
