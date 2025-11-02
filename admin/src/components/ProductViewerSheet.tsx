import React, { useReducer, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types/types';
import { SIZES, MILKS, SYRUPS } from '@/constants/productOptions';

interface ProductViewerSheetProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onAdd: (config: {
    productId: string;
    name: string;
    sizeKey: string;
    syrupKey: string;
    milkKey: string;
    quantity: number;
    totalPrice: number;
    image?: string;
  }) => void;
}

type Action =
  | { type: 'SET'; field: 'sizeKey' | 'milkKey' | 'syrupKey'; value: string }
  | { type: 'QTY'; delta: number };

export const ProductViewerSheet: React.FC<ProductViewerSheetProps> = ({
  open,
  product,
  onClose,
  onAdd,
}) => {
  const initial = { sizeKey: 'M', milkKey: 'regular', syrupKey: 'none', quantity: 1 };
  
  function reducer(state: typeof initial, action: Action) {
    switch (action.type) {
      case 'SET':
        return { ...state, [action.field]: action.value };
      case 'QTY':
        return { ...state, quantity: Math.max(1, state.quantity + action.delta) };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initial);
  const [showSyrups, setShowSyrups] = useState(false);
  const [showMilks, setShowMilks] = useState(false);

  const calculatePrice = useCallback(() => {
    if (!product) return 0;
    const size = SIZES.find(s => s.key === state.sizeKey);
    const syrup = SYRUPS.find(s => s.key === state.syrupKey);
    const milk = MILKS.find(m => m.key === state.milkKey);
    return Math.round(
      (product.price * (size?.priceMultiplier || 1) +
        (syrup?.price || 0) +
        (milk?.price || 0)) *
        state.quantity
    );
  }, [product, state]);

  const total = calculatePrice();

  const handleAdd = () => {
    if (!product) return;
    
    const nameRu = typeof product.name === 'string' ? product.name : product.name?.ru || 'Напиток';
    
    onAdd({
      productId: product.id,
      name: nameRu,
      sizeKey: state.sizeKey,
      milkKey: state.milkKey,
      syrupKey: state.syrupKey,
      quantity: state.quantity,
      totalPrice: total,
      image: product.image,
    });
    onClose();
  };

  if (!open || !product) return null;

  const nameRu = typeof product.name === 'string' ? product.name : product.name?.ru || 'Напиток';
  const descRu = typeof product.description === 'string' 
    ? product.description 
    : product.description?.ru || '';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header className="flex-shrink-0 p-5 pt-6 text-center relative border-b border-gray-100">
            <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden bg-gray-50">
              {product.image && (
                <img
                  src={product.image}
                  alt={nameRu}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{nameRu}</h2>
            {descRu && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{descRu}</p>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </header>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Size */}
            <div>
              <h4 className="text-xs font-semibold mb-2 tracking-wide text-gray-500 uppercase">
                Размер
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => dispatch({ type: 'SET', field: 'sizeKey', value: s.key })}
                    className={`rounded-xl border-2 px-2 py-2 flex flex-col items-center gap-0.5 transition-all text-sm font-semibold ${
                      state.sizeKey === s.key
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

            {/* Milk */}
            <div>
              <button
                type="button"
                onClick={() => setShowMilks(s => !s)}
                className="w-full flex items-center justify-between mb-2"
              >
                <h4 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Молоко
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                  {showMilks ? 'Скрыть' : 'Показать'}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {showMilks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {MILKS.map(m => (
                        <button
                          key={m.key}
                          onClick={() =>
                            dispatch({ type: 'SET', field: 'milkKey', value: m.key })
                          }
                          className={`flex-shrink-0 w-24 rounded-xl p-2 transition ${
                            state.milkKey === m.key
                              ? 'ring-2 ring-amber-500 bg-amber-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          {m.image && (
                            <img
                              src={m.image}
                              alt={m.name}
                              className="w-10 h-10 mx-auto mb-1 rounded-lg"
                            />
                          )}
                          <span className="block text-[10px] leading-tight line-clamp-2 text-gray-900">
                            {m.name}
                          </span>
                          {m.price > 0 && (
                            <span className="mt-0.5 text-[9px] font-semibold text-amber-600">
                              +{m.price}₸
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Syrup */}
            <div>
              <button
                type="button"
                onClick={() => setShowSyrups(s => !s)}
                className="w-full flex items-center justify-between mb-2"
              >
                <h4 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Сироп
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                  {showSyrups ? 'Скрыть' : 'Показать'}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {showSyrups && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {SYRUPS.map(s => (
                        <button
                          key={s.key}
                          onClick={() =>
                            dispatch({ type: 'SET', field: 'syrupKey', value: s.key })
                          }
                          className={`flex-shrink-0 w-24 rounded-xl p-2 transition ${
                            state.syrupKey === s.key
                              ? 'ring-2 ring-amber-500 bg-amber-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          {s.image && (
                            <img
                              src={s.image}
                              alt={s.name}
                              className="w-10 h-10 mx-auto mb-1 rounded-lg"
                            />
                          )}
                          <span className="block text-[10px] leading-tight line-clamp-2 text-gray-900">
                            {s.name}
                          </span>
                          {s.price > 0 && (
                            <span className="mt-0.5 text-[9px] font-semibold text-amber-600">
                              +{s.price}₸
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer - fixed button */}
          <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2 py-2">
              <button
                onClick={() => dispatch({ type: 'QTY', delta: -1 })}
                disabled={state.quantity === 1}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                -
              </button>
              <span className="w-6 text-center font-semibold text-sm">
                {state.quantity}
              </span>
              <button
                onClick={() => dispatch({ type: 'QTY', delta: 1 })}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-base font-bold shadow-sm"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-gradient-to-r from-black to-gray-800 text-white font-semibold py-3 rounded-xl shadow-lg text-sm hover:from-gray-800 hover:to-gray-700 transition-all active:scale-95"
            >
              + {total} ₸
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
