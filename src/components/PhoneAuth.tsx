/**
 * Phone Input Component with WhatsApp OTP verification
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestWhatsAppCode, verifyWhatsAppCode, formatPhoneDisplay } from '../services/whatsapp-auth';

interface PhoneAuthProps {
  onSuccess: (token: string, phone: string) => void;
  onCancel?: () => void;
}

type Step = 'phone' | 'code';

export const PhoneAuth: React.FC<PhoneAuthProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Format phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Auto-add +7 for Kazakhstan
    if (value.startsWith('8') && value.length > 1) {
      value = '7' + value.slice(1);
    }
    
    // Limit to 11 digits
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    // Format display
    let formatted = '';
    if (value.length > 0) {
      formatted = '+' + value.slice(0, 1);
    }
    if (value.length > 1) {
      formatted += ' (' + value.slice(1, 4);
    }
    if (value.length > 4) {
      formatted += ') ' + value.slice(4, 7);
    }
    if (value.length > 7) {
      formatted += '-' + value.slice(7, 9);
    }
    if (value.length > 9) {
      formatted += '-' + value.slice(9, 11);
    }
    
    setPhone(formatted);
    setError('');
  };

  // Get raw phone number
  const getRawPhone = useCallback(() => {
    const digits = phone.replace(/\D/g, '');
    return '+' + digits;
  }, [phone]);

  // Request code
  const handleRequestCode = async () => {
    const rawPhone = getRawPhone();
    
    if (rawPhone.length < 12) {
      setError('Введите полный номер телефона');
      return;
    }

    setLoading(true);
    setError('');

    const result = await requestWhatsAppCode(rawPhone);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      if (result.retryAfter) {
        setCountdown(result.retryAfter);
      }
      return;
    }

    setStep('code');
    setCountdown(60); // 60 sec cooldown for resend
    // Focus first code input
    setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (i < 6) newCode[i] = d;
      });
      setCode(newCode);
      codeInputRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify code
  const handleVerifyCode = useCallback(async () => {
    const codeStr = code.join('');
    
    if (codeStr.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyWhatsAppCode(getRawPhone(), codeStr);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      if (result.retryAfter) {
        setCountdown(result.retryAfter);
      }
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
      return;
    }

    if (result.token) {
      onSuccess(result.token, getRawPhone());
    }
  }, [code, getRawPhone, onSuccess]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (code.every(d => d) && code.join('').length === 6) {
      handleVerifyCode();
    }
  }, [code, handleVerifyCode]);

  // Resend code
  const handleResend = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');

    const result = await requestWhatsAppCode(getRawPhone());

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
    }
  };

  // Back to phone input
  const handleBack = () => {
    setStep('phone');
    setCode(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефона
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 text-lg font-medium"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                Код придёт в WhatsApp
              </p>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm"
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={handleRequestCode}
              disabled={loading || phone.replace(/\D/g, '').length < 11}
              className="w-full bg-green-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Отправка...
                </>
              ) : (
                'Получить код'
              )}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full text-gray-500 font-medium py-2 hover:text-gray-700 transition-colors"
              >
                Отмена
              </button>
            )}
          </motion.div>
        )}

        {step === 'code' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <p className="text-gray-600">
                Код отправлен на
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {formatPhoneDisplay(getRawPhone())}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Введите 6-значный код
              </label>
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => codeInputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleCodeChange(index, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0"
                  />
                ))}
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            {loading && (
              <div className="flex justify-center">
                <svg className="animate-spin h-6 w-6 text-green-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}

            <div className="text-center space-y-2">
              <button
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="text-green-600 font-medium hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Отправить повторно (${countdown}с)` : 'Отправить код повторно'}
              </button>
              
              <button
                onClick={handleBack}
                className="block w-full text-gray-500 font-medium py-2 hover:text-gray-700 transition-colors"
              >
                ← Изменить номер
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhoneAuth;
