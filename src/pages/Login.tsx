// src/pages/Login.tsx — Clean premium, no gradients
import React, { useState, useEffect, useRef, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { Capacitor } from '@capacitor/core';

const Cup3D = lazy(() => import('../components/Cup3D'));

/** Local error boundary for 3D content — shows static fallback if WebGL/Three.js fails */
class Cup3DErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn('[Cup3D] 3D rendering failed, using fallback:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F4EDE4' }}>
          <span className="text-4xl">☕</span>
        </div>
      );
    }
    return this.props.children;
  }
}

type AuthTab = 'client' | 'business';

/*
  Палитра (flat, zero gradients):
  ─ Фон:       #F4EDE4  (тёплый крем)
  ─ Карточка:  #5A0D17  (бордовый)
  ─ Акцент:    #D4AF37  (золото)
  ─ Текст:     #3D0A11  (тёмный бордо)
  ─ Muted:     #C4B8AA  (серо-кремовый)
*/

const Login: React.FC = () => {
  const { loginWithGoogle, loginWithApple, loginWithEmail, loginWithToken, loading, user } = useAuth();
  const [error, setError] = useState('');
  const [authTab, setAuthTab] = useState<AuthTab>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const history = useHistory();
  const location = useLocation();

  const isNative = Capacitor.isNativePlatform();

  const ease = [0.22, 1, 0.36, 1] as const;

  /* ── Redirects ── */
  useEffect(() => {
    if (user && !loading) {
      console.log('[Login] Redirect logic, user role:', user.role, 'isNative:', isNative);
      const state = location.state as { redirect?: string } | null;
      const workshopRoles = ['workshop_admin', 'workshop_client', 'workshop_owner'];
      if (workshopRoles.includes(user.role)) {
        // Pass uid via URL param so workshop can bootstrap auth immediately
        const uidParam = user.uid ? `?uid=${encodeURIComponent(user.uid)}` : '';
        const redirectUrl = isNative ? `/workshop/index.html${uidParam}` : '/workshop/';
        console.log('[Login] Redirecting to workshop:', redirectUrl);
        window.location.href = redirectUrl;
        return;
      }
      history.replace(state?.redirect || (user.role === 'admin' ? '/admin' : '/'));
    }
  }, [user, loading, history, location.state, isNative]);

  /* ── Auth handlers ── */
  const handleGoogleLogin = async () => {
    setError('');
    try { await loginWithGoogle(); } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка входа через Google'); }
  };
  const handleAppleLogin = async () => {
    setError('');
    try { await loginWithApple(); } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка входа через Apple'); }
  };
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!email.trim() || !password.trim()) { setError('Введите email и пароль'); return; }
    try { await loginWithEmail(email, password); } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка входа'); }
  };


  return (
    <div
      className="flex flex-col min-h-[100dvh]"
      style={{ backgroundColor: '#F4EDE4' }}
    >

      {/* ══════ TOP HALF — кремовый фон, логотип, текст ══════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-safe">

        {/* 3D Thermos */}
        <motion.div
          className="relative mb-6"
          style={{ width: 160, height: 160 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease }}
        >
          {/* Gold ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: '1.5px solid #D4AF37', opacity: 0.25 }}
          />
          {/* 3D Cup inside circle */}
          <div className="absolute inset-[6px] rounded-full overflow-hidden">
            <Cup3DErrorBoundary>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F4EDE4' }}>
                  <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 animate-pulse" />
                </div>
              }>
                <Cup3D className="w-full h-full" />
              </Suspense>
            </Cup3DErrorBoundary>
          </div>
        </motion.div>

        {/* Заголовок */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
        >
          <h1 className="text-[26px] font-extrabold tracking-tight" style={{ color: '#3D0A11' }}>
            Добро пожаловать
          </h1>
          <p className="mt-1.5 text-[13px] tracking-[0.2em] uppercase font-semibold" style={{ color: '#D4AF37' }}>
            Royalty Coffee
          </p>
        </motion.div>
      </div>

      {/* ══════ BOTTOM HALF — бордовая карточка ══════ */}
      <motion.div
        className="px-5 pb-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease }}
      >
        <div className="rounded-[28px] overflow-hidden" style={{ backgroundColor: '#5A0D17' }}>
          <div 
            className="px-6 py-7 space-y-5 transition-all duration-300"
            style={{ paddingBottom: inputFocused ? '280px' : '28px' }}
          >

            {/* Tabs */}
            <div className="flex rounded-2xl p-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              {(['client', 'business'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setAuthTab(tab); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={authTab === tab
                    ? { backgroundColor: '#D4AF37', color: '#3D0A11' }
                    : { color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  {tab === 'client' ? 'Клиент' : 'Бизнес'}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl text-sm overflow-hidden px-4 py-3"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* CLIENT */}
              {authTab === 'client' && (
                <motion.div
                  key="client-select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease }}
                  className="space-y-3"
                >
                  {/* WhatsApp */}
                  {/* Google */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-medium text-[15px] disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: '#ffffff', color: '#1f1f1f', border: '1px solid #dadce0' }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Вход...' : 'Войти через Google'}
                  </motion.button>

                  {/* Apple */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-semibold text-[15px] disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: '#000000', color: '#ffffff', border: '1px solid #000000' }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {loading ? 'Вход...' : 'Войти через Apple'}
                  </motion.button>
                </motion.div>
              )}

              {/* BUSINESS: EMAIL */}
              {authTab === 'business' && (
                <motion.div
                  key="business-email"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease }}
                >
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-[0.15em]" style={{ color: 'rgba(212,175,55,0.5)' }}>Email</label>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        onFocus={() => isNative && setInputFocused(true)}
                        onBlur={() => isNative && setInputFocused(false)}
                        className="w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', focusRingColor: 'rgba(212,175,55,0.3)' } as React.CSSProperties}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-[0.15em]" style={{ color: 'rgba(212,175,55,0.5)' }}>Пароль</label>
                      <input
                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        onFocus={() => isNative && setInputFocused(true)}
                        onBlur={() => isNative && setInputFocused(false)}
                        className="w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' } as React.CSSProperties}
                        autoComplete="current-password"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={loading || !email.trim() || !password.trim()}
                      className="w-full py-4 px-6 rounded-2xl font-bold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#D4AF37', color: '#3D0A11' }}
                    >
                      {loading ? 'Вход...' : 'Войти'}
                    </motion.button>
                    <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Для клиентов цеха и партнёров
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <motion.p
          className="mt-5 text-center text-[11px]"
          style={{ color: '#C4B8AA' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Продолжая, вы соглашаетесь с{' '}
          <a href="#" className="underline" style={{ color: '#A89880' }}>условиями использования</a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
