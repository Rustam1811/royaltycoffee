import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../auth/AuthContext';
import { apiUrl } from '../config/api';

const CardPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [level, setLevel] = useState<string>('Новичок');
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid || '';
  const payload = useMemo(() => (uid ? `loyalty:uid=${encodeURIComponent(uid)}&v=1` : ''), [uid]);

  const loadBalance = useCallback(async () => {
    setError(null);
    if (!uid) {
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(apiUrl('bonus', { action: 'user', userId: uid }));
      if (response.ok) {
        const bonusData = await response.json();
        setBalance(bonusData.balance || 0);
        setLevel(bonusData.level || 'Новичок');
        setTotalOrders(bonusData.totalOrders || 0);
      } else {
        console.error('Failed to fetch bonus data:', response.status, await response.text());
        setBalance(0);
      }
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить баланс';
      setError(msg);
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 text-center max-w-sm w-full">
          <h1 className="text-xl font-semibold mb-2">Карта лояльности</h1>
          <p className="text-slate-600">Войдите, чтобы увидеть вашу карту.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white pb-28">
      <header className="sticky top-0 z-10 bg-white p-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <h1 className="text-2xl font-extrabold text-black text-center">Моя карта</h1>
      </header>

      <main className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center max-w-md mx-auto">
          <p className="text-slate-500 text-sm mb-4">Покажите этот код баристе для получения бонусов</p>
          
          <div className="mb-6 p-4 bg-white border-2 border-slate-200 rounded-2xl">
            <QRCodeCanvas value={payload} size={220} includeMargin={true} />
          </div>

          <div className="w-full bg-slate-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Баланс бонусов</p>
                <p className="text-3xl font-bold text-black">{loading ? '...' : balance}</p>
              </div>
              <button
                onClick={() => void loadBalance()}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 transition-all active:scale-95"
              >
                🔄 Обновить
              </button>
            </div>
          </div>

          <div className="w-full flex gap-3 mb-4">
            <div className="flex-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200">
              <p className="text-xs text-amber-700 mb-1">Статус</p>
              <p className="text-lg font-bold text-amber-900">{level}</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1">Заказов</p>
              <p className="text-lg font-bold text-blue-900">{totalOrders}</p>
            </div>
          </div>

          {user.name && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">Владелец карты</p>
              <p className="text-lg font-semibold text-black">{user.name}</p>
              {user.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
            </div>
          )}
        </div>

        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-black mb-2">ℹ️ Как использовать карту</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>1. Покажите QR-код баристе</li>
            <li>2. Бариста отсканирует код</li>
            <li>3. Бонусы будут автоматически начислены</li>
            <li>4. Используйте бонусы при следующих заказах</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default CardPage;
