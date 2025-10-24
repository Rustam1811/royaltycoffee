/**
 * DeliveryMap Component
 * 
 * Interactive map with 2GIS SDK showing:
 * - Shop location (origin)
 * - Customer location (destination)
 * - Courier real-time location
 * - Delivery route
 * - ETA and distance
 * 
 * Uses 2GIS Maps JS API
 * https://docs.2gis.com/ru/mapgl/overview
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CourierInfo, DeliveryRoute } from '../types/delivery';

interface DeliveryMapProps {
  /** Shop location (origin) */
  shopLocation: { lat: number; lng: number };
  
  /** Customer location (destination) */
  customerLocation: { lat: number; lng: number };
  
  /** Courier current location (optional, for tracking) */
  courierLocation?: { lat: number; lng: number; heading?: number };
  
  /** Courier info (optional) */
  courierInfo?: CourierInfo;
  
  /** Delivery route (optional) */
  route?: DeliveryRoute;
  
  /** Map height */
  height?: string;
  
  /** Whether to show route */
  showRoute?: boolean;
  
  /** Whether to auto-center on courier */
  followCourier?: boolean;
}

// Declare 2GIS types for TypeScript
declare global {
  interface Window {
    DG?: {
      map: (
        element: HTMLElement | string,
        options?: {
          center?: [number, number];
          zoom?: number;
        }
      ) => DGMap;
      marker: (
        latlng: [number, number],
        options?: {
          icon?: DGIcon;
        }
      ) => DGMarker;
      icon: (options: {
        iconUrl?: string;
        iconSize?: [number, number];
        iconAnchor?: [number, number];
        html?: string;
      }) => DGIcon;
      polyline: (latlngs: Array<[number, number]>, options?: {
        color?: string;
        weight?: number;
        opacity?: number;
      }) => DGPolyline;
    };
  }
  
  interface DGMap {
    setView: (latlng: [number, number], zoom: number) => void;
    fitBounds: (bounds: [[number, number], [number, number]]) => void;
    remove: () => void;
  }
  
  interface DGMarker {
    addTo: (map: DGMap) => DGMarker;
    remove: () => void;
    setLatLng: (latlng: [number, number]) => void;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DGIcon {
    // Icon interface
  }
  
  interface DGPolyline {
    addTo: (map: DGMap) => DGPolyline;
    remove: () => void;
  }
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  shopLocation,
  customerLocation,
  courierLocation,
  courierInfo,
  route,
  height = '400px',
  showRoute = true,
  followCourier = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<DGMap | null>(null);
  const shopMarkerRef = useRef<DGMarker | null>(null);
  const customerMarkerRef = useRef<DGMarker | null>(null);
  const courierMarkerRef = useRef<DGMarker | null>(null);
  const routeLineRef = useRef<DGPolyline | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load 2GIS API
  useEffect(() => {
    if (window.DG) {
      setIsLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
    script.async = true;
    
    script.onload = () => {
      if (window.DG) {
        setIsLoaded(true);
      } else {
        setError('Failed to load 2GIS API');
      }
    };
    
    script.onerror = () => {
      setError('Failed to load 2GIS script');
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script if component unmounts before load
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  
  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.DG) return;
    
    const DG = window.DG;
    
    // Create map centered between shop and customer
    const centerLat = (shopLocation.lat + customerLocation.lat) / 2;
    const centerLng = (shopLocation.lng + customerLocation.lng) / 2;
    
    const map = DG.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
    });
    
    mapRef.current = map;
    
    // Add shop marker
    const shopIcon = DG.icon({
      html: `
        <div style="background: #1f2937; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          🏪 Кофейня
        </div>
      `,
      iconSize: [80, 40],
      iconAnchor: [40, 40],
    });
    
    const shopMarker = DG.marker([shopLocation.lat, shopLocation.lng], {
      icon: shopIcon,
    }).addTo(map);
    
    shopMarkerRef.current = shopMarker;
    
    // Add customer marker
    const customerIcon = DG.icon({
      html: `
        <div style="background: #dc2626; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          📍 Вы
        </div>
      `,
      iconSize: [60, 40],
      iconAnchor: [30, 40],
    });
    
    const customerMarker = DG.marker([customerLocation.lat, customerLocation.lng], {
      icon: customerIcon,
    }).addTo(map);
    
    customerMarkerRef.current = customerMarker;
    
    // Fit bounds to show both markers
    map.fitBounds([
      [shopLocation.lat, shopLocation.lng],
      [customerLocation.lat, customerLocation.lng],
    ]);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoaded, shopLocation, customerLocation]);
  
  // Update courier marker
  useEffect(() => {
    if (!mapRef.current || !courierLocation || !window.DG) return;
    
    const DG = window.DG;
    const map = mapRef.current;
    
    if (courierMarkerRef.current) {
      // Update existing marker
      courierMarkerRef.current.setLatLng([courierLocation.lat, courierLocation.lng]);
    } else {
      // Create new marker
      const vehicleIcon = courierInfo?.vehicle?.type || 'car';
      const vehicleEmoji = { car: '🚗', bike: '🚴', scooter: '🛵', walking: '🚶' }[vehicleIcon];
      
      const courierIcon = DG.icon({
        html: `
          <div style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); position: relative;">
            ${vehicleEmoji} ${courierInfo?.name || 'Курьер'}
            ${courierLocation.heading !== undefined ? `
              <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%) rotate(${courierLocation.heading}deg); font-size: 20px;">
                ▲
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [120, 40],
        iconAnchor: [60, 40],
      });
      
      const courierMarker = DG.marker([courierLocation.lat, courierLocation.lng], {
        icon: courierIcon,
      }).addTo(map);
      
      courierMarkerRef.current = courierMarker;
    }
    
    // Auto-center on courier if enabled
    if (followCourier) {
      map.setView([courierLocation.lat, courierLocation.lng], 15);
    }
  }, [courierLocation, courierInfo, followCourier]);
  
  // Draw route
  useEffect(() => {
    if (!mapRef.current || !route || !showRoute || !window.DG) return;
    
    const DG = window.DG;
    const map = mapRef.current;
    
    // Remove existing route
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    
    // Draw new route
    const latlngs: Array<[number, number]> = route.polyline.map(p => [p.lat, p.lng]);
    
    const routeLine = DG.polyline(latlngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
    }).addTo(map);
    
    routeLineRef.current = routeLine;
    
    return () => {
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    };
  }, [route, showRoute]);
  
  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 rounded-xl"
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Ошибка загрузки карты</div>
          <div className="text-slate-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }
  
  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 rounded-xl"
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-slate-600 text-sm">Загрузка карты...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={mapContainerRef}
      className="w-full rounded-xl overflow-hidden shadow-lg"
      style={{ height }}
    />
  );
};

export default DeliveryMap;
