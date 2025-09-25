import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { parseLoyaltyPayload } from '@/utils/parseLoyaltyPayload';

// Supports QR and common 1D barcodes (Code128/EAN, etc.)

// Using shared parser from utils/parseLoyaltyPayload

async function fetchBalance(uid: string): Promise<number> {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() as { balance?: unknown };
  return typeof data.balance === 'number' ? data.balance : Number(data.balance || 0) || 0;
}

async function fetchLedger(uid: string) {
  const db = getFirestore();
  const col = collection(db, 'users', uid, 'ledger');
  const q = query(col, orderBy('ts', 'desc'), limit(3));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

async function callApi(path: string, body: unknown) {
  const base: string = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE || '/api';
  const url = base.replace(/\/$/, '') + path;

  // Attach token if available
  const { getAuth: _getAuth } = await import('firebase/auth');
  const token = await _getAuth().currentUser?.getIdToken();

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail: unknown = null;
    try { detail = await res.json(); } catch {}
    const err = new Error(`API ${res.status}`) as Error & { status?: number; detail?: unknown };
    err.status = res.status; err.detail = detail; throw err;
  }
  return res.json();
}

export default function PosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [input, setInput] = useState<string>('');
  const [redeem, setRedeem] = useState<number>(0);
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const hasScanned = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [globalListen, setGlobalListen] = useState<boolean>(true);
  const scanBufRef = useRef<string>('');
  const scanTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const resetTimerRef = useRef<number | null>(null);

  type CartItem = { id: string; name: string; price: number; qty: number };
  const [items, setItems] = useState<CartItem[]>([]);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      // role from custom claims if available
      u?.getIdTokenResult().then(r => setRole((r?.claims as any)?.role || null)).catch(() => setRole(null));
    });
  }, []);

  const forbidden = useMemo(() => {
    return !user || !(['staff', 'admin', 'owner'].includes(String(role)));
  }, [user, role]);

  const handleResolveTarget = useCallback(async (override?: string) => {
    setError(null);
    const raw = (typeof override === 'string' ? override : input || '').trim();
    if (!raw) return;
    setLoading(true);
    try {
      const parsed = parseLoyaltyPayload(raw);
      if (!parsed) {
        throw Object.assign(new Error('Неподдерживаемый код'), { status: 400 });
      }
      const payload = parsed.uid || parsed.cardId || raw;
      const resp = await callApi('/pos/scan', { payload });
      const { uid, balance: apiBalance } = (resp?.data || {}) as { uid: string; balance: number };
      if (!uid) throw new Error('Неподдерживаемый код/пользователь не найден');
      setTargetUid(uid);
      setBalance(Number(apiBalance || 0));
      const lg = await fetchLedger(uid);
      setLedger(lg);
      setInput('');
      // keep focus for next scan
      setTimeout(() => { inputRef.current?.focus(); }, 0);
      // toast
      const idShown = raw.startsWith('loyalty:') ? uid : (parsed?.uid || parsed?.cardId || raw);
      setToast(`Считан ${idShown}, баланс: ${Number(apiBalance || 0)}`);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      const msg = e?.status === 400
        ? 'Неподдерживаемый код'
        : e?.status === 404
          ? 'Пользователь не найден'
          : (e instanceof Error ? e.message : 'Ошибка при поиске');
      setError(msg);
      setInput('');
      setTimeout(() => { inputRef.current?.focus(); }, 0);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const total = useMemo(() => items.reduce((sum, it) => sum + it.price * it.qty, 0), [items]);
  const redeemMax = useMemo(() => Math.min(Math.floor(total * 0.3), balance), [total, balance]);
  const earnDisplay = useMemo(() => {
    const base = Math.max(total - Math.min(redeem, redeemMax), 0);
    return Math.ceil(base * 0.01);
  }, [total, redeem, redeemMax]);

  const addItem = useCallback((name: string, price: number) => {
    if (!name || !isFinite(price) || price <= 0) return;
    setItems(prev => [...prev, { id: uuidv4(), name, price: Math.floor(price), qty: 1 }]);
  }, []);

  const inc = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, qty: it.qty + 1 } : it));
  }, []);

  const dec = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, qty: Math.max(0, it.qty - 1) } : it).filter(it => it.qty > 0));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  const handleQuickSum = useCallback((amount: number) => {
    addItem(`Быстрая сумма ${amount}`, amount);
  }, [addItem]);

  const clampRedeem = useCallback((v: number) => {
    if (!isFinite(v) || v < 0) return 0;
    return Math.min(Math.floor(v), redeemMax);
  }, [redeemMax]);

  useEffect(() => {
    setRedeem(prev => clampRedeem(prev));
  }, [redeemMax, clampRedeem]);

  const humanizeError = (status?: number): string => {
    if (status === 401 || status === 403) return 'Недостаточно прав для операции';
    if (status === 404) return 'Пользователь не найден';
    if (status === 422 || status === 400) return 'Нарушены лимиты операции';
    return 'Внутренняя ошибка сервера';
  };

  const doConfirm = useCallback(async () => {
    if (!targetUid) return;
    if (total <= 0) return;
    setProcessing(true); setError(null);
    try {
      const storeId = 'main';
      const orderId = uuidv4();
      const totalAmount = Math.floor(total);
      const toRedeem = clampRedeem(redeem);
      let newBalance = balance;

      if (toRedeem > 0) {
        const redeemBody = {
          uid: targetUid,
          orderTotal: totalAmount,
          bonusesUsed: toRedeem,
          storeId,
          idempotencyKey: uuidv4(),
          orderId
        };
        const r = await callApi('/pos/redeem', redeemBody);
        newBalance = Number(r?.data?.balance ?? newBalance);
      }

      const baseForEarn = Math.max(totalAmount - toRedeem, 0);
      const bonusesEarned = Math.ceil(baseForEarn * 0.01);

      if (bonusesEarned > 0 || baseForEarn >= 0) {
        const accrueBody = {
          uid: targetUid,
          orderTotal: baseForEarn,
          bonusesEarned,
          storeId,
          idempotencyKey: uuidv4(),
          orderId
        };
        const a = await callApi('/pos/accrue', accrueBody);
        newBalance = Number(a?.data?.balance ?? newBalance);
      }

      setBalance(newBalance);
      const lg = await fetchLedger(targetUid);
      setLedger(lg);

      setToast(`Начислено +${Math.ceil(Math.max(total - toRedeem, 0) * 0.01)} / Списано −${toRedeem}. Новый баланс: ${newBalance}`);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);

      setItems([]);
      setRedeem(0);
      setInput('');
      setTargetUid(null);
      setTimeout(() => { inputRef.current?.focus(); }, 0);
    } catch (e: any) {
      const msg = humanizeError(e?.status);
      setError(msg);
    } finally {
      setProcessing(false);
    }
  }, [targetUid, total, redeem, clampRedeem, balance]);

  // Start/stop camera scanner
  useEffect(() => {
    async function startScanner() {
      if (!videoRef.current) return;
      try {
        hasScanned.current = false;
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        let deviceId: string | undefined = undefined;
        if (devices && devices.length) {
          const back = devices.find(d => /back|rear|environment/i.test(d.label));
          deviceId = (back || devices[devices.length - 1]).deviceId;
        }

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err, controls) => {
            if (controls && !scannerControls.current) {
              scannerControls.current = controls;
            }
            if (result && !hasScanned.current) {
              hasScanned.current = true;
              const text = result.getText();
              setInput(text);
              setScanning(false); // close UI
              // Give UI a tick to close, then resolve
              setTimeout(() => {
                void handleResolveTarget(text);
              }, 0);
            }
          }
        );
        scannerControls.current = controls;
      } catch (e) {
        setError('Не удалось запустить камеру. Разрешите доступ или используйте ввод вручную.');
        setScanning(false);
      }
    }

    if (scanning) {
      void startScanner();
    } else {
      if (scannerControls.current) {
        try { scannerControls.current.stop(); } catch {}
        scannerControls.current = null;
      }
    }

    return () => {
      if (scannerControls.current) {
        try { scannerControls.current.stop(); } catch {}
        scannerControls.current = null;
      }
    };
  }, [scanning, handleResolveTarget]);

  // Keep the input focused on mount and after role/user resolved
  useEffect(() => {
    inputRef.current?.focus();
  }, [user, role]);

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  // Global pistol-scanner listener
  useEffect(() => {
    if (!globalListen) return;

    const resetBuffer = () => {
      scanBufRef.current = '';
      scanTimesRef.current = [];
      lastTimeRef.current = 0;
    };

    const scheduleReset = () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        resetBuffer();
      }, 300);
    };

    const onKeyPress = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active === inputRef.current) return; // our input handles its own

      // Only buffer printable characters
      if (e.key && e.key.length === 1) {
        const now = performance.now();
        if (lastTimeRef.current && now - lastTimeRef.current > 300) {
          resetBuffer();
        }
        if (lastTimeRef.current) {
          scanTimesRef.current.push(now - lastTimeRef.current);
        }
        lastTimeRef.current = now;
        scanBufRef.current += e.key;
        scheduleReset();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active === inputRef.current) return;
      if (e.key !== 'Enter') return;

      const s = scanBufRef.current.trim();
      if (!s) return;
      const isRapid = scanTimesRef.current.length > 0 && scanTimesRef.current.every((d) => d <= 50);
      if (isRapid) {
        e.preventDefault();
        e.stopPropagation();
        const payload = s;
        resetBuffer();
        setTimeout(() => { inputRef.current?.focus(); }, 0);
        void handleResolveTarget(payload);
      } else {
        resetBuffer();
      }
    };

    window.addEventListener('keypress', onKeyPress, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keypress', onKeyPress as any);
      window.removeEventListener('keydown', onKeyDown as any);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      scanBufRef.current = '';
      scanTimesRef.current = [];
      lastTimeRef.current = 0;
    };
  }, [globalListen, handleResolveTarget]);

  if (forbidden) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">POS</h1>
        <p>Доступ запрещён. Войдите под учетной записью сотрудника.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">POS — Сканирование и операции</h1>
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-emerald-600 text-white px-4 py-2 rounded shadow">
            {toast}
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
            onClick={() => setScanning(s => !s)}
          >
            {scanning ? 'Остановить сканер' : 'Сканировать'}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              className="accent-indigo-600"
              checked={globalListen}
              onChange={(e) => setGlobalListen(e.target.checked)}
            />
            Слушать пистолет глобально
          </label>
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="UID или Card ID"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            ref={inputRef}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleResolveTarget();
              }
            }}
          />
          <button
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
            onClick={() => void handleResolveTarget()}
            disabled={loading}
          >
            Найти
          </button>
        </div>
        <p className="text-xs text-gray-500">Поддерживается формат QR payload: loyalty:uid=&lt;uid&gt;&amp;v=1</p>

        {scanning && (
          <div className="mt-3 border rounded overflow-hidden relative">
            <video ref={videoRef} className="w-full h-[320px] object-cover bg-black" muted playsInline />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-10 border-2 border-emerald-400/80 rounded" />
            </div>
            <div className="p-2 text-xs text-gray-600">Наведите камеру на QR или штрихкод. При успешном скане ввод заполнится автоматически.</div>
          </div>
        )}
      </div>

      {targetUid && (
        <div className="bg-white rounded shadow p-4 space-y-4">
          <div className="flex items-center gap-6">
            <div className="text-sm">UID: <strong>{targetUid}</strong></div>
            <div className="text-sm">Баланс: <strong>{loading ? '...' : balance}</strong></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Меню / Корзина</div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Название</label>
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Напиток / позиция"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-sm mb-1">Цена</label>
                  <input
                    type="number"
                    min={0}
                    className="border rounded px-2 py-1 w-full"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <button
                  className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-black text-sm"
                  onClick={() => {
                    const price = Math.floor(Number(newItemPrice) || 0);
                    if (newItemName && price > 0) {
                      addItem(newItemName.trim(), price);
                      setNewItemName('');
                      setNewItemPrice('');
                    }
                  }}
                  disabled={processing}
                >
                  Добавить
                </button>
              </div>

              <div className="border rounded divide-y">
                {items.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">Корзина пуста</div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{it.name}</div>
                        <div className="text-xs text-gray-500">{it.price} × {it.qty} = {it.price * it.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sm" onClick={() => dec(it.id)} disabled={processing}>−</button>
                        <span className="w-8 text-center text-sm">{it.qty}</span>
                        <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sm" onClick={() => inc(it.id)} disabled={processing}>+</button>
                        <button className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 text-sm" onClick={() => removeItem(it.id)} disabled={processing}>Удалить</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Быстрые суммы:</span>
                {[1000, 2000, 3000].map(v => (
                  <button key={v} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-sm" onClick={() => handleQuickSum(v)} disabled={processing}>{v}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Оплата</div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Итого</div>
                <div className="text-lg font-semibold">{total}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">Списать бонусов</label>
                <input
                  type="number"
                  min={0}
                  className="border rounded px-2 py-1 w-full"
                  value={redeem}
                  onChange={(e) => setRedeem(clampRedeem(Number(e.target.value) || 0))}
                  disabled={processing}
                />
                <div className="text-xs text-gray-500 mt-1">макс {redeemMax}</div>
              </div>
              <div className="text-sm text-gray-600">Начисление ≈ {earnDisplay} (1% от суммы после списания)</div>

              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
                  onClick={() => void doConfirm()}
                  disabled={processing || !targetUid || total <= 0}
                >
                  {processing ? 'Обработка…' : 'Подтвердить'}
                </button>
                <button
                  className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                  onClick={() => { setItems([]); setRedeem(0); }}
                  disabled={processing}
                >
                  Очистить корзину
                </button>
              </div>

              <div className="pt-2">
                <div className="text-sm font-medium mb-2">Последние операции</div>
                {ledger.length === 0 ? (
                  <div className="text-sm text-gray-500">Нет операций</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {ledger.map((e) => (
                      <li key={e.id} className="flex items-center justify-between border-b last:border-b-0 py-1">
                        <span>{e.type}</span>
                        <span>{e.amount}</span>
                        <span className="text-xs text-gray-500">{e.ts}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
