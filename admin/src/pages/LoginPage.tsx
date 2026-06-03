// admin/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { setPersistence, browserLocalPersistence, signInWithEmailAndPassword, getIdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const WORKSHOP_ROLES = ['workshop_admin', 'workshop_owner', 'workshop_client'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass]  = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const em = email.trim().toLowerCase();
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, em, pass.trim());
      // Читаем claims чтобы определить куда редиректить
      const tokenResult = await getIdTokenResult(cred.user, false);
      const role = String(tokenResult.claims?.role || '');
      if (WORKSHOP_ROLES.includes(role)) {
        window.location.replace('/workshop/');
      } else {
        window.location.replace('/admin/users');
      }
    } catch (error) {
      console.error('Email login error', error);
      setErr('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-3xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Вход в админку</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          className="w-full h-11 px-3 border rounded-lg"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={pass}
          onChange={e=>setPass(e.target.value)}
          className="w-full h-11 px-3 border rounded-lg"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </form>
    </div>
  );
}
