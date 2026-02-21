import React, { useCallback, useMemo, useState, useEffect, useRef, useContext } from 'react';
import { useCart } from '../../../src/contexts/CartContext';
import { MenuService, MenuCategory, MenuItem } from '@/services/menuService';
import { ShoppingCartIcon, TrashIcon, MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { QRScanner } from '../components/QRScanner';
import { PremiumMenuModal } from '../components/PremiumMenuModal';
import { parseLoyaltyPayload } from '@/utils/parseLoyaltyPayload';
import { UserContext } from '../contexts/UserContext';

// Helper for authenticated API calls
async function callApi(path: string, body: unknown) {
  const base: string = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE || '/api';
  const url = base.replace(/\/$/, '') + path;
  const { auth } = await import('@/lib/firebase');
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail: unknown = null;
    try { detail = await res.json(); } catch { /* ignore */ }
    const err = new Error(`API ${res.status}`) as Error & { status?: number; detail?: unknown };
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return res.json();
}

// Normalize phone number: 8xxx or +7xxx -> +7xxx
const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    return '+7' + cleaned.substring(1);
  }
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  return phone;
};

const getMilkLabel = (key: string | undefined) => {
  const labels: Record<string, string> = {
    regular: '🥛 Обычное',
    oat: '🌾 Овсяное',
    almond: '🌰 Миндальное',
    coconut: '🥥 Кокосовое',
    lactosefree: '🥛 Безлактозное',
  };
  return labels[key || ''] || key || '';
};

