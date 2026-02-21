import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { MapPinIcon, ClockIcon, PhoneIcon, ArrowLeftIcon, MapIcon, ListBulletIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { MapPinIcon as MapPinSolidIcon, CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { RoyalLayout } from '../components/RoyalLayout';
import { useLocation as useLocationContext } from '../contexts/LocationContext';

interface Location {
  id: string;
  name: string;
  address: string;
  phone?: string;
  workingHours?: string;
  isOpen?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
}

// ─── Haversine distance (km) ───
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Location card (list view) ───
const LocationCard: React.FC<{
  location: Location;
  index: number;
  isNearest: boolean;
  isSelected: boolean;
  distanceKm: number | null;
  onSelect: () => void;
  onChoose: () => void;
}> = ({ location, index, isNearest, isSelected, distanceKm, onSelect, onChoose }) => {
  const openInMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (location.coordinates) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`,
        '_blank',
      );
    } else if (location.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`,
        '_blank',
      );
    }
  };

  const callPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (location.phone) window.location.href = `tel:${location.phone}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      className={`relative rounded-2xl border overflow-hidden transition-all cursor-pointer active:scale-[0.98] ${
        isSelected
          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/20 ring-1 ring-[#D4AF37]/30'
          : isNearest
            ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/10'
            : 'bg-white/8 border-white/15 hover:bg-white/12'
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
          <CheckCircleSolidIcon className="w-3.5 h-3.5" />
          Выбрана
        </div>
      )}
      {!isSelected && isNearest && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
          Ближайшая
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <MapPinSolidIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-[15px] leading-tight">{location.name}</h3>
            <p className="text-white/60 text-sm mt-1 leading-snug">{location.address}</p>
            
            <div className="flex items-center gap-3 mt-2">
              {location.workingHours && (
                <div className="flex items-center gap-1 text-white/50">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="text-xs">{location.workingHours}</span>
                </div>
              )}
              {distanceKm !== null && (
                <span className="text-xs text-[#D4AF37]/80 font-medium">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} м` : `${distanceKm.toFixed(1)} км`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 ml-[52px]">
          <button
            onClick={(e) => { e.stopPropagation(); onChoose(); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              isSelected
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                : 'bg-white/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/50'
            }`}
          >
            {isSelected ? (
              <>
                <CheckCircleSolidIcon className="w-4 h-4" />
                Выбрана
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Выбрать
              </>
            )}
          </button>
          <button
            onClick={openInMaps}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-xl transition-colors border border-white/15"
          >
            <MapPinSolidIcon className="w-4 h-4" />
            Маршрут
          </button>
          {location.phone && (
            <button
              onClick={callPhone}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-xl transition-colors border border-white/15"
            >
              <PhoneIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Geocode address via Nominatim (fallback when Firestore has no coordinates) ───
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const searchQuery = `${address}, Астана, Казахстан`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'SunfoodApp/1.0' } });
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore geocoding errors
  }
  return null;
}

