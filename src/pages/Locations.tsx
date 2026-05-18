import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { MapPinIcon, ClockIcon, PhoneIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
        `https://2gis.kz/astana/geo/${location.coordinates.lng},${location.coordinates.lat}`,
        '_blank',
      );
    } else if (location.address) {
      window.open(
        `https://2gis.kz/astana/search/${encodeURIComponent(location.address)}`,
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
          ? 'bg-[#D4AF37]/15 border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/20 ring-1 ring-[#D4AF37]/30'
          : isNearest
            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/10'
            : 'bg-white/80 border-[#3D0A11]/10 hover:bg-white shadow-sm'
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
            <h3 className="font-bold text-[#3D0A11] text-[15px] leading-tight">{location.name}</h3>
            <p className="text-[#3D0A11]/50 text-sm mt-1 leading-snug">{location.address}</p>
            
            <div className="flex items-center gap-3 mt-2">
              {location.workingHours && (
                <div className="flex items-center gap-1 text-[#3D0A11]/40">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="text-xs">{location.workingHours}</span>
                </div>
              )}
              {distanceKm !== null && (
                <span className="text-xs text-[#D4AF37] font-medium">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} м` : `${distanceKm.toFixed(1)} км`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onChoose(); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              isSelected
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                : 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/50'
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
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3D0A11]/5 hover:bg-[#3D0A11]/10 text-[#3D0A11]/60 text-sm rounded-xl transition-colors border border-[#3D0A11]/10"
          >
            <MapPinSolidIcon className="w-4 h-4" />
            Маршрут
          </button>
          {location.phone && (
            <button
              onClick={callPhone}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#3D0A11]/10 hover:bg-[#3D0A11]/15 text-[#3D0A11]/80 text-sm rounded-xl transition-colors border border-[#3D0A11]/15"
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

// ─── Main page ───
const LocationsPage: React.FC = () => {
  const history = useHistory();
  const { selectedLocation, selectLocation } = useLocationContext();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
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
    document.getElementById(`loc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      <div className="sticky top-0 z-20 bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] pt-safe">
        <div className="px-4 py-2 flex items-center justify-between">
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
        </div>
      </div>

      {/* Selected location indicator */}
      {selectedLocation && (
        <div className="px-4 py-2 bg-[#D4AF37]/10 border-b border-[#D4AF37]/15">
          <div className="flex items-center gap-2">
            <CheckCircleSolidIcon className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
            <span className="text-[#3D0A11]/50 text-xs">Выбрана:</span>
            <span className="text-[#3D0A11] text-xs font-semibold truncate">{selectedLocation.name}</span>
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
            <div key={i} className="bg-white/80 rounded-2xl p-4 animate-pulse border border-[#3D0A11]/10">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-[#3D0A11]/10 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-[#3D0A11]/10 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-[#3D0A11]/10 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
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
                  <MapPinIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Кофейни не найдены</p>
                </div>
              )}

              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/15 mt-4">
                <p className="text-[#D4AF37] text-xs text-center">
                  🕐 Время работы может меняться в праздничные дни
                </p>
              </div>
            </motion.div>
        </AnimatePresence>
      )}
    </RoyalLayout>
  );
};

export default LocationsPage;
