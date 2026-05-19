import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/solid';
import LocationSelector from './LocationSelector';
import { useLocation } from '../../contexts/LocationContext';

interface LocationRequiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

const LocationRequiredModal: React.FC<LocationRequiredModalProps> = ({
  isOpen,
  onClose,
  title = 'Выберите кофейню',
  subtitle = 'Выберите удобную кофейню для заказа'
}) => {
  const { isLocationSelected } = useLocation();

  // Auto-close when location is selected
  React.useEffect(() => {
    if (isLocationSelected && onClose) {
      onClose();
    }
  }, [isLocationSelected, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-4 top-auto bottom-4 max-h-[80vh] bg-white rounded-3xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <MapPinIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                  <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <LocationSelector variant="full" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LocationRequiredModal;