export default function PosMenuPage() {
  const { items: cartItems, dispatch } = useCart();
  const { user: adminUser } = useContext(UserContext);
  const posLocationId = adminUser?.locationId || 'royal-main';

  // ─── Firestore data ───
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  
  // Product modal
  const [selectedProduct, setSelectedProduct] = useState<{id: string; name: string; price: number; image: string} | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Customer linking
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
  const [customerLinked, setCustomerLinked] = useState(false);
  const [customerBonus, setCustomerBonus] = useState(0);
  const [loadingBonus, setLoadingBonus] = useState(false);
  const [useBonuses, setUseBonuses] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);

  // ─── Pistol scanner state ───
  const [pistolListen, setPistolListen] = useState(true);
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [pistolToast, setPistolToast] = useState<string | null>(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const scanBufRef = useRef('');
  const scanTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  // Use a ref to call handleCheckout from within handlePistolScan without dep ordering issues
  const checkoutRef = useRef<() => void>(() => {});

  // ─── Pistol scanner: handle scanned QR/barcode ───
  const handlePistolScan = useCallback(async (raw: string) => {
    const parsed = parseLoyaltyPayload(raw);
    if (!parsed) return; // Not a loyalty QR — ignore

    const payload = parsed.uid || parsed.cardId || raw;
    setAutoProcessing(true);

    try {
      let uid: string | undefined;
      let name = 'Клиент';
      let phone = '';
      let bonus = 0;

      try {
        const resp = await callApi('/pos/scan', { payload });
        if (resp?.ok && resp.user?.uid) {
          uid = resp.user.uid;
          name = resp.user.name || 'Клиент';
          phone = resp.user.phone || '';
          bonus = Number(resp.balance) || 0;
        }
      } catch {
        // /pos/scan 404 — fallback to /bonus API
        try {
          const bonusRes = await fetch(`/api/bonus?userId=${encodeURIComponent(payload)}`);
          if (bonusRes.ok) {
            const bonusData = await bonusRes.json();
            if (bonusData.ok) {
              uid = payload;
              name = bonusData.name || 'Клиент';
              phone = bonusData.phone || '';
              bonus = Number(bonusData.balance) || 0;
            }
          }
        } catch { /* ignore */ }
      }

      // Last resort: link by uid even without profile
      if (!uid) uid = payload;

      setTargetUid(uid);
      setCustomerPhone(phone);
      setCustomerName(name);
      setCustomerBonus(bonus);
      setCustomerLinked(true);
      setShowCustomerInput(false);
      setBonusError(null);

      // Show toast
      const msg = `✅ ${name}${phone ? ` (${phone})` : ''} — ${bonus}₸ бонусов`;
      setPistolToast(msg);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setPistolToast(null), 3000);

      // If cart has items → show confirmation toast (barista clicks checkout manually)
      if (cartItems.length > 0) {
        // Don't auto-checkout — let barista review and press the button
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка сканирования';
      setPistolToast(`⚠️ ${msg}`);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setPistolToast(null), 3000);
    } finally {
      setAutoProcessing(false);
    }
  }, [cartItems.length]);

  // ─── Pistol scanner global keydown listener ───
  useEffect(() => {
    if (!pistolListen) {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      scanBufRef.current = '';
      scanTimesRef.current = [];
      lastTimeRef.current = 0;
      return;
    }

    const handleKey = (e: KeyboardEvent) => {
      // Ignore if focus is on an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();

      if (e.key === 'Enter') {
        if (scanBufRef.current.trim().length > 0) {
          const val = scanBufRef.current.trim();
          scanBufRef.current = '';
          scanTimesRef.current = [];
          void handlePistolScan(val);
        }
        return;
      }

      if (e.key.length === 1) {
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => {
          scanBufRef.current = '';
          scanTimesRef.current = [];
        }, 200);

        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;

        scanBufRef.current += e.key;
        if (delta > 0 && delta < 1000) {
          scanTimesRef.current.push(delta);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, [pistolListen, handlePistolScan]);

  // ─── Subscribe to Firestore menu ───
  useEffect(() => {
    const unsubCats = MenuService.listenCategories(setCategories);
    const unsubItems = MenuService.listenItems((items) => {
      // POS only shows available items
      setMenuItems(items.filter(i => i.isAvailable));
      setMenuLoading(false);
    });
    return () => { unsubCats(); unsubItems(); };
  }, []);
  
  // Auto-hide success toast after 2 seconds
  useEffect(() => {
    if (showSuccessModal && orderNumber && orderNumber !== '...') {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, orderNumber]);
  
  // Fetch customer bonus when phone is entered (live search)
  useEffect(() => {
    const fetchBonus = async () => {
      if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
        setCustomerBonus(0);
        setCustomerName('');
        setBonusError(null);
        return;
      }
      
      setLoadingBonus(true);
      setBonusError(null);
      
      try {
        const normalized = normalizePhone(customerPhone);
        const url = `/api/users?action=getByPhone&phone=${encodeURIComponent(normalized)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.ok && data.user) {
          const bonusResponse = await fetch(`/api/bonus?userId=${data.user.id}`);
          if (bonusResponse.ok) {
            const bonusData = await bonusResponse.json();
            if (bonusData.ok && bonusData.balance !== undefined) {
              setCustomerBonus(bonusData.balance);
              setCustomerName(data.user.displayName || data.user.name || '');
              setBonusError(null);
            } else {
              setCustomerName(data.user.displayName || data.user.name || '');
              setCustomerBonus(0);
              setBonusError('Не удалось загрузить бонусы');
            }
          } else {
            setCustomerName(data.user.displayName || data.user.name || '');
            setCustomerBonus(0);
            setBonusError('Не удалось загрузить бонусы');
          }
        } else {
          setBonusError('Клиент не найден');
          setCustomerBonus(0);
          setCustomerName('');
        }
      } catch {
        setBonusError('Ошибка загрузки данных');
        setCustomerBonus(0);
        setCustomerName('');
      } finally {
        setLoadingBonus(false);
      }
    };
    
    const timeoutId = setTimeout(fetchBonus, 500);
    return () => clearTimeout(timeoutId);
  }, [customerPhone]);

  // ─── Filtered items ───
  const filteredItems = useMemo(() => {
    if (activeCategoryId === null) return menuItems;
    return menuItems.filter(item => item.categoryId === activeCategoryId);
  }, [activeCategoryId, menuItems]);

  // Reset category when data changes
  useEffect(() => {
    if (activeCategoryId && !categories.find(c => c.id === activeCategoryId)) {
      setActiveCategoryId(null);
    }
  }, [categories, activeCategoryId]);

  const handleRemoveFromCart = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_ITEM', payload: { id } });
    },
    [dispatch]
  );

  const handleQuantityChange = useCallback(
    (id: string, delta: number) => {
      if (delta > 0) {
        dispatch({ type: 'INCREASE_QUANTITY', payload: id });
      } else {
        dispatch({ type: 'DECREASE_QUANTITY', payload: id });
      }
    },
    [dispatch]
  );

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) return;
    
    const normalizedPhone = customerPhone ? normalizePhone(customerPhone) : null;
    const bonusToUse = useBonuses ? customerBonus : 0;
    const finalTotal = Math.max(0, total - bonusToUse);
    
    const currentCartItems = [...cartItems];
    const currentCustomerName = customerName;
    const currentTargetUid = targetUid;
    
    // Instantly clear UI & show success
    dispatch({ type: 'CLEAR_CART' });
    setCustomerPhone('');
    setCustomerName('');
    setCustomerLinked(false);
    setShowCustomerInput(false);
    setCustomerBonus(0);
    setUseBonuses(false);
    setTargetUid(null);
    setOrderNumber('...'); 
    setShowSuccessModal(true);
    
    // Fire-and-forget order creation via /api/placeOrder
    callApi('/placeOrder', {
      userId: currentTargetUid || 'pos_guest',
      locationId: posLocationId,
      items: currentCartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        sizeKey: item.sizeKey,
        milkKey: item.milkKey,
        syrupKey: item.syrupKey,
      })),
      amount: finalTotal,
      customerName: currentCustomerName || 'POS Клиент',
      customerPhone: normalizedPhone,
      bonusToUse: bonusToUse,
      deliveryType: 'pickup',
    })
      .then(result => {
        if (result.ok) {
          setOrderNumber(result.orderNumberFormatted || String(result.orderNumber));
          
          // If we had a target user, accrue bonuses (1%)
          if (currentTargetUid && finalTotal > 0) {
            const accrueAmount = Math.floor(finalTotal * 0.01);
            if (accrueAmount > 0) {
              callApi('/pos/accrue', {
                uid: currentTargetUid,
                amount: accrueAmount,
                reason: `Покупка в POS ${result.orderNumberFormatted || ''}`.trim(),
              }).catch(() => { /* ignore accrue errors */ });
            }
          }
          
          // Redeem bonuses if used (placeOrder already handles deduction,
          // but POS may also call /pos/redeem for ledger sync)
          // bonusToUse is already deducted by placeOrder endpoint
        } else {
          throw new Error(result.error || 'Ошибка создания заказа');
        }
      })
      .catch(() => {
        setOrderNumber('ERROR');
      });
  }, [cartItems, dispatch, total, customerPhone, customerName, customerBonus, useBonuses, targetUid, posLocationId]);

  // Keep checkoutRef in sync for pistol scanner auto-checkout
  useEffect(() => { checkoutRef.current = handleCheckout; }, [handleCheckout]);

  // ─── Loading state ───
  if (menuLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Загрузка меню…</p>
        </div>
      </div>
    );
  }
  
  // ─── Mobile cart drawer ───
  
  return (
    <div className="absolute inset-0 flex bg-white">
      {/* ══════ CENTER: Menu catalog ══════ */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Меню POS</h1>
                <p className="text-sm text-slate-500">
                  {categories.length} категорий · {menuItems.length} доступных позиций
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Pistol scanner toggle */}
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-slate-900 w-4 h-4"
                    checked={pistolListen}
                    onChange={(e) => setPistolListen(e.target.checked)}
                  />
                  🔫 Пистолет-сканер
                </label>
                {/* Mobile cart button */}
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(true)}
                  className="lg:hidden relative bg-slate-900 text-white rounded-xl px-4 py-3 text-base font-semibold flex items-center gap-2"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartItems.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                  <span className="hidden sm:inline">{total > 0 ? `${total.toLocaleString('ru')} ₸` : 'Корзина'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveCategoryId(null)}
                className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-all ${
                  activeCategoryId === null
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Все ({menuItems.length})
              </button>
              {categories.map((cat) => {
                const count = menuItems.filter(i => i.categoryId === cat.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-all ${
                      activeCategoryId === cat.id
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.icon} {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Products Grid — invisible scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-invisible">
          <div className="mx-auto max-w-6xl">
            {filteredItems.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-400 text-sm">Нет товаров в этой категории</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedProduct({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                      });
                      setShowProductModal(true);
                    }}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all active:scale-95 text-left relative min-h-[180px]"
                  >
                    {/* Badges */}
                    {item.badges && item.badges.length > 0 && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {item.badges.map((badge, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              badge === 'HIT' ? 'bg-red-500 text-white'
                              : badge === 'NEW' ? 'bg-green-500 text-white'
                              : 'bg-amber-500 text-white'
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.isPopular && (!item.badges || item.badges.length === 0) && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                          🔥 ХИТ
                        </span>
                      </div>
                    )}
                    
                    <div className="w-full aspect-square bg-white rounded-xl overflow-hidden mb-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">☕</div>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-gray-900 line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-base font-bold text-amber-600">{item.price.toLocaleString('ru')} ₸</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════ RIGHT: Cart Sidebar ══════ */}
      <aside className="hidden lg:flex w-[360px] flex-shrink-0 flex-col min-h-0 border-l border-slate-200 bg-white">
        {renderCartContent()}
      </aside>

      {/* ═══════════════════════════════════════════ MOBILE: Cart Drawer ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileCartOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[900] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileCartOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-[901] w-full max-w-[400px] bg-white shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h2 className="font-bold text-lg text-slate-900">Корзина</h2>
                <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              {renderCartContent()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════ Toasts & Modals ═══════════════════════════════════════════ */}
      
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessModal && orderNumber && (
          <motion.div
            className="fixed left-1/2 top-6 z-[1000] flex items-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-white shadow-2xl"
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -30, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl">✓</div>
            <div>
              <p className="font-bold text-base">Заказ принят!</p>
              <p className="text-sm text-emerald-100">
                {orderNumber === '...' ? 'Обработка...' : orderNumber === 'ERROR' ? 'Ошибка создания' : `Номер #${orderNumber}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pistol scanner toast */}
      <AnimatePresence>
        {pistolToast && (
          <motion.div
            className="fixed right-4 top-6 z-[1001] rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-2xl max-w-xs"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-sm font-semibold">{pistolToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-processing overlay */}
      <AnimatePresence>
        {autoProcessing && (
          <motion.div
            className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl bg-white px-8 py-6 shadow-2xl text-center">
              <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-sm font-medium text-slate-700">Обработка сканирования…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner */}
      <QRScanner 
        isOpen={scanningQR}
        onClose={() => setScanningQR(false)}
        onScan={async (scannedValue) => {
          try {
            const parsed = parseLoyaltyPayload(scannedValue);
            const payload = parsed?.uid || parsed?.cardId;

            if (!payload) {
              alert(`QR не распознан. Содержимое: ${scannedValue.slice(0, 80)}`);
              setScanningQR(false);
              return;
            }

            let linked = false;

            try {
              const resp = await callApi('/pos/scan', { payload });
              if (resp?.ok && resp.user?.uid) {
                setTargetUid(resp.user.uid);
                setCustomerName(resp.user.name || 'Клиент');
                setCustomerPhone(resp.user.phone || '');
                setCustomerBonus(Number(resp.balance) || 0);
                setCustomerLinked(true);
                setShowCustomerInput(false);
                setBonusError(null);
                linked = true;
              }
            } catch {
              try {
                const bonusRes = await fetch(`/api/bonus?userId=${encodeURIComponent(payload)}`);
                if (bonusRes.ok) {
                  const bonusData = await bonusRes.json();
                  if (bonusData.ok) {
                    setTargetUid(payload);
                    setCustomerName(bonusData.name || 'Клиент');
                    setCustomerPhone(bonusData.phone || '');
                    setCustomerBonus(Number(bonusData.balance) || 0);
                    setCustomerLinked(true);
                    setShowCustomerInput(false);
                    setBonusError(null);
                    linked = true;
                  }
                }
              } catch { /* ignore fallback error */ }
            }

            if (!linked) {
              setTargetUid(payload);
              setCustomerName('Клиент');
              setCustomerPhone('');
              setCustomerBonus(0);
              setCustomerLinked(true);
              setShowCustomerInput(false);
              setBonusError(null);
            }

            setScanningQR(false);
          } catch (err) {
            console.error('QR scan error:', err);
            alert('Ошибка при поиске клиента');
            setScanningQR(false);
          }
        }}
      />

      {/* Premium Menu Modal */}
      <PremiumMenuModal
        item={selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          image: selectedProduct.image,
          categoryId: selectedProduct.id
        } : null}
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        type="drinks"
      />
    </div>
  );

  // ═══════════════════════════════════════════
  // Extracted: shared cart content (sidebar + mobile drawer)
  // ═══════════════════════════════════════════
  function renderCartContent() {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* ═══ BLOCK 1 (FIXED TOP): Header + Customer ═══ */}
        <div className="flex-shrink-0 overflow-hidden">
          {/* Cart header (desktop only — mobile has its own) */}
          <div className="border-b border-slate-100 px-4 py-3 hidden lg:block">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <ShoppingCartIcon className="h-5 w-5" />
                Корзина
              </h2>
              {cartItems.length > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {cartItems.reduce((s, i) => s + i.quantity, 0)} шт
                </span>
              )}
            </div>
          </div>

          {/* ── Customer section ── */}
          <div className="px-4 py-3 border-b border-slate-100">
          {!customerLinked ? (
            <div className="space-y-2">
              {!showCustomerInput ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerInput(true)}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center gap-1.5"
                  >
                    👤 Добавить клиента
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanningQR(true)}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-xl transition hover:bg-slate-200 active:bg-slate-300"
                    title="Сканировать QR"
                  >
                    📷
                  </button>
                </div>
              ) : (
                <div className="space-y-2 bg-white rounded-xl p-3 border border-slate-200">
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
                      autoFocus
                    />
                    {loadingBonus && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {customerPhone.length >= 10 && !loadingBonus && (
                    <div className={`rounded-lg px-3 py-2 text-xs ${
                      bonusError ? 'bg-red-50 text-red-600 border border-red-200' : customerBonus > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {bonusError ? `⚠️ ${bonusError}` : customerBonus > 0 ? `✓ ${customerName || 'Найден'} — 🎁 ${customerBonus} ₸` : 'ℹ️ Новый клиент'}
                    </div>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Имя (опционально)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { if (customerPhone.trim()) setCustomerLinked(true); }}
                      disabled={!customerPhone.trim()}
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
                    >
                      ✓ Привязать
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomerInput(false); setCustomerPhone(''); setCustomerName(''); }}
                      className="rounded-lg bg-white px-4 py-3 text-base font-medium text-slate-600 transition hover:bg-slate-100 border border-slate-200"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Linked customer card */}
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 border border-emerald-200">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  {(customerName || 'К')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-emerald-900 truncate">{customerName || 'Клиент'}</div>
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    {customerPhone && <span>{customerPhone}</span>}
                    {customerBonus > 0 && <span className="font-semibold text-amber-700">🎁 {customerBonus} ₸</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCustomerLinked(false); setCustomerPhone(''); setCustomerName(''); setCustomerBonus(0); setUseBonuses(false); setTargetUid(null); }}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-emerald-100 transition"
                >
                  <XMarkIcon className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
              
              {/* Bonus controls */}
              {loadingBonus ? (
                <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500 text-center border border-slate-100">
                  Загрузка бонусов...
                </div>
              ) : customerBonus > 0 ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setUseBonuses(!useBonuses)}
                    className={`w-full rounded-xl px-4 py-3.5 text-base font-semibold transition-all flex items-center justify-between ${
                      useBonuses
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span>{useBonuses ? '✓ Бонусы списаны' : `🎁 Списать ${customerBonus} ₸`}</span>
                    {useBonuses && <span className="text-emerald-200 text-xs">−{customerBonus} ₸</span>}
                  </button>
                  {useBonuses && (
                    <div className="text-center text-xs text-slate-500">
                      К оплате: <span className="font-bold text-emerald-700">{Math.max(0, total - customerBonus).toLocaleString('ru')} ₸</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500 border border-slate-100 text-center">
                  🎁 Бонусы начислятся после заказа
                </div>
              )}
            </div>
          )}
        </div>
        </div>{/* end BLOCK 1 (fixed top) */}

        {/* ═══ BLOCK 2 (SCROLLABLE MIDDLE): Cart items only ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-invisible">
        <div className="px-4 py-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-300 py-8">
              <ShoppingCartIcon className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">Корзина пуста</p>
              <p className="text-xs mt-1">Нажмите на товар для добавления</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <div className="flex gap-2.5">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                        <span className="text-lg">☕</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1">{item.name}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 active:bg-red-200 transition"
                          title="Удалить"
                        >
                          <TrashIcon className="w-5 h-5 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                      {(item.sizeKey || (item.milkKey && item.milkKey !== 'regular') || (item.syrupKey && item.syrupKey !== '')) && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.sizeKey && (
                            <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{item.sizeKey.toUpperCase()}</span>
                          )}
                          {item.milkKey && item.milkKey !== 'regular' && (
                            <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{getMilkLabel(item.milkKey)}</span>
                          )}
                          {item.syrupKey && item.syrupKey !== '' && (
                            <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.syrupKey.split('+').map(s => s.replace(/_/g, ' ')).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quantity + price row */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition text-slate-600"
                      >
                        <MinusIcon className="w-5 h-5" />
                      </button>
                      <span className="w-8 text-center text-base font-bold text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition text-slate-600"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="text-base font-bold text-slate-900">{(item.price * item.quantity).toLocaleString('ru')} ₸</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>{/* end BLOCK 2 (scrollable middle) */}

        {/* ═══ BLOCK 3 (FIXED BOTTOM): Total + Checkout — ALWAYS visible ═══ */}
        <div className="flex-shrink-0 border-t-2 border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Итого</span>
            <div className="text-right">
              {useBonuses && customerBonus > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">{total.toLocaleString('ru')} ₸</span>
                  <span className="text-xl font-bold text-emerald-600">{Math.max(0, total - customerBonus).toLocaleString('ru')} ₸</span>
                </div>
              ) : (
                <span className="text-xl font-bold text-slate-900">{total.toLocaleString('ru')} ₸</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { handleCheckout(); setMobileCartOpen(false); }}
            disabled={cartItems.length === 0}
            className="w-full rounded-2xl bg-orange-500 px-4 py-5 text-xl font-bold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
          >
            {cartItems.length === 0 ? 'Корзина пуста' : `Оформить заказ · ${(useBonuses ? Math.max(0, total - customerBonus) : total).toLocaleString('ru')} ₸`}
          </button>
        </div>
      </div>
    );
  }
}
