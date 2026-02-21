import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Кеш для города пользователя
let userCityCache: string | null = null;

// Определение города по координатам пользователя через reverse geocoding
async function getUserCity(lat: number, lng: number): Promise<string> {
  if (userCityCache) return userCityCache;
  
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SunfoodApp/1.0',
      },
    });
    
    const data = await response.json();
    
    if (data && data.address) {
      // Пробуем найти город в разных полях
      const city = data.address.city || 
                   data.address.town || 
                   data.address.village || 
                   data.address.state || 
                   'Казахстан';
      userCityCache = city;
      return city;
    }
  } catch (error) {
    console.warn('Failed to get user city:', error);
  }
  
  return 'Казахстан'; // Фоллбэк
}

// Геокодирование адреса в координаты через Nominatim API (OpenStreetMap)
async function geocodeAddress(
  address: string, 
  locationCity?: string, 
  userCity?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Приоритет: город из данных локации > город пользователя > общий поиск
    const city = locationCity || userCity || '';
    const searchQuery = city 
      ? `${address}, ${city}, Казахстан`
      : `${address}, Казахстан`;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SunfoodApp/1.0',
      },
    });
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.warn('Geocoding failed for address:', address, error);
  }
  
  return null;
}

export interface CafeLocation {
  id: string;
  name: string;
  address: string;
  city?: string; // Город где находится кофейня
  phone?: string;
  workingHours?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  image?: string;
  distance?: number; // km from user
}

interface LocationContextType {
  locations: CafeLocation[];
  selectedLocation: CafeLocation | null;
  isLoading: boolean;
  error: string | null;
  selectLocation: (location: CafeLocation) => void;
  clearLocation: () => void;
  refreshLocations: () => Promise<void>;
  isLocationSelected: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_cafe_location';

// ─── Firestore helpers ───────────────────────────────────

/** Save selectedLocationId to Firestore user doc (fire-and-forget) */
function saveLocationToFirestore(uid: string, locationId: string) {
  const userRef = doc(db, 'users', uid);
  updateDoc(userRef, { selectedLocationId: locationId }).catch((err) => {
    // If doc doesn't exist yet, create with merge
    if (err?.code === 'not-found') {
      setDoc(userRef, { selectedLocationId: locationId }, { merge: true }).catch(() => {});
    }
  });
}

/** Clear selectedLocationId in Firestore */
function clearLocationInFirestore(uid: string) {
  const userRef = doc(db, 'users', uid);
  updateDoc(userRef, { selectedLocationId: null }).catch(() => {});
}

/** Read selectedLocationId from Firestore user doc */
async function readLocationFromFirestore(uid: string): Promise<string | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data()?.selectedLocationId || null;
    }
  } catch (e) {
    console.warn('Failed to read location from Firestore:', e);
  }
  return null;
}

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<CafeLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CafeLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationsLoadedRef = useRef(false);
  const firestoreSyncedRef = useRef(false);

  // 1. Быстрый кэш из localStorage (мгновенно при открытии)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedLocation(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved location:', e);
    }
  }, []);

  // 2. Слушаем auth — при входе подтягиваем selectedLocationId из Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || firestoreSyncedRef.current) return;
      firestoreSyncedRef.current = true;

      const firestoreLocationId = await readLocationFromFirestore(firebaseUser.uid);
      if (!firestoreLocationId) return;

      // Если в Firestore есть сохранённая точка — применяем
      // (она приоритетнее localStorage, т.к. может быть выбрана с другого устройства)
      setSelectedLocation((prev) => {
        if (prev?.id === firestoreLocationId) return prev; // уже совпадает

        // Ищем полный объект локации если они уже загружены
        // Если нет — ставим минимальный объект, обновится после загрузки локаций
        return { id: firestoreLocationId, name: '', address: '', isActive: true } as CafeLocation;
      });
    });
    return () => unsub();
  }, []);

  const selectLocation = useCallback((location: CafeLocation) => {
    setSelectedLocation(location);
    // localStorage — быстрый кэш
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } catch (e) {
      console.warn('Failed to save location:', e);
    }
    // Firestore — надёжное хранение
    const uid = auth.currentUser?.uid;
    if (uid) {
      saveLocationToFirestore(uid, location.id);
    }
  }, []);

  // Fetch locations from API
  const refreshLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/locations?action=list');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Filter only active locations
        let activeLocations = data.data.filter((loc: CafeLocation) => loc.isActive !== false);
        
        // Определяем город пользователя для геокодирования
        let userCity: string | undefined;
        let userLat: number | undefined;
        let userLng: number | undefined;

        if ('geolocation' in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000
              });
            });
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            userCity = await getUserCity(userLat, userLng);
          } catch {
            // Geolocation not available — OK
          }
        }

        // Геокодирование: автоматически получаем координаты по адресу, если их нет
        activeLocations = await Promise.all(
          activeLocations.map(async (loc: CafeLocation) => {
            if (!loc.coordinates?.lat || !loc.coordinates?.lng) {
              const coords = await geocodeAddress(loc.address, loc.city, userCity);
              if (coords) return { ...loc, coordinates: coords };
            }
            return loc;
          })
        );

        // Расчёт расстояний + сортировка
        if (userLat !== undefined && userLng !== undefined) {
          activeLocations = activeLocations.map((loc: CafeLocation) => {
            if (loc.coordinates?.lat && loc.coordinates?.lng) {
              const distance = calculateDistance(userLat!, userLng!, loc.coordinates.lat, loc.coordinates.lng);
              return { ...loc, distance };
            }
            return loc;
          });
          activeLocations.sort((a: CafeLocation, b: CafeLocation) => {
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });
        }

        setLocations(activeLocations);
        locationsLoadedRef.current = true;

        // Обогащение: если selectedLocation — минимальный объект из Firestore (name === ''),
        // подтягиваем полные данные из загруженных локаций
        setSelectedLocation((prev) => {
          if (prev && (!prev.name || prev.name === '')) {
            const full = activeLocations.find((l: CafeLocation) => l.id === prev.id);
            if (full) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(full)); } catch { /* ignore */ }
              return full;
            }
          }
          return prev;
        });

        // Автовыбор ближайшей точки если нет сохранённой
        // Проверяем через setTimeout(0) чтобы setSelectedLocation из Firestore sync успел
        setTimeout(() => {
          setSelectedLocation((prev) => {
            if (!prev && activeLocations.length > 0) {
              const best = activeLocations[0];
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(best)); } catch { /* ignore */ }
              const uid = auth.currentUser?.uid;
              if (uid) saveLocationToFirestore(uid, best.id);
              return best;
            }
            return prev;
          });
        }, 0);

      } else {
        setError('Не удалось загрузить список кофеен');
      }
    } catch (e) {
      console.error('Failed to fetch locations:', e);
      setError('Ошибка загрузки. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedLocation(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const uid = auth.currentUser?.uid;
    if (uid) clearLocationInFirestore(uid);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocation,
        isLoading,
        error,
        selectLocation,
        clearLocation,
        refreshLocations,
        isLocationSelected: !!selectedLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default LocationContext;
