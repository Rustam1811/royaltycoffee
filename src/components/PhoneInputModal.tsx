// src/components/PhoneInputModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PhoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { sanitizePhone, validateE164, ensurePlusPrefix } from '../utils/phone';

interface PhoneInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string) => Promise<void>;
  userName?: string;
}

export const PhoneInputModal: React.FC<PhoneInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userName
}) => {
  const [phone, setPhone] = useState('+7');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePhone(e.target.value);
    setPhone(sanitized);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneWithPlus = ensurePlusPrefix(phone);
    
    if (!validateE164(phoneWithPlus)) {
      setError('Введите корректный номер телефона в формате +7XXXXXXXXXX');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit(phoneWithPlus);
      setPhone('+7');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении номера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999] pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-md w-full p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Добро пожаловать{userName ? `, ${userName}` : ''}!
                  </h2>
                  <div className="h-1 w-20 bg-slate-900 rounded-full mt-2"></div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200"
                  disabled={loading}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Description */}
              <p className="text-slate-600 mb-6 leading-relaxed">
                Пожалуйста, укажите ваш номер телефона для связи и уведомлений о заказах.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Номер телефона
                  </label>
                  <div className="relative group">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (___) ___-__-__"
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-900 transition-all duration-200 ${
                        error 
                          ? 'border-red-400 bg-red-50/50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-600 font-medium"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-xl shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Продолжить'
                  )}
                </motion.button>
              </form>

              <p className="text-xs text-slate-500 mt-6 text-center leading-relaxed">
                🔒 Ваш номер будет использован только для связи по заказам
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
