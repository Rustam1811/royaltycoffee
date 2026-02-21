import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { EnvelopeIcon, LockClosedIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

/**
 * Страница входа в систему цеха — дизайн в стиле клиентского приложения
 */
const LoginPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Редирект после успешного входа
      const from = (location.state as { from?: string })?.from || '/';
      history.replace(from);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const firebaseError = err as { code?: string };
      
      if (firebaseError.code === 'auth/invalid-credential') {
        setError('Неверный email или пароль');
      } else if (firebaseError.code === 'auth/user-not-found') {
        setError('Пользователь не найден');
      } else if (firebaseError.code === 'auth/wrong-password') {
        setError('Неверный пароль');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('Слишком много попыток. Попробуйте позже');
      } else {
        setError('Ошибка входа. Попробуйте позже');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-orange-100">
          {/* Logo & Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-workshop-500 to-workshop-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
              <BuildingStorefrontIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Цех</h1>
            <p className="text-gray-500">Система заказов для бизнеса</p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-workshop-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-workshop-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-workshop-500 to-workshop-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-workshop-600 hover:to-workshop-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Вход...
                </span>
              ) : (
                'Войти в систему'
              )}
            </motion.button>
          </motion.form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">или</span>
            </div>
          </div>

          {/* Alternative Link */}
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            href="/app"
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-workshop-300 hover:text-workshop-600 transition-all"
          >
            <span className="text-lg">☕</span>
            Вход для клиентов кофейни
          </motion.a>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-400 text-sm mt-6"
        >
          Нет доступа? Обратитесь к администратору
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
