import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Stable refs for callbacks
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  const handleClose = () => {
    stopScanner();
    onCloseRef.current();
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      hasScannedRef.current = false;
      return;
    }

    // Wait for video element to mount
    const timeout = setTimeout(() => {
      if (!videoRef.current) return;
      hasScannedRef.current = false;

      const reader = new BrowserMultiFormatReader();

      reader.decodeFromVideoDevice(
        undefined, // use default camera
        videoRef.current,
        (result, _error, controls) => {
          if (!controlsRef.current) controlsRef.current = controls;

          if (result && !hasScannedRef.current) {
            hasScannedRef.current = true;
            const text = result.getText();
            console.log('✅ QR scanned:', text);
            controls.stop();
            controlsRef.current = null;
            onScanRef.current(text);
            onCloseRef.current();
          }
        }
      ).then(() => {
        setError(null);
      }).catch((err) => {
        console.error('Camera error:', err);
        setError('Не удалось запустить камеру. Разрешите доступ.');
      });
    }, 200);

    return () => {
      clearTimeout(timeout);
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-t-3xl p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Сканировать QR</h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="bg-white p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
              >
                Закрыть
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-[320px] object-cover rounded-2xl bg-black"
                muted
                playsInline
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600 font-medium">
                  📱 Наведите на QR-код клиента
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Сканирование автоматическое
                </p>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-b-3xl p-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
