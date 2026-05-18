import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPinIcon, ClockIcon, PhoneIcon, XMarkIcon, ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { MapPinIcon as MapPinSolid } from '@heroicons/react/24/solid';
import { useLocation, CafeLocation } from '../../contexts/LocationContext';

interface LocationSelectorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ variant = 'compact', className = '' }) => {
  const { locations, selectedLocation, selectLocation, isLoading, error, refreshLocations } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (location: CafeLocation) => {
    selectLocation(location);
    setIsOpen(false);
  };

  // Получаем короткое отображаемое имя для кнопки
  const getDisplayInfo = (location: CafeLocation | null) => {
    if (!location) return { name: 'Выберите кофейню', distance: null };
    
    const name = location.name || '';
    // Если name выглядит как телефон - пробуем извлечь короткое название
    if (/^\+?\d[\d\s-]{8,}$/.test(name.trim())) {
      if (location.address) {
        const parts = location.address.split(',');
        return { 
          name: parts[0]?.trim() || 'Кофейня',
          distance: location.distance 
        };
      }
      return { name: 'Кофейня', distance: location.distance };
    }
    return { name: name || 'Кофейня', distance: location.distance };
  };

  const displayInfo = getDisplayInfo(selectedLocation);

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100 
                     active:scale-[0.98] active:bg-gray-50 transition-all touch-manipulation select-none w-full ${className}`}
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <MapPinSolid className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-gray-900 truncate text-sm">
              {displayInfo.name}
            </p>
            {displayInfo.distance !== undefined && displayInfo.distance !== null && (
              <p className="text-xs text-gray-500">{displayInfo.distance} км от вас</p>
            )}
          </div>
          <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        <LocationModal 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
          locations={locations}
          selectedLocation={selectedLocation}
          onSelect={handleSelect}
          isLoading={isLoading}
          error={error}
          onRetry={refreshLocations}
        />
      </>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
        <MapPinSolid className="w-6 h-6 text-amber-500" />
        Выберите кофейню
      </h2>
      
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={refreshLocations}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl active:bg-amber-600 transition-colors touch-manipulation"
          >
            Попробовать снова
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isSelected={selectedLocation?.id === location.id}
              onSelect={() => handleSelect(location)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface LocationCardProps {
  location: CafeLocation;
  isSelected: boolean;
  onSelect: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden
                  touch-manipulation select-none active:scale-[0.98]
                  ${isSelected 
                    ? 'border-amber-500 bg-amber-50 shadow-md' 
                    : 'border-gray-100 bg-white active:bg-gray-50'}`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircleIcon className="w-6 h-6 text-amber-500" />
        </div>
      )}

      <div className="flex gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-amber-500' : 'bg-gray-100'}`}>
          {location.image ? (
            <img 
              src={location.image} 
              alt={location.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <MapPinIcon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-gray-800 truncate text-base">{location.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">{location.address}</p>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            {location.distance !== undefined && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5" />
                {location.distance} км
              </span>
            )}
            {location.workingHours && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {location.workingHours}
              </span>
            )}
            {location.phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="w-3.5 h-3.5" />
                {location.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: CafeLocation[];
  selectedLocation: CafeLocation | null;
  onSelect: (location: CafeLocation) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  locations,
  selectedLocation,
  onSelect,
  isLoading,
  error,
  onRetry
}) => {
  // Находим ближайшую точку (первая в отсортированном списке с distance)
  const nearestLocation = locations.find(loc => loc.distance !== undefined);
  
  // Центр карты - выбранная или ближайшая или первая с координатами или Астана по умолчанию
  const getMapCenter = () => {
    if (selectedLocation?.coordinates) return selectedLocation.coordinates;
    if (nearestLocation?.coordinates) return nearestLocation.coordinates;
    const withCoords = locations.find(l => l.coordinates?.lat && l.coordinates?.lng);
    if (withCoords?.coordinates) return withCoords.coordinates;
    return { lat: 51.1694, lng: 71.4491 }; // Астана
  };
  
  const mapCenter = getMapCenter();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
          />

          {/* Bottom Sheet - ровно 50% экрана */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-[9999] shadow-2xl flex flex-col md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[440px]"
            style={{ height: '50vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
              <span className="text-base font-semibold text-gray-900">Выберите кофейню</span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center touch-manipulation active:bg-gray-200"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 2GIS Map - интерактивная */}
            <div className="flex-shrink-0 h-[140px] relative">
              <YandexMap
                locations={locations}
                selectedLocation={selectedLocation}
                center={mapCenter}
                onSelect={onSelect}
              />
            </div>

            {/* Locations list - скроллится */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-16" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm mb-3">{error}</p>
                  <button 
                    onClick={onRetry}
                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm active:bg-amber-600 touch-manipulation"
                  >
                    Повторить
                  </button>
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">Кофейни не найдены</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {locations.map((location, index) => {
                    const isNearest = index === 0 && location.distance !== undefined;
                    const isSelected = selectedLocation?.id === location.id;
                    
                    return (
                      <button
                        key={location.id}
                        onClick={() => onSelect(location)}
                        className={`w-full p-3 rounded-xl text-left transition-all touch-manipulation active:scale-[0.98]
                          ${isSelected 
                            ? 'bg-amber-50 border-2 border-amber-500 shadow-sm' 
                            : isNearest 
                              ? 'bg-green-50 border-2 border-green-400'
                              : 'bg-gray-50 border-2 border-transparent active:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-amber-500' : isNearest ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <MapPinSolid className="w-5 h-5 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold text-sm truncate ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
                                {location.name}
                              </p>
                              {isNearest && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded">
                                  БЛИЖАЙШАЯ
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{location.address}</p>
                            
                            <div className="flex items-center gap-3 mt-1">
                              {location.distance !== undefined && (
                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  {location.distance} км
                                </span>
                              )}
                              {location.workingHours && (
                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {location.workingHours}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isSelected && (
                            <CheckCircleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Lazy-load 2GIS Maps SDK (loaded async in index.html, or on-demand on Capacitor native)
let dgLoadPromise: Promise<void> | null = null;
function ensureDGLoaded(): Promise<void> {
  if (typeof DG !== 'undefined') return Promise.resolve();
  if (dgLoadPromise) return dgLoadPromise;
  dgLoadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full&skin=dark';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load 2GIS Maps API'));
    document.head.appendChild(s);
  });
  return dgLoadPromise;
}

// 2GIS Map компонент - интерактивная карта
interface DGMapProps {
  locations: CafeLocation[];
  selectedLocation: CafeLocation | null;
  center: { lat: number; lng: number };
  onSelect: (location: CafeLocation) => void;
}

const YandexMap: React.FC<DGMapProps> = ({ locations, selectedLocation, center, onSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<DG.Map | null>(null);
  const markersRef = useRef<DG.Marker[]>([]);
  const [dgReady, setDgReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;
    
    ensureDGLoaded().then(() => {
      if (cancelled || !mapRef.current) return;
      DG.then(() => {
        if (cancelled || !mapRef.current) return;
        const map = DG.map(mapRef.current, {
          center: [center.lat, center.lng],
          zoom: 13,
          fullscreenControl: false,
          zoomControl: true,
        });
        mapInstanceRef.current = map;
        setDgReady(true);
      });
    }).catch(() => { /* 2GIS load failed — map stays empty */ });
    
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Обновляем маркеры при изменении локаций
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Удаляем предыдущие маркеры
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds: [number, number][] = [];

    locations.forEach((location, index) => {
      if (!location.coordinates?.lat || !location.coordinates?.lng) return;

      const isSelected = selectedLocation?.id === location.id;
      const isNearest = index === 0 && location.distance !== undefined;

      const color = isSelected ? '#f59e0b' : isNearest ? '#22c55e' : '#6b7280';

      const svgIcon = `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="14" r="6" fill="white"/>
      </svg>`;

      const icon = DG.divIcon({
        html: svgIcon,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      });

      const popupContent = `
        <div style="font-family:system-ui;min-width:150px;padding:4px">
          <strong style="font-size:14px;color:#1f2937">${location.name}</strong>
          <p style="margin:4px 0;font-size:12px;color:#6b7280">${location.address}</p>
          ${location.distance !== undefined ? `<p style="margin:2px 0;font-size:11px;color:#9ca3af">📍 ${location.distance} км от вас</p>` : ''}
          ${location.workingHours ? `<p style="margin:2px 0;font-size:11px;color:#9ca3af">⏰ ${location.workingHours}</p>` : ''}
        </div>
      `;

      const marker = DG.marker([location.coordinates.lat, location.coordinates.lng], {
        icon,
        zIndexOffset: isSelected ? 2000 : isNearest ? 1000 : 0,
      }).addTo(map);

      marker.bindPopup(popupContent, { maxWidth: 250 });

      marker.on('click', () => {
        onSelectRef.current(location);
      });

      markersRef.current.push(marker);
      bounds.push([location.coordinates.lat, location.coordinates.lng]);
    });

    // Подгоняем зум
    if (bounds.length > 1) {
      const latLngBounds = DG.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [30, 30], maxZoom: 16 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  }, [locations, selectedLocation, dgReady]);
  
  // Центрируем карту на выбранной локации
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !center) return;
    map.setView([center.lat, center.lng]);
  }, [center]);
  
  return (
    <div ref={mapRef} className="w-full h-full z-0" />
  );
};

export default LocationSelector;
