/**
 * TypeScript type definitions for 2GIS Maps API
 * Based on 2GIS Maps API 2.0 documentation
 */

export interface DGLatLng {
  lat: number;
  lng: number;
}

export interface DGLatLngBounds {
  extend(latlng: DGLatLng | [number, number]): void;
  isValid(): boolean;
}

export interface DGIcon {
  options: {
    iconUrl: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  };
}

export interface DGMarker {
  setLatLng(latlng: [number, number] | DGLatLng): this;
  getLatLng(): DGLatLng;
  addTo(map: DGMap): this;
  remove(): this;
  bindPopup(content: string): this;
  openPopup(): this;
  closePopup(): this;
}

export interface DGPolyline {
  setLatLngs(latlngs: [number, number][]): this;
  getLatLngs(): DGLatLng[];
  addTo(map: DGMap): this;
  remove(): this;
}

export interface DGRouteOptions {
  waypoints: [number, number][];
  routeMode?: 'car' | 'pedestrian' | 'bicycle';
}

export interface DGRoute {
  addTo(map: DGMap): this;
  remove(): this;
  getWaypoints(): [number, number][];
}

export interface DGMapOptions {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
}

export interface DGMap {
  setView(center: [number, number], zoom: number): this;
  getCenter(): DGLatLng;
  getZoom(): number;
  fitBounds(bounds: DGLatLngBounds, options?: { padding?: [number, number] }): this;
  panTo(latlng: [number, number] | DGLatLng): this;
  remove(): void;
  invalidateSize(): void;
}

export interface DGStatic {
  map(element: string | HTMLElement, options?: DGMapOptions): DGMap;
  marker(latlng: [number, number], options?: { icon?: DGIcon }): DGMarker;
  icon(options: { iconUrl: string; iconSize?: [number, number]; iconAnchor?: [number, number] }): DGIcon;
  polyline(latlngs: [number, number][], options?: { color?: string; weight?: number; opacity?: number }): DGPolyline;
  latLng(lat: number, lng: number): DGLatLng;
  latLngBounds(corner1?: DGLatLng, corner2?: DGLatLng): DGLatLngBounds;
  route(options: DGRouteOptions): DGRoute;
}

declare global {
  interface Window {
    DG?: DGStatic;
  }
}

export {};
