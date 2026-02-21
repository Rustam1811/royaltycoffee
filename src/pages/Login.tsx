// src/pages/Login.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { fadeSlide } from '../ui/motion';
import PhoneAuth from '../components/PhoneAuth';
import { EnvelopeIcon, UserIcon } from '@heroicons/react/24/outline';

const Cup3D = lazy(() => import('../components/Cup3D'));

type AuthTab = 'client' | 'business';
type AuthMethod = 'select' | 'phone';

const Login: React.FC = () => {
  const { loginWithGoogle, loginWithApple, loginWithEmail, loginWithToken, loading, user } = useAuth();
  const [error, setError] = useState('');
  const [authTab, setAuthTab] = useState<AuthTab>('client');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const prefersReduced = useReducedMotion();
  const history = useHistory();
  const location = useLocation();

  // Редирект после успешного входа
  useEffect(() => {
    if (user) {
      const state = location.state as { redirect?: string } | null;
      
      // Проверяем workshop роли — редирект на /workshop/
      const workshopRoles = ['workshop_admin', 'workshop_client', 'workshop_owner'];
      if (workshopRoles.includes(user.role)) {
        window.location.href = '/workshop/';
        return;
      }
      
      const redirectTo = state?.redirect || (user.role === 'admin' ? '/admin' : '/menu');
      history.replace(redirectTo);
    }
  }, [user, history, location.state]);

  // Если пользователь уже аутентифицирован, сразу редиректим
  useEffect(() => {
    if (user && !loading) {
      const state = location.state as { redirect?: string } | null;
      
      // Проверяем workshop роли — редирект на /workshop/
      const workshopRoles = ['workshop_admin', 'workshop_client', 'workshop_owner'];
      if (workshopRoles.includes(user.role)) {
        window.location.href = '/workshop/';
        return;
      }
      
      const redirectTo = state?.redirect || (user.role === 'admin' ? '/admin' : '/menu');
      history.replace(redirectTo);
    }
  }, [user, loading, history, location.state]);

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа через Google');
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    try {
      await loginWithApple();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа через Apple');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }
    
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  };

  const handlePhoneSuccess = async (token: string, phone: string) => {
    try {
      // loginWithToken should be implemented in AuthContext
      if (loginWithToken) {
        await loginWithToken(token, phone);
      } else {
        // Fallback: store token and reload
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_phone', phone);
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Royal background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/royal-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeSlide(!!prefersReduced)}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl shadow-black/50">
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeSlide(!!prefersReduced)}
            className="text-center mb-8"
          >
            {/* 3D Thermos */}
            <div className="w-36 h-36 mx-auto mb-4">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/images/royal-thermos.webp" alt="Royalty Coffee" className="w-28 h-28 object-contain animate-pulse" />
                </div>
              }>
                <Cup3D className="w-full h-full" />
              </Suspense>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Добро пожаловать</h1>
            <p className="text-white/50">Войдите в свой аккаунт</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Auth Type Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
            <button
              onClick={() => { setAuthTab('client'); setAuthMethod('select'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
                authTab === 'client' 
                  ? 'bg-[#D4AF37] text-black shadow-md' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Клиент
            </button>
            <button
              onClick={() => { setAuthTab('business'); setAuthMethod('select'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
                authTab === 'business' 
                  ? 'bg-[#D4AF37] text-black shadow-md' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <EnvelopeIcon className="w-4 h-4" />
              Для бизнеса
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* CLIENT TAB - WhatsApp/Google/Apple */}
            {authTab === 'client' && authMethod === 'select' && (
              <motion.div
                key="client-select"
                custom={2}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                variants={fadeSlide(!!prefersReduced)}
                className="space-y-3"
              >
                {/* Phone Auth Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthMethod('phone')}
                  className="w-full bg-green-500 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  Войти через WhatsApp
                </motion.button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-white/30">или</span>
                  </div>
                </div>

                {/* Google Auth Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white/10 border border-white/15 text-white font-medium py-4 px-6 rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? 'Вход...' : 'Войти через Google'}
                </motion.button>

                {/* Apple Auth Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {loading ? 'Вход...' : 'Войти через Apple'}
                </motion.button>
              </motion.div>
            )}

            {/* CLIENT TAB - Phone Auth Form */}
            {authTab === 'client' && authMethod === 'phone' && (
              <motion.div
                key="client-phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PhoneAuth 
                  onSuccess={handlePhoneSuccess}
                  onCancel={() => setAuthMethod('select')}
                />
              </motion.div>
            )}

            {/* BUSINESS TAB - Email/Password */}
            {authTab === 'business' && (
              <motion.div
                key="business-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all"
                      autoComplete="email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1.5">
                      Пароль
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all"
                      autoComplete="current-password"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email.trim() || !password.trim()}
                    className="w-full bg-[#D4AF37] text-black font-semibold py-4 px-6 rounded-xl hover:bg-[#C9A632] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Вход...' : 'Войти'}
                  </motion.button>

                  <p className="text-center text-sm text-white/30 mt-4">
                    Для клиентов цеха и партнёров
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeSlide(!!prefersReduced)}
            className="mt-8 text-center"
          >
            <p className="text-sm text-white/30">
              Продолжая, вы соглашаетесь с{' '}
              <a href="#" className="text-[#D4AF37]/70 hover:text-[#D4AF37] hover:underline">условиями использования</a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
