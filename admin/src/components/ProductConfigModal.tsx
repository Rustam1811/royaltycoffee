import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;
}

interface Size {
  key: string;
  label: string;
  ml: number;
  multiplier: number;
}

interface Option {
  key: string;
  name: string;
  price: number;
  image: string;
}

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAdd: (config: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    sizeKey?: string;
    milkKey?: string;
    syrupKey?: string;
  }) => void;
}

const SIZES: Size[] = [
  { key: 'S', label: 'S', ml: 250, multiplier: 0.9 },
  { key: 'M', label: 'M', ml: 350, multiplier: 1.0 },
  { key: 'L', label: 'L', ml: 450, multiplier: 1.18 },
];

const MILKS: Option[] = [
  { key: 'regular', name: 'Обычное', price: 0, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop' },
  { key: 'oat', name: 'Овсяное', price: 200, image: 'https://images.unsplash.com/photo-1600623560792-d0b2d4e30b91?w=100&h=100&fit=crop' },
  { key: 'almond', name: 'Миндальное', price: 250, image: 'https://images.unsplash.com/photo-1569478412303-6f566ac41a37?w=100&h=100&fit=crop' },
  { key: 'coconut', name: 'Кокосовое', price: 250, image: 'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=100&h=100&fit=crop' },
];

const SYRUPS: Option[] = [
  { key: 'vanilla', name: 'Ваниль', price: 200, image: 'https://images.unsplash.com/photo-1587736174440-ddbf2b6a3b4b?w=100&h=100&fit=crop' },
  { key: 'caramel', name: 'Карамель', price: 200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop' },
  { key: 'hazelnut', name: 'Фундук', price: 220, image: 'https://images.unsplash.com/photo-1633436370590-223c9e0d2afd?w=100&h=100&fit=crop' },
  { key: 'coconut', name: 'Кокос', price: 220, image: 'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=100&h=100&fit=crop' },
];

const TOPPINGS: Option[] = [
  { key: 'cinnamon', name: 'Корица', price: 0, image: 'https://images.unsplash.com/photo-1596040033229-a0b3b64d1673?w=100&h=100&fit=crop' },
  { key: 'cocoa', name: 'Какао', price: 0, image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=100&h=100&fit=crop' },
  { key: 'choco', name: 'Шоколад', price: 120, image: 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=100&h=100&fit=crop' },
];

export const ProductConfigModal: React.FC<Props> = ({ product, open, onClose, onAdd }) => {
  const [size, setSize] = useState('M');
  const [milk, setMilk] = useState('regular');
  const [selectedSyrups, setSelectedSyrups] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'milk' | 'syrups' | 'toppings'>('milk');

  if (!product) return null;

  const toggleSyrup = (key: string) => {
    setSelectedSyrups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleTopping = (key: string) => {
    setSelectedToppings(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const calculateTotal = () => {
    const sizeData = SIZES.find(s => s.key === size);
    const milkData = MILKS.find(m => m.key === milk);
    const syrupsPrice = selectedSyrups.reduce((sum, key) => {
      const syrup = SYRUPS.find(s => s.key === key);
      return sum + (syrup?.price || 0);
    }, 0);
    const toppingsPrice = selectedToppings.reduce((sum, key) => {
      const topping = TOPPINGS.find(t => t.key === key);
      return sum + (topping?.price || 0);
    }, 0);

    return Math.round(
      product.price * (sizeData?.multiplier || 1) +
      (milkData?.price || 0) +
      syrupsPrice +
      toppingsPrice
    );
  };

  const handleAdd = () => {
    const total = calculateTotal();
    const syrupKey = [...selectedSyrups, ...selectedToppings].join('+');
    
    onAdd({
      id: String(product.id),
      name: product.name,
      price: total,
      quantity: 1,
      image: product.image,
      sizeKey: size,
      milkKey: milk,
      syrupKey: syrupKey || '',
    });
    
    onClose();
  };

  const total = calculateTotal();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-5 pt-6 text-center relative border-b border-gray-100">
              <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden bg-gray-50">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
              {product.description && (
                <p className="text-xs text-gray-500 mt-1">{product.description}</p>
              )}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Size */}
              <div>
                <h4 className="text-xs font-semibold mb-2 text-gray-500 uppercase">Размер</h4>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSize(s.key)}
                      className={`rounded-xl border-2 px-2 py-2 flex flex-col items-center gap-0.5 transition-all text-sm font-semibold ${
                        size === s.key
                          ? 'bg-amber-50 border-amber-500 text-gray-900 shadow-md'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base font-bold">{s.label}</span>
                      <span className="text-[9px] opacity-70">{s.ml} мл</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setActiveTab('milk')}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'milk'
                        ? 'bg-black text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Молоко
                  </button>
                  <button
                    onClick={() => setActiveTab('syrups')}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'syrups'
                        ? 'bg-black text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Сиропы
                  </button>
                  <button
                    onClick={() => setActiveTab('toppings')}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'toppings'
                        ? 'bg-black text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Топпинги
                  </button>
                </div>

                {/* Options - Horizontal Scroll */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                  {activeTab === 'milk' && MILKS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setMilk(m.key)}
                      className={`flex-shrink-0 w-28 rounded-2xl p-3 transition-all ${
                        milk === m.key
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      }`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden bg-white shadow-sm mb-2">
                        <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                      <span className={`block text-xs font-bold line-clamp-2 text-center ${milk === m.key ? 'text-white' : 'text-gray-900'}`}>
                        {m.name}
                      </span>
                      {m.price > 0 && (
                        <span className={`block text-[10px] font-bold mt-1 text-center ${milk === m.key ? 'text-white' : 'text-amber-600'}`}>
                          +{m.price}₸
                        </span>
                      )}
                      {milk === m.key && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}

                  {activeTab === 'syrups' && SYRUPS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => toggleSyrup(s.key)}
                      className={`flex-shrink-0 w-28 rounded-2xl p-3 transition-all ${
                        selectedSyrups.includes(s.key)
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      }`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden bg-white shadow-sm mb-2">
                        <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <span className={`block text-xs font-bold line-clamp-2 text-center ${selectedSyrups.includes(s.key) ? 'text-white' : 'text-gray-900'}`}>
                        {s.name}
                      </span>
                      {s.price > 0 && (
                        <span className={`block text-[10px] font-bold mt-1 text-center ${selectedSyrups.includes(s.key) ? 'text-white' : 'text-amber-600'}`}>
                          +{s.price}₸
                        </span>
                      )}
                      {selectedSyrups.includes(s.key) && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}

                  {activeTab === 'toppings' && TOPPINGS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => toggleTopping(t.key)}
                      className={`flex-shrink-0 w-28 rounded-2xl p-3 transition-all ${
                        selectedToppings.includes(t.key)
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      }`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden bg-white shadow-sm mb-2">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <span className={`block text-xs font-bold line-clamp-2 text-center ${selectedToppings.includes(t.key) ? 'text-white' : 'text-gray-900'}`}>
                        {t.name}
                      </span>
                      {t.price > 0 && (
                        <span className={`block text-[10px] font-bold mt-1 text-center ${selectedToppings.includes(t.key) ? 'text-white' : 'text-amber-600'}`}>
                          +{t.price}₸
                        </span>
                      )}
                      {selectedToppings.includes(t.key) && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full bg-gradient-to-r from-black to-gray-800 text-white font-bold py-4 rounded-2xl shadow-xl hover:from-gray-800 hover:to-gray-700 active:scale-95 transition-all text-lg"
              >
                + {total} ₸
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
