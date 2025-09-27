import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

function makeShortCardId(uid: string): string {
  try {
    const cleaned = uid.toLowerCase().replace(/[^0-9a-z]/g, '');
    const tail = cleaned.slice(-6) || cleaned || Date.now().toString(36);
    const n = parseInt(tail, 36);
    return (isNaN(n) ? Date.now() : n).toString(36);
  } catch {
    return Date.now().toString(36);
  }
}

export default function ProfileQR() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [cardId, setCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  const uid = user?.uid || '';
  const payload = useMemo(() => (uid ? `loyalty:uid=${encodeURIComponent(uid)}&v=1` : ''), [uid]);

  // Listen for auth user
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setError(null);
    if (!uid) {
      setBalance(0);
      setCardId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const db = getFirestore();
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      let nextBalance = 0;
      let nextCardId: string | null = null;

      if (snap.exists()) {
        const data = snap.data() as { balance?: unknown; cardId?: unknown };
        nextBalance = typeof data.balance === 'number' ? data.balance : Number(data.balance || 0) || 0;
        nextCardId = typeof data.cardId === 'string' ? data.cardId : null;
      }

      // If no cardId, try to set one (owner can update their own doc; balance unchanged)
      if (!nextCardId) {
        const generated = makeShortCardId(uid);
        try {
          await setDoc(ref, { cardId: generated }, { merge: true });
          nextCardId = generated;
        } catch {
          // MVP: if cannot write, keep using uid as fallback
          nextCardId = uid;
        }
      }

      setBalance(nextBalance);
      setCardId(nextCardId);
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load profile';
      setError(msg);
      setLoading(false);
    }
  }, [uid]);

  // Initial load and when uid changes
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Render barcode when payload available
  useEffect(() => {
    if (!payload || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, payload, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 14,
        width: 2,
        height: 80,
        margin: 8
      });
    } catch {
      // ignore barcode render errors
    }
  }, [payload]);

  if (!user) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-2">Профиль</h1>
        <p>Войдите, чтобы увидеть ваш QR-код лояльности.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Мой QR / Штрихкод</h1>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded shadow p-4 flex flex-col items-center gap-4">
        <div className="text-sm text-gray-600">UID: {uid}</div>
        <div className="text-sm text-gray-600">Карта: {cardId || uid}</div>

        {payload && (
          <div className="flex flex-col items-center gap-3">
            <QRCodeCanvas value={payload} size={192} includeMargin={true} />
            <svg ref={barcodeRef} />
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg">Баланс: <strong>{loading ? '...' : balance}</strong></span>
          <button
            onClick={() => void loadProfile()}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
            disabled={loading}
          >
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
