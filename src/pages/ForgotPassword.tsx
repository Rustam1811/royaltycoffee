// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { apiUrl } from '@/config/api';

const ForgotPassword: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const showErr = (e: unknown, fallback = 'Ошибка') => {
    try {
      if (typeof e === 'string') {
        setErr(e);
      } else if (e && typeof e === 'object') {
        const errorObj = e as Record<string, unknown>;
        const msg = errorObj.message || errorObj.error || fallback;
        setErr(String(msg));
      } else {
        setErr(fallback);
      }
    } catch {
      setErr(fallback);
    }
  };

  const requestOtp = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await fetch(apiUrl('auth', { action: 'sendOtp' }), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ phone }),
      });
      const data = await r.json();
      if (!r.ok) throw data;
      setStep('otp');
    } catch (e) {
      showErr(e, 'Не удалось отправить код');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await fetch(apiUrl('auth', { action: 'resetPassword' }), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ phone, code: otp, newPassword }),
      });
      const data = await r.json();
      if (!r.ok) throw data;
      
      alert('Пароль успешно изменен!');
      window.location.href = '/login';
    } catch (e) {
      showErr(e, 'Не удалось сбросить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Восстановление пароля
        </h1>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {err}
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефона
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (XXX) XXX-XX-XX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              onClick={requestOtp}
              disabled={loading || !phone}
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Отправка...' : 'Отправить код'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Код из WhatsApp
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Введите 6-значный код"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-lg tracking-wider"
                maxLength={6}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Введите новый пароль"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              onClick={resetPassword}
              disabled={loading || !otp || !newPassword}
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Сохранение...' : 'Сбросить пароль'}
            </button>
            <button
              onClick={() => setStep('phone')}
              disabled={loading}
              className="w-full text-gray-600 py-2 text-sm hover:text-gray-800"
            >
              ← Назад
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            Вернуться к входу
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
