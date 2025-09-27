import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

const CardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

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
      const db = getFirestore();
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      let nextBalance = 0;
      if (snap.exists()) {
        const data = snap.data() as { balance?: unknown };
        nextBalance = typeof data.balance === 'number' ? data.balance : Number(data.balance || 0) || 0;
      }
      setBalance(nextBalance);
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

  useEffect(() => {
    if (!payload || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, payload, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 16,
        width: 2,
        height: 120,
        margin: 12
      });
    } catch { /* ignore barcode render errors */ }
  }, [payload]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 text-center max-w-sm w-full">
          <h1 className="text-xl font-semibold mb-2">Карта</h1>
          <p className="text-slate-600">Войдите, чтобы увидеть вашу карту лояльности.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Моя карта</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center">
          <div className="mb-4">
            <QRCodeCanvas value={payload} size={200} includeMargin={true} />
          </div>
          <div className="w-full flex items-center justify-center">
            <svg ref={barcodeRef} />
          </div>
          <p className="text-slate-600 text-sm mt-4">Покажите этот код баристе</p>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-lg">Баланс: <strong>{loading ? '...' : balance}</strong></span>
            <button
              onClick={() => void loadBalance()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900 disabled:opacity-60"
            >
              Обновить баланс
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPage;
