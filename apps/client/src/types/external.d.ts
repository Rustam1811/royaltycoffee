declare module 'qrcode.react' {
  import * as React from 'react';
  export interface QRCodeProps {
    value: string;
    size?: number;
    includeMargin?: boolean;
    className?: string;
  }
  export const QRCodeCanvas: React.FC<QRCodeProps>;
}

declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string;
    displayValue?: boolean;
    fontSize?: number;
    width?: number;
    height?: number;
    margin?: number;
  }
  function JsBarcode(element: SVGSVGElement, text: string, options?: JsBarcodeOptions): void;
  export default JsBarcode;
}
