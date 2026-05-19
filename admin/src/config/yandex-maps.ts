/**
 * Yandex Maps Configuration
 * 
 * Configuration for Yandex Maps API integration
 * Used for real-time courier tracking and route visualization
 * 
 * Get your API key: https://developer.tech.yandex.ru/
 */

export const MAPS_CONFIG = {
  // Yandex Maps API key (get from https://developer.tech.yandex.ru/)
  apiKey: import.meta.env.VITE_YANDEX_MAPS_API_KEY || '',
  
  // Default map center (Almaty, Kazakhstan)
  defaultCenter: {
    lat: 43.238293,
    lng: 76.889709,
  },
  
  // Default zoom level
  defaultZoom: 13,
  
  // Courier marker options
  courierMarker: {
    preset: 'islands#blueAutoCircleIcon', // Built-in Yandex preset
    iconColor: '#3B82F6', // Blue
  },
  
  // Customer marker options
  customerMarker: {
    preset: 'islands#redHomeCircleIcon', // Built-in Yandex preset
    iconColor: '#EF4444', // Red
  },
  
  // Route options
  route: {
    strokeColor: '#3B82F6', // Blue
    strokeWidth: 5,
    strokeOpacity: 0.8,
  },
  
  // Update intervals (milliseconds)
  updateIntervals: {
    position: 10000, // Update courier position every 10 seconds
    eta: 30000,      // Recalculate ETA every 30 seconds
  },
  
  // Yandex Maps API URL
  apiUrl: 'https://api-maps.yandex.ru/2.1/?apikey={apiKey}&lang=ru_RU',
} as const;

/**
 * Load Yandex Maps API
 * Loads the Yandex Maps JavaScript API asynchronously
 */
export const loadYandexMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.ymaps) {
      window.ymaps.ready(() => resolve());
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    const apiUrl = MAPS_CONFIG.apiUrl.replace('{apiKey}', MAPS_CONFIG.apiKey);
    script.src = apiUrl;
    script.async = true;
    
    script.onload = () => {
      // Wait for ymaps to be ready
      if (window.ymaps) {
        window.ymaps.ready(() => {
          resolve();
        });
      } else {
        reject(new Error('Yandex Maps API failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Yandex Maps API script'));
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export const calculateDistance = (
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Estimate ETA based on distance and average speed
 * Returns time in seconds
 */
export const estimateETA = (
  distanceMeters: number,
  averageSpeedKmh: number = 30 // Default: 30 km/h for city
): number => {
  const distanceKm = distanceMeters / 1000;
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.round(timeHours * 3600); // Convert to seconds
};

/**
 * Format ETA for display
 */
export const formatETA = (seconds: number): string => {
  if (seconds < 60) {
    return '< 1 мин';
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ч ${remainingMinutes} мин`;
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} км`;
};

/**
 * Convert lat/lng to Yandex Maps coordinate format [lat, lng]
 */
export const toYandexCoordinate = (lat: number, lng: number): [number, number] => {
  return [lat, lng];
};
