import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPinIcon, 
  TruckIcon,
  ClockIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { 
  loadYandexMapsAPI, 
  MAPS_CONFIG, 
  formatETA, 
  formatDistance,
  toYandexCoordinate 
} from '@/config/yandex-maps';
import type { YMapsMap, YMapsPlacemark, YMapsPolyline } from '@/types/yandex-maps';

interface Location {
  lat: number;
  lng: number;
}

interface CourierInfo {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  isOnline?: boolean;
}

interface CourierTrackingMapProps {
  customerLocation: Location;
  customerAddress: string;
  courierInfo?: CourierInfo;
  courierLocation?: Location; // Real-time courier position
  eta?: {
    remainingTime: number; // seconds
    remainingDistance: number; // meters
  };
  onCallCourier?: () => void;
}

/**
 * Real-time Courier Tracking Map Component with Yandex Maps
 * 
 * Features:
 * - Yandex Maps integration (best for Russia/Kazakhstan)
 * - Live courier position updates
 * - Route visualization
 * - ETA display
 * - Distance calculation
 * - Courier info card
 * - No API key required for basic usage!
 */
export const CourierTrackingMap: React.FC<CourierTrackingMapProps> = ({
  customerLocation,
  customerAddress,
  courierInfo,
  courierLocation,
  eta,
  onCallCourier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<YMapsMap | null>(null);
  const courierMarkerRef = useRef<YMapsPlacemark | null>(null);
  const customerMarkerRef = useRef<YMapsPlacemark | null>(null);
  const routeLineRef = useRef<YMapsPolyline | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Initialize Yandex Map
  useEffect(() => {
    if (!mapContainerRef.current || map) return;
    
    const initMap = async () => {
      try {
        // Load Yandex Maps API
        await loadYandexMapsAPI();
        
        if (!window.ymaps) {
          throw new Error('Yandex Maps API not available');
        }
        
        // Create map instance
        const mapInstance = new window.ymaps.Map(mapContainerRef.current!, {
          center: toYandexCoordinate(customerLocation.lat, customerLocation.lng),
          zoom: MAPS_CONFIG.defaultZoom,
          controls: ['zoomControl', 'geolocationControl'],
        });
        
        setMap(mapInstance);
        setMapLoaded(true);
        
        // Add customer marker
        const custMarker = new window.ymaps.Placemark(
          toYandexCoordinate(customerLocation.lat, customerLocation.lng),
          {
            balloonContent: `<strong>📍 Клиент</strong><br/>${customerAddress}`,
            hintContent: 'Адрес доставки',
          },
          MAPS_CONFIG.customerMarker
        );
        
        mapInstance.geoObjects.add(custMarker);
        customerMarkerRef.current = custMarker;
        
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError(error instanceof Error ? error.message : 'Ошибка загрузки карты');
      }
    };
    
    initMap();
    
    // Cleanup on unmount
    return () => {
      if (map) {
        try {
          (map as YMapsMap).destroy();
        } catch (e) {
          console.warn('Map cleanup error:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once - initialized with customerLocation
  
  // Update courier marker position
  useEffect(() => {
    if (!map || !window.ymaps || !courierLocation) return;
    
    try {
      const coords = toYandexCoordinate(courierLocation.lat, courierLocation.lng);
      
      if (courierMarkerRef.current) {
        // Update existing marker position
        courierMarkerRef.current.geometry.setCoordinates(coords);
      } else {
        // Create new courier marker
        const marker = new window.ymaps.Placemark(
          coords,
          {
            balloonContent: `<strong>🚚 ${courierInfo?.name || 'Курьер'}</strong><br/>${courierInfo?.vehicleType || 'В пути'}`,
            hintContent: courierInfo?.name || 'Курьер',
          },
          MAPS_CONFIG.courierMarker
        );
        
        map.geoObjects.add(marker);
        courierMarkerRef.current = marker;
      }
    } catch (error) {
      console.error('Failed to update courier marker:', error);
    }
  }, [courierLocation, map, courierInfo?.name, courierInfo?.vehicleType]);
  
  // Draw route between courier and customer
  useEffect(() => {
    if (!map || !window.ymaps || !courierLocation) return;
    
    try {
      // Remove old route
      if (routeLineRef.current) {
        map.geoObjects.remove(routeLineRef.current);
      }
      
      // Draw new route
      const route = new window.ymaps.Polyline(
        [
          toYandexCoordinate(courierLocation.lat, courierLocation.lng),
          toYandexCoordinate(customerLocation.lat, customerLocation.lng),
        ],
        {},
        MAPS_CONFIG.route
      );
      
      map.geoObjects.add(route);
      routeLineRef.current = route;
      
      // Fit map bounds to show both markers
      const bounds: [[number, number], [number, number]] = [
        toYandexCoordinate(
          Math.min(courierLocation.lat, customerLocation.lat),
          Math.min(courierLocation.lng, customerLocation.lng)
        ),
        toYandexCoordinate(
          Math.max(courierLocation.lat, customerLocation.lat),
          Math.max(courierLocation.lng, customerLocation.lng)
        ),
      ];
      
      map.setBounds(bounds, { checkZoomRange: true });
      
    } catch (error) {
      console.error('Failed to draw route:', error);
    }
  }, [courierLocation, customerLocation, map]);
  
  /**
   * Center map on courier
   */
  const centerOnCourier = () => {
    if (map && courierLocation) {
      map.setCenter(
        toYandexCoordinate(courierLocation.lat, courierLocation.lng),
        15
      );
    }
  };
  
  /**
   * Get vehicle icon
   */
  const getVehicleIcon = (type?: string) => {
    if (!type) return '🚚';
    const typeStr = type.toLowerCase();
    if (typeStr.includes('автомобиль') || typeStr.includes('car')) return '🚗';
    if (typeStr.includes('велосипед') || typeStr.includes('bike')) return '🚴';
    if (typeStr.includes('мотоцикл') || typeStr.includes('scooter')) return '🛵';
    return '🚚';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapContainerRef}
          className="w-full h-[400px] bg-gray-100 relative"
        >
          {/* Loading Placeholder */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50 z-10">
              <div className="text-center">
                <MapPinIcon className="w-16 h-16 mx-auto mb-2 opacity-20 animate-pulse" />
                <p className="text-sm font-medium">Загрузка карты...</p>
                <p className="text-xs mt-1 text-gray-500">Яндекс.Карты</p>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-red-50 z-10">
              <div className="text-center px-4">
                <MapPinIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Ошибка загрузки карты</p>
                <p className="text-xs mt-1">{mapError}</p>
              </div>
            </div>
          )}
          
          {/* Center on Courier Button */}
          {mapLoaded && courierLocation && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow z-20"
              onClick={centerOnCourier}
              title="Центрировать на курьера"
            >
              <TruckIcon className="w-5 h-5 text-blue-600" />
            </motion.button>
          )}
        </div>
        
        {/* ETA Overlay */}
        <AnimatePresence>
          {eta && courierLocation && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg px-4 py-3 z-20"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5" />
                  <div>
                    <p className="text-xs opacity-80">Прибытие через</p>
                    <p className="text-lg font-bold">{formatETA(eta.remainingTime)}</p>
                  </div>
                </div>
                
                <div className="h-8 w-px bg-white/30" />
                
                <div>
                  <p className="text-xs opacity-80">Расстояние</p>
                  <p className="text-sm font-semibold">{formatDistance(eta.remainingDistance)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Courier Info Card */}
      {courierInfo && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Courier Photo */}
            <div className="flex-shrink-0 relative">
              {courierInfo.photo ? (
                <img
                  src={courierInfo.photo}
                  alt={courierInfo.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                  {courierInfo.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Online Indicator */}
              {courierInfo.isOnline && (
                <div className="absolute -bottom-1 -right-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  />
                </div>
              )}
            </div>
            
            {/* Courier Details */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{courierInfo.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{getVehicleIcon(courierInfo.vehicleType)}</span>
                <span className="text-sm text-gray-600">{courierInfo.vehicleType}</span>
                {courierInfo.vehiclePlate && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {courierInfo.vehiclePlate}
                  </span>
                )}
              </div>
            </div>
            
            {/* Call Button */}
            {onCallCourier && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCallCourier}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-colors"
                title={`Позвонить ${courierInfo.name}`}
              >
                <PhoneIcon className="w-6 h-6" />
              </motion.button>
            )}
          </div>
        </div>
      )}
      
      {/* Delivery Address */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MapPinIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 mb-1">Адрес доставки</p>
            <p className="text-sm font-medium text-gray-900">{customerAddress}</p>
          </div>
        </div>
      </div>
      
      {/* Waiting for Location */}
      {!courierLocation && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <p className="text-sm text-yellow-800">
              Ожидаем обновления позиции курьера...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
