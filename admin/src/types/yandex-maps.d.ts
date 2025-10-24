/**
 * TypeScript definitions for Yandex Maps API
 * Based on Yandex Maps API 2.1 documentation
 * https://yandex.ru/dev/maps/jsapi/doc/2.1/
 */

export interface YMapsCoordinate {
  0: number; // latitude
  1: number; // longitude
}

export interface YMapsGeoObject {
  geometry: {
    getCoordinates(): YMapsCoordinate;
    setCoordinates(coordinates: YMapsCoordinate): void;
  };
  properties: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  };
}

export interface YMapsPlacemark extends YMapsGeoObject {
  options: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
  };
}

export interface YMapsPolyline {
  geometry: {
    getCoordinates(): YMapsCoordinate[];
    setCoordinates(coordinates: YMapsCoordinate[]): void;
  };
  options: {
    set(key: string, value: unknown): void;
  };
}

export interface YMapsMap {
  geoObjects: {
    add(geoObject: YMapsGeoObject | YMapsPlacemark | YMapsPolyline): void;
    remove(geoObject: YMapsGeoObject | YMapsPlacemark | YMapsPolyline): void;
    removeAll(): void;
  };
  setCenter(center: YMapsCoordinate, zoom?: number, options?: unknown): Promise<void>;
  getCenter(): YMapsCoordinate;
  getZoom(): number;
  setBounds(bounds: [YMapsCoordinate, YMapsCoordinate], options?: { checkZoomRange?: boolean }): Promise<void>;
  destroy(): void;
}

export interface YMapsPlacemarkOptions {
  iconLayout?: string;
  iconImageHref?: string;
  iconImageSize?: [number, number];
  iconImageOffset?: [number, number];
  preset?: string;
  iconColor?: string;
}

export interface YMapsPolylineOptions {
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export interface YMapsMapOptions {
  center: YMapsCoordinate;
  zoom: number;
  controls?: string[];
}

export interface YMapsRoute {
  getPaths(): {
    get(index: number): {
      getSegments(): unknown[];
    };
  };
  getWayPoints(): {
    get(index: number): YMapsGeoObject;
  };
  properties: {
    get(key: string): unknown;
  };
}

export interface YMapsStatic {
  Map: new (element: string | HTMLElement, options: YMapsMapOptions) => YMapsMap;
  Placemark: new (
    coordinates: YMapsCoordinate,
    properties?: { balloonContent?: string; hintContent?: string },
    options?: YMapsPlacemarkOptions
  ) => YMapsPlacemark;
  Polyline: new (
    coordinates: YMapsCoordinate[],
    properties?: unknown,
    options?: YMapsPolylineOptions
  ) => YMapsPolyline;
  route: (
    points: YMapsCoordinate[],
    options?: { mapStateAutoApply?: boolean }
  ) => Promise<YMapsRoute>;
  geocode: (address: string) => Promise<{
    geoObjects: {
      get(index: number): YMapsGeoObject;
    };
  }>;
  ready: (callback: () => void) => void;
}

declare global {
  interface Window {
    ymaps?: YMapsStatic;
  }
}

export {};
