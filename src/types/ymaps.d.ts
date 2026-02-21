/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal Yandex Maps 2.1 type declarations
 */
declare namespace ymaps {
  function ready(callback: () => void): void;

  class Map {
    constructor(element: HTMLElement | string, state: MapState, options?: MapOptions);
    geoObjects: GeoObjectCollection;
    controls: ControlManager;
    events: EventManager;
    destroy(): void;
    setCenter(center: number[], zoom?: number, options?: any): void;
    setBounds(bounds: number[][], options?: any): void;
    getZoom(): number;
    panTo(center: number[], options?: any): void;
  }

  interface MapState {
    center: number[];
    zoom: number;
    controls?: string[];
  }

  interface MapOptions {
    suppressMapOpenBlock?: boolean;
    minZoom?: number;
    maxZoom?: number;
  }

  class Placemark {
    constructor(coordinates: number[], properties?: any, options?: any);
    events: EventManager;
    options: OptionManager;
    properties: DataManager;
    geometry: any;
  }

  class Circle {
    constructor(coords: [number[], number], properties?: any, options?: any);
  }

  class GeoObjectCollection {
    add(child: any): this;
    remove(child: any): this;
    removeAll(): this;
    each(callback: (obj: any) => void): void;
    getBounds(): number[][] | null;
    getLength(): number;
  }

  class Balloon {
    open(position: number[], content: string, options?: any): void;
    close(): void;
  }

  interface EventManager {
    add(type: string | string[], callback: (e: any) => void, context?: any): this;
    remove(type: string, callback: (e: any) => void, context?: any): this;
  }

  interface ControlManager {
    add(control: string | any, options?: any): this;
    remove(control: string | any): this;
  }

  interface OptionManager {
    set(key: string | Record<string, any>, value?: any): void;
    get(key: string): any;
  }

  interface DataManager {
    set(key: string | Record<string, any>, value?: any): void;
    get(key: string): any;
  }

  namespace templateLayoutFactory {
    function createClass(template: string, overrides?: any): any;
  }

  namespace layout {
    namespace templateBased {
      function createClass(template: string): any;
    }
  }

  function geocode(request: string, options?: any): Promise<any>;

  namespace util {
    namespace bounds {
      function fromPoints(points: number[][]): number[][];
    }
  }
}

interface Window {
  ymaps: typeof ymaps;
}
