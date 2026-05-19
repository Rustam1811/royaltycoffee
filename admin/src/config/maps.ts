/**
 * 2GIS Maps Configuration
 * 
 * Configuration for 2GIS Maps API integration
 * Used for real-time courier tracking and route visualization
 */

export const MAPS_CONFIG = {
  // 2GIS API key (get from https://dev.2gis.ru/)
  apiKey: import.meta.env.VITE_2GIS_API_KEY || '',
  
  // Default map center (Almaty, Kazakhstan)
  defaultCenter: {
    lat: 43.238293,
    lng: 76.889709,
  },
  
  // Default zoom level
  defaultZoom: 13,
  
  // Courier marker icon
  courierMarker: {
    iconUrl: '/assets/courier-marker.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  },
  
  // Customer marker icon
  customerMarker: {
    iconUrl: '/assets/customer-marker.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  },
  
  // Route options
  route: {
    color: '#3B82F6', // blue
    weight: 5,
    opacity: 0.8,
  },
  
  // Update intervals (milliseconds)
  updateIntervals: {
    position: 10000, // Update courier position every 10 seconds
    eta: 30000,      // Recalculate ETA every 30 seconds
  },
} as const;

/**
 * Load 2GIS Maps SDK
 * Loads the 2GIS Maps JavaScript API asynchronously
 */
export const load2GISMapsSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.DG) {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
    script.async = true;
    
    script.onload = () => {
      // Initialize 2GIS loader
      if (window.DG) {
        resolve();
      } else {
        reject(new Error('2GIS Maps SDK failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load 2GIS Maps SDK script'));
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
