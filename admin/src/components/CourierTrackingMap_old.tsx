import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPinIcon, 
  TruckIcon,
  ClockIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface Location {
  lat: number;
  lng: number;
}

interface CourierInfo {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  currentLocation?: Location;
  vehicle?: {
    type: 'car' | 'bike' | 'scooter';
    plate?: string;
  };
}

interface CourierTrackingMapProps {
  customerLocation: Location;
  customerAddress: string;
  courierInfo?: CourierInfo;
  eta?: {
    remainingTime: number; // секунды
    remainingDistance: number; // метры
  };
  onCallCourier?: () => void;
}

/**
 * Компонент карты с отслеживанием курьера в реальном времени
 * 
 * Функционал:
 * - Отображение позиции курьера и клиента на карте
 * - Маршрут между точками
 * - ETA (расчётное время прибытия)
 * - Расстояние до клиента
 * - Информация о курьере
 * - Кнопка звонка курьеру
 */
export const CourierTrackingMap: React.FC<CourierTrackingMapProps> = ({
  customerLocation,
  customerAddress,
  courierInfo,
  eta,
  onCallCourier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map] = useState<unknown>(null);
  const [courierMarker] = useState<unknown>(null);
  const [customerMarker] = useState<unknown>(null);
  const [routeLine] = useState<unknown>(null);
  
  // Инициализация карты (2GIS)
  useEffect(() => {
    if (!mapContainerRef.current || map) return;
    
    // TODO: Интеграция с 2GIS Map API
    // const initMap = async () => {
    //   const DG = await window.DG;
    //   const mapInstance = DG.map(mapContainerRef.current, {
    //     center: [customerLocation.lat, customerLocation.lng],
    //     zoom: 14,
    //   });
    //   setMap(mapInstance);
    // };
    // initMap();
    
    console.log('Map initialization placeholder');
    // Suppress warning about map dependency
    void map;
  }, [map]);
  
  // Обновление позиции курьера
  useEffect(() => {
    if (!map || !courierInfo?.currentLocation) return;
    
    // TODO: Обновить маркер курьера на карте
    // if (courierMarker) {
    //   courierMarker.setLatLng([
    //     courierInfo.currentLocation.lat,
    //     courierInfo.currentLocation.lng,
    //   ]);
    // } else {
    //   const marker = DG.marker([
    //     courierInfo.currentLocation.lat,
    //     courierInfo.currentLocation.lng,
    //   ], {
    //     icon: courierIcon,
    //   }).addTo(map);
    //   setCourierMarker(marker);
    // }
    
    console.log('Courier position updated:', courierInfo.currentLocation);
  }, [courierInfo?.currentLocation, map]);
  
  // Построение маршрута
  useEffect(() => {
    if (!map || !courierInfo?.currentLocation) return;
    
    // TODO: Построить маршрут от курьера до клиента
    // DG.route([
    //   [courierInfo.currentLocation.lat, courierInfo.currentLocation.lng],
    //   [customerLocation.lat, customerLocation.lng],
    // ]).addTo(map);
    
    console.log('Route calculated');
  }, [courierInfo?.currentLocation, customerLocation, map]);
  
  /**
   * Форматировать время до прибытия
   */
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `< 1 мин`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч ${mins} мин`;
  };
  
  /**
   * Форматировать расстояние
   */
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} м`;
    return `${(meters / 1000).toFixed(1)} км`;
  };
  
  /**
   * Иконка транспорта
   */
  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case 'car': return '🚗';
      case 'bike': return '🚴';
      case 'scooter': return '🛵';
      default: return '🚚';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Карта */}
      <div className="relative">
        <div 
          ref={mapContainerRef}
          className="w-full h-[400px] bg-gray-100 relative"
        >
          {/* Placeholder пока карта не загружена */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MapPinIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Карта загружается...</p>
              <p className="text-xs mt-1">2GIS Map API</p>
            </div>
          </div>
          
          {/* Кнопка центрирования на курьера */}
          {courierInfo?.currentLocation && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => {
                // TODO: Центрировать карту на позиции курьера
                console.log('Center on courier');
              }}
            >
              <TruckIcon className="w-5 h-5 text-blue-600" />
            </motion.button>
          )}
        </div>
        
        {/* ETA оверлей */}
        <AnimatePresence>
          {eta && courierInfo?.currentLocation && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg px-4 py-3"
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
      
      {/* Информация о курьере */}
      {courierInfo && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Фото курьера */}
            <div className="flex-shrink-0">
              {courierInfo.photo ? (
                <img
                  src={courierInfo.photo}
                  alt={courierInfo.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                  {courierInfo.name.charAt(0)}
                </div>
              )}
              
              {/* Индикатор онлайн */}
              <div className="relative -mt-3 ml-12">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                />
              </div>
            </div>
            
            {/* Информация */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{courierInfo.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{getVehicleIcon(courierInfo.vehicle?.type)}</span>
                {courierInfo.vehicle?.plate && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {courierInfo.vehicle.plate}
                  </span>
                )}
              </div>
            </div>
            
            {/* Кнопка звонка */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCallCourier}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <PhoneIcon className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      )}
      
      {/* Адрес доставки */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MapPinIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 mb-1">Адрес доставки</p>
            <p className="text-sm font-medium text-gray-900">{customerAddress}</p>
          </div>
        </div>
      </div>
      
      {/* Статус курьера */}
      {!courierInfo?.currentLocation && (
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