// ─── Map component (Yandex Maps) ───
const LocationsMap: React.FC<{
  locations: Location[];
  userPos: { lat: number; lng: number } | null;
  nearestId: string | null;
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onChooseLocation: (loc: Location) => void;
}> = ({ locations, userPos, nearestId, selectedId, onSelectLocation, onChooseLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ymaps.Map | null>(null);
  const objectsRef = useRef<ymaps.GeoObjectCollection | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Сохраняем актуальные коллбэки в ref чтобы не пересоздавать карту
  const onSelectRef = useRef(onSelectLocation);
  const onChooseRef = useRef(onChooseLocation);
  const locationsRef = useRef(locations);
  useEffect(() => { onSelectRef.current = onSelectLocation; }, [onSelectLocation]);
  useEffect(() => { onChooseRef.current = onChooseLocation; }, [onChooseLocation]);
  useEffect(() => { locationsRef.current = locations; }, [locations]);

  // Глобальный хэндлер для кнопки «Выбрать точку» в балуне
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chooseLocation__ = (locId: string) => {
      const loc = locationsRef.current.find(l => l.id === locId);
      if (loc) onChooseRef.current(loc);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__chooseLocation__;
    };
  }, []);

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current) return;
      const map = new ymaps.Map(mapRef.current, {
        center: [51.1694, 71.4491], // Astana default
        zoom: 12,
        controls: ['zoomControl'],
      }, {
        suppressMapOpenBlock: true,
      });
      mapInstanceRef.current = map;
      objectsRef.current = map.geoObjects;
      setMapReady(true);
    };

    if (window.ymaps) {
      ymaps.ready(initMap);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Обновление маркеров
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const updateMarkers = () => {
      map.geoObjects.removeAll();

      const points: number[][] = [];

      locations.forEach((loc) => {
        if (!loc.coordinates) return;
        const { lat, lng } = loc.coordinates;
        const isSelected = loc.id === selectedId;
        const isNearest = loc.id === nearestId;

        // Цвета и размеры для трёх состояний
        const pinColor = isSelected ? '#22C55E' : isNearest ? '#D4AF37' : '#ffffff';
        const pinStroke = isSelected ? '#15803D' : isNearest ? '#8B6914' : '#666666';
        const pinSize = isSelected ? 44 : isNearest ? 40 : 32;
        const emoji = isSelected ? '✓' : '☕';

        // SVG-контент для иконки
        const svgHtml = `<svg width="${pinSize}" height="${pinSize}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          ${isSelected ? '<circle cx="20" cy="16" r="18" fill="none" stroke="#22C55E" stroke-width="2" opacity="0.3"><animate attributeName="r" from="18" to="24" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/></circle>' : ''}
          <path d="M20 38C20 38 34 26 34 16C34 8.268 27.732 2 20 2C12.268 2 6 8.268 6 16C6 26 20 38 20 38Z" fill="${pinColor}" stroke="${pinStroke}" stroke-width="2"/>
          <circle cx="20" cy="16" r="7" fill="${pinStroke}"/>
          <text x="20" y="${isSelected ? 20 : 19}" text-anchor="middle" font-size="${isSelected ? 14 : 10}" fill="${pinColor}" font-weight="bold">${emoji}</text>
        </svg>`;

        // Статус для балуна
        const statusLine = isSelected
          ? '<br/><span style="color:#22C55E;font-size:11px;font-weight:700">✅ Выбранная точка</span>'
          : isNearest
            ? '<br/><span style="color:#D4AF37;font-size:11px;font-weight:600">⭐ Ближайшая к вам</span>'
            : '';

        const balloonContent = `<div style="font-family:system-ui;min-width:180px;padding:4px">
          <b style="font-size:14px">${loc.name}</b><br/>
          <span style="color:#666;font-size:12px">${loc.address}</span>
          ${loc.workingHours ? `<br/><span style="color:#999;font-size:11px">🕐 ${loc.workingHours}</span>` : ''}
          ${statusLine}
          ${!isSelected ? `<br/><button onclick="window.__chooseLocation__('${loc.id}')" style="margin-top:6px;padding:6px 14px;background:#D4AF37;color:black;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%">Выбрать точку</button>` : ''}
        </div>`;

        const placemark = new ymaps.Placemark(
          [lat, lng],
          {
            balloonContentBody: balloonContent,
            hintContent: loc.name,
          },
          {
            iconLayout: 'default#imageWithContent',
            iconImageHref: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgHtml),
            iconImageSize: [pinSize, pinSize],
            iconImageOffset: [-pinSize / 2, -pinSize],
            iconContentOffset: [0, 0],
            zIndex: isSelected ? 2000 : isNearest ? 1000 : 0,
            balloonPanelMaxMapArea: 0,
          },
        );

        placemark.events.add('click', () => {
          onSelectRef.current(loc.id);
        });

        map.geoObjects.add(placemark);
        points.push([lat, lng]);
      });

      // Маркер позиции юзера — пульсирующая синяя точка
      if (userPos) {
        const userSvg = `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;width:40px;height:40px;background:rgba(74,144,255,0.15);border-radius:50%;animation:ymPulse 2s ease-out infinite"></div>
          <div style="position:absolute;width:24px;height:24px;background:rgba(74,144,255,0.25);border-radius:50%;animation:ymPulse 2s ease-out 0.5s infinite"></div>
          <div style="width:14px;height:14px;background:#4A90FF;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(74,144,255,0.7);position:relative;z-index:2"></div>
        </div>`;

        const userPlacemark = new ymaps.Placemark(
          [userPos.lat, userPos.lng],
          { hintContent: 'Вы здесь' },
          {
            iconLayout: 'default#imageWithContent',
            iconImageHref: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            iconImageSize: [40, 40],
            iconImageOffset: [-20, -20],
            iconContentLayout: ymaps.templateLayoutFactory.createClass(userSvg),
            zIndex: 3000,
          },
        );
        map.geoObjects.add(userPlacemark);
        points.push([userPos.lat, userPos.lng]);
      }

      // Подгоняем зум чтобы все маркеры были видны
      if (points.length > 1) {
        map.setBounds(ymaps.util.bounds.fromPoints(points), {
          checkZoomRange: true,
          zoomMargin: 60,
        });
      } else if (points.length === 1) {
        map.setCenter(points[0], 15);
      }
    };

    if (window.ymaps) {
      ymaps.ready(updateMarkers);
    }
  }, [locations, userPos, nearestId, selectedId, mapReady]);

  // Inject pulse animation CSS
  useEffect(() => {
    if (document.getElementById('ym-pulse-css')) return;
    const style = document.createElement('style');
    style.id = 'ym-pulse-css';
    style.textContent = `
      @keyframes ymPulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
      /* Тёмная тема для балунов Яндекс.Карт */
      .ymaps-2-1-79-balloon__content,
      [class*="ymaps"][class*="balloon__content"] {
        background: rgba(0,0,0,0.9) !important;
        color: white !important;
      }
      .ymaps-2-1-79-balloon,
      [class*="ymaps"][class*="balloon"] {
        background: transparent !important;
      }
      .ymaps-2-1-79-balloon__close-button,
      [class*="ymaps"][class*="balloon__close"] {
        color: white !important;
        filter: invert(1);
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-b-2xl"
      style={{ minHeight: 300 }}
    />
  );
};

// ─── Main page ───
const LocationsPage: React.FC = () => {
  const history = useHistory();
  const { selectedLocation, selectLocation } = useLocationContext();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [justSelected, setJustSelected] = useState<string | null>(null);

  // Load locations from Firestore + geocode missing coordinates
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => (l as Record<string, unknown>).isActive !== false) as Location[];

        // Геокодируем адреса для тех, у кого нет координат
        const enriched = await Promise.all(
          list.map(async (loc) => {
            if (loc.coordinates?.lat && loc.coordinates?.lng) return loc;
            if (!loc.address) return loc;
            const coords = await geocodeAddress(loc.address);
            if (coords) return { ...loc, coordinates: coords };
            return loc;
          }),
        );

        setLocations(enriched.length > 0 ? enriched : []);
      } catch (err) {
        console.error('Error loading locations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get user position
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* permission denied – no problem */ },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Find nearest
  const nearestId = useMemo(() => {
    if (!userPos) return null;
    let minDist = Infinity;
    let nearest: string | null = null;
    for (const loc of locations) {
      if (!loc.coordinates) continue;
      const d = haversine(userPos.lat, userPos.lng, loc.coordinates.lat, loc.coordinates.lng);
      if (d < minDist) {
        minDist = d;
        nearest = loc.id;
      }
    }
    return nearest;
  }, [userPos, locations]);

  // Distances map
  const distances = useMemo(() => {
    if (!userPos) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const loc of locations) {
      if (!loc.coordinates) continue;
      m.set(loc.id, haversine(userPos.lat, userPos.lng, loc.coordinates.lat, loc.coordinates.lng));
    }
    return m;
  }, [userPos, locations]);

  // Sort locations: nearest first
  const sortedLocations = useMemo(() => {
    if (!userPos) return locations;
    return [...locations].sort((a, b) => {
      const da = distances.get(a.id) ?? Infinity;
      const db2 = distances.get(b.id) ?? Infinity;
      return da - db2;
    });
  }, [locations, distances, userPos]);

  const handleSelectLocation = useCallback((id: string) => {
    setView('list');
    // Scroll to card
    setTimeout(() => {
      document.getElementById(`loc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }, []);

  const handleChooseLocation = useCallback((location: Location) => {
    selectLocation({
      id: location.id,
      name: location.name,
      address: location.address,
      isActive: true,
      coordinates: location.coordinates,
      phone: location.phone,
    });
    setJustSelected(location.id);
    // Убираем анимацию через 2 секунды
    setTimeout(() => setJustSelected(null), 2000);
  }, [selectLocation]);

  return (
    <RoyalLayout>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => history.goBack()}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <MapPinSolidIcon className="w-5 h-5 text-[#D4AF37]" />
              <h1 className="text-lg font-bold text-white">Кофейни</h1>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex bg-white/10 rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'map'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Карта
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'list'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
              Список
            </button>
          </div>
        </div>
      </div>

      {/* Selected location indicator */}
      {selectedLocation && (
        <div className="px-4 py-2 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-2">
            <CheckCircleSolidIcon className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
            <span className="text-white/70 text-xs">Выбрана:</span>
            <span className="text-white text-xs font-semibold truncate">{selectedLocation.name}</span>
          </div>
        </div>
      )}

      {/* Toast при выборе */}
      <AnimatePresence>
        {justSelected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-50 flex items-center gap-3 p-3 bg-[#D4AF37] text-black rounded-2xl shadow-xl shadow-[#D4AF37]/30"
          >
            <CheckCircleSolidIcon className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Точка выбрана!</p>
              <p className="text-xs opacity-80">Заказы будут привязаны к этой кофейне</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/8 rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-white/15 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
              style={{ height: 'calc(100vh - 56px - 80px)' }}
            >
              <LocationsMap
                locations={locations}
                userPos={userPos}
                nearestId={nearestId}
                selectedId={selectedLocation?.id || null}
                onSelectLocation={handleSelectLocation}
                onChooseLocation={handleChooseLocation}
              />

              {/* Bottom overlay card: selected > nearest */}
              {(() => {
                // Приоритет: выбранная точка, затем ближайшая
                const overlayId = selectedLocation?.id || nearestId;
                if (!overlayId) return null;
                const loc = locations.find((l) => l.id === overlayId);
                if (!loc) return null;
                const dist = distances.get(overlayId);
                const isThisSelected = selectedLocation?.id === overlayId;
                const isThisNearest = overlayId === nearestId;

                return (
                  <div className="absolute bottom-24 left-4 right-4 z-20">
                    <motion.div
                      key={overlayId}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className={`bg-black/80 backdrop-blur-xl rounded-2xl p-4 ${
                        isThisSelected
                          ? 'border border-green-500/40 shadow-lg shadow-green-500/10'
                          : 'border border-[#D4AF37]/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        {isThisSelected ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1">
                            <CheckCircleSolidIcon className="w-3 h-3" /> Выбранная точка
                          </span>
                        ) : isThisNearest ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Ближайшая к вам</span>
                        ) : null}
                        {dist !== undefined && (
                          <span className="text-[10px] text-white/40 ml-auto">
                            {dist < 1 ? `${Math.round(dist * 1000)} м` : `${dist.toFixed(1)} км`}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white">{loc.name}</h3>
                      <p className="text-white/60 text-sm">{loc.address}</p>
                      {loc.workingHours && (
                        <p className="text-white/40 text-xs mt-1">🕐 {loc.workingHours}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleChooseLocation(loc)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-medium text-sm rounded-xl transition-all ${
                            isThisSelected
                              ? 'bg-green-500 text-white'
                              : 'bg-[#D4AF37] text-black'
                          }`}
                        >
                          {isThisSelected ? (
                            <><CheckCircleSolidIcon className="w-4 h-4" /> Выбрана</>
                          ) : (
                            <><CheckCircleIcon className="w-4 h-4" /> Выбрать</>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (loc.coordinates) {
                              window.open(
                                `https://www.google.com/maps/search/?api=1&query=${loc.coordinates.lat},${loc.coordinates.lng}`,
                                '_blank',
                              );
                            }
                          }}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 text-white text-sm rounded-xl border border-white/15"
                        >
                          <MapPinSolidIcon className="w-4 h-4" />
                          Маршрут
                        </button>
                      </div>
                    </motion.div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-4 pb-28 space-y-3"
            >
              {sortedLocations.map((location, index) => (
                <div key={location.id} id={`loc-${location.id}`}>
                  <LocationCard
                    location={location}
                    index={index}
                    isNearest={location.id === nearestId}
                    isSelected={selectedLocation?.id === location.id}
                    distanceKm={distances.get(location.id) ?? null}
                    onSelect={() => handleSelectLocation(location.id)}
                    onChoose={() => handleChooseLocation(location)}
                  />
                </div>
              ))}

              {locations.length === 0 && (
                <div className="text-center py-12">
                  <MapPinIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Кофейни не найдены</p>
                </div>
              )}

              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/20 mt-4">
                <p className="text-[#D4AF37] text-xs text-center">
                  🕐 Время работы может меняться в праздничные дни
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </RoyalLayout>
  );
};

export default LocationsPage;
