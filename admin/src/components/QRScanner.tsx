import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setIsScanning(false);
        onClose();
      }).catch((err) => {
        console.error('Error stopping scanner:', err);
        onClose();
      });
    } else {
      onClose();
    }
  }, [isScanning, onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          setIsScanning(false);
        }).catch(console.error);
      }
      return;
    }

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        console.log('✅ QR scanned:', decodedText);
        onScan(decodedText);
        handleClose();
      },
      () => {
        // Ignore "no QR found" errors
      }
    ).then(() => {
      setIsScanning(true);
      setError(null);
    }).catch((err) => {
      console.error('Camera error:', err);
      setError('Не удалось запустить камеру');
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen, onScan, handleClose]);

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

        <div className="bg-white p-6">
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
              <div id="qr-reader" className="rounded-2xl overflow-hidden" />
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600 font-medium">
                  📱 Наведите на QR-код клиента
                </p>
                <p className="text-xs text-slate-400 mt-2">
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
