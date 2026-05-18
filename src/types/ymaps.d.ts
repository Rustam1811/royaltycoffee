/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal 2GIS Maps API type declarations (Leaflet-based)
 */
declare namespace DG {
  function then(resolve: () => void, reject?: () => void): Promise<void>;

  function map(element: HTMLElement | string, options?: MapOptions): Map;

  function marker(latlng: [number, number], options?: MarkerOptions): Marker;

  function divIcon(options?: DivIconOptions): DivIcon;

  function icon(options: IconOptions): Icon;

  function circleMarker(latlng: [number, number], options?: CircleMarkerOptions): CircleMarker;

  function circle(latlng: [number, number], options?: CircleOptions): Circle;

  function latLngBounds(latlngs: [number, number][]): LatLngBounds;

  function featureGroup(layers?: Layer[]): FeatureGroup;

  function popup(options?: PopupOptions): Popup;

  interface MapOptions {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    zoomControl?: boolean;
    fullscreenControl?: boolean;
    geoclicker?: boolean;
    poi?: boolean;
  }

  interface Map {
    setView(center: [number, number], zoom?: number, options?: any): this;
    setZoom(zoom: number): this;
    fitBounds(bounds: LatLngBounds | [number, number][], options?: FitBoundsOptions): this;
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    eachLayer(fn: (layer: Layer) => void): this;
    remove(): void;
    invalidateSize(options?: any): this;
    getZoom(): number;
    getCenter(): LatLng;
    getBounds(): LatLngBounds;
    on(type: string, fn: (e: any) => void): this;
    off(type: string, fn?: (e: any) => void): this;
    openPopup(popup: Popup): this;
    closePopup(popup?: Popup): this;
  }

  interface LatLng {
    lat: number;
    lng: number;
  }

  interface LatLngBounds {
    extend(latlng: [number, number] | LatLng): this;
    getCenter(): LatLng;
    getNorthEast(): LatLng;
    getSouthWest(): LatLng;
    isValid(): boolean;
    pad(bufferRatio: number): LatLngBounds;
  }

  interface FitBoundsOptions {
    padding?: [number, number];
    paddingTopLeft?: [number, number];
    paddingBottomRight?: [number, number];
    maxZoom?: number;
  }

  interface Layer {
    addTo(map: Map): this;
    remove(): this;
    bindPopup(content: string | HTMLElement, options?: PopupOptions): this;
    openPopup(): this;
    closePopup(): this;
    on(type: string, fn: (e: any) => void): this;
    off(type: string, fn?: (e: any) => void): this;
  }

  interface Marker extends Layer {
    setLatLng(latlng: [number, number]): this;
    getLatLng(): LatLng;
    setIcon(icon: DivIcon | Icon): this;
    setZIndexOffset(offset: number): this;
    setOpacity(opacity: number): this;
  }

  interface MarkerOptions {
    icon?: DivIcon | Icon;
    interactive?: boolean;
    draggable?: boolean;
    zIndexOffset?: number;
    opacity?: number;
    title?: string;
  }

  interface DivIcon {
    options: DivIconOptions;
  }

  interface DivIconOptions {
    html?: string;
    className?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
  }

  interface Icon {
    options: IconOptions;
  }

  interface IconOptions {
    iconUrl: string;
    iconRetinaUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
    shadowUrl?: string;
    shadowSize?: [number, number];
    shadowAnchor?: [number, number];
    className?: string;
  }

  interface CircleMarker extends Layer {
    setLatLng(latlng: [number, number]): this;
    getLatLng(): LatLng;
    setRadius(radius: number): this;
    getRadius(): number;
  }

  interface CircleMarkerOptions {
    radius?: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    opacity?: number;
    interactive?: boolean;
  }

  interface Circle extends CircleMarker {
    setRadius(radius: number): this;
    getRadius(): number;
    getBounds(): LatLngBounds;
  }

  interface CircleOptions extends CircleMarkerOptions {
    radius?: number;
  }

  interface FeatureGroup extends Layer {
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    clearLayers(): this;
    getBounds(): LatLngBounds;
    eachLayer(fn: (layer: Layer) => void): this;
  }

  interface Popup extends Layer {
    setLatLng(latlng: [number, number]): this;
    setContent(content: string | HTMLElement): this;
    getContent(): string | HTMLElement;
    getLatLng(): LatLng;
    openOn(map: Map): this;
  }

  interface PopupOptions {
    maxWidth?: number;
    minWidth?: number;
    maxHeight?: number;
    className?: string;
    offset?: [number, number];
    autoPan?: boolean;
    closeButton?: boolean;
    closeOnClick?: boolean;
  }
}

interface Window {
  DG: typeof DG;
}
