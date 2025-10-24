import React, { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  GiftIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useCart, CartItem } from "../contexts/CartContext";
import QRCode from "../components/QRCode";
import OrderStatusBadge from "../components/OrderStatusBadge";
import DeliveryAddressForm from "../components/DeliveryAddressForm";
import { apiUrl } from "../config/api";
import { safeApiRequestWithRetry } from "../utils/api";
import { useAuth } from "../auth/AuthContext";
import { generateClientRequestId } from "../utils/uuid";
import { useDelivery } from "../hooks/useDelivery";
import { formatDeliveryTime } from "../services/deliveryService";
import type { DeliveryInfo } from "../types/delivery";

interface PromoCode { code: string; description?: string; expiresAt?: string | Date; isUsed?: boolean; type?: 'fixed' | 'percentage'; discount?: number; }
interface OrderItemLite { name: string; quantity: number; price: number; sizeKey?: string; milkKey?: string; syrupKey?: string; }
interface ListedOrder { 
  id: string; 
  orderNumberDisplay?: string; 
  amount: number; 
  status?: 'pending'|'accepted'|'ready'|'completed'|'test'|'unknown'; 
  date?: string | number | Date; 
  items?: OrderItemLite[]; 
  deliveryType?: 'pickup' | 'delivery';
}

// Types for API responses (to avoid any)
type ApiOrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
  sizeKey?: string;
  milkKey?: string;
  syrupKey?: string;
};

type ApiOrder = {
  id: string;
  orderNumberDisplay?: string;
  items?: ApiOrderItem[];
  amount?: number;
  totalAmount?: number;
  status?: string;
  date?: string;
  createdAt?: { seconds?: number } | string | number | null;
  deliveryType?: 'pickup' | 'delivery';
};

// RU labels for modifier keys (fallback to raw key)
const MILK_LABELS: Record<string, string> = {
  regular: 'Обычное', oat: 'Овсяное', almond: 'Миндальное', coconut: 'Кокосовое', lactosefree: 'Безлактозное',
};
const SYRUP_LABELS: Record<string, string> = {
  vanilla: 'Ваниль', caramel: 'Карамель', hazelnut: 'Орех', coconut: 'Кокос', mint: 'Мята', banana: 'Банан',
};
const SIZE_LABELS: Record<string, string> = {
  s: 'Маленький', m: 'Средний', l: 'Большой', single: 'Одинарный', double: 'Двойной', '250ml': '250 мл', '350ml': '350 мл', '450ml': '450 мл',
};
const labelMilk = (k?: string) => (k ? (MILK_LABELS[k] || k) : undefined);
const labelSyrup = (k?: string) => (k ? (SYRUP_LABELS[k] || k) : undefined);
const labelSize = (k?: string) => (k ? (SIZE_LABELS[k] || k) : undefined);

// ———————————————————————————————————————————————
// Карточка товара (светлая тема + мягкие тени)
const CartItemCard = ({
  item,
  onUpdateQuantity,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
    className="elev-card overflow-hidden p-4 flex items-center gap-4 rounded-2xl"
  >
    {item.image && (
      <img
        src={item.image}
        alt={item.name}
        className="w-16 h-16 rounded-lg object-contain bg-slate-50 p-1 flex-shrink-0"
      />
    )}
    <div className="flex-grow min-w-0">
      <p className="font-bold text-slate-900 truncate">{item.name}</p>
      <p className="text-sm text-slate-500">{item.price} ₸ / шт.</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={() => onUpdateQuantity(item.id, -1)}
        className="w-8 h-8 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
      >
        <MinusIcon className="w-5 h-5 mx-auto" />
      </button>
      <span className="w-8 text-center font-bold text-lg text-slate-900">
        {item.quantity}
      </span>
      <button
        onClick={() => onUpdateQuantity(item.id, 1)}
        className="w-8 h-8 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors"
      >
        <PlusIcon className="w-5 h-5 mx-auto" />
      </button>
    </div>
  </motion.div>
);

// ———————————————————————————————————————————————
// Пустая корзина (светлая + бренд-акцент)
const EmptyCartState = ({ onGoToMenu }: { onGoToMenu: () => void }) => (
  <div className="flex flex-col items-center gap-4 text-center py-16">
    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-amber-50 border border-amber-200">
      <ShoppingCartIcon className="w-12 h-12 text-amber-500" />
    </div>
    <h3 className="text-xl font-extrabold text-slate-900">Ваша корзина пуста</h3>
    <p className="text-slate-500 max-w-xs">
      Самое время добавить что-нибудь вкусное из меню.
    </p>
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onGoToMenu}
      className="mt-2 bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl shadow-[0_14px_36px_-14px_rgba(0,0,0,.45)] hover:bg-black transition-colors"
    >
      Перейти в меню
    </motion.button>
  </div>
);

// ———————————————————————————————————————————————
// Страница заказа (переставил секции местами)
const Order: React.FC = () => {
  const history = useHistory();
  const { items, dispatch } = useCart();
  const { user, showPhoneInput } = useAuth();
  
  const [bonusData, setBonusData] = useState({
    balance: 0,
    level: "Новичок",
    multiplier: 1.0,
  });
  const [bonusToUse, setBonusToUse] = useState(0);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showPromoCodes, setShowPromoCodes] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<ListedOrder[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{ id: string; amount: number } | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  
  // Calculate order amount
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  
  // Delivery hook with comprehensive state management
  const delivery = useDelivery(subtotal, {
    initialType: 'pickup',
    autoGeocode: true,
  });
  
  // Total amount including delivery fee
  const deliveryFee = delivery.type === 'delivery' && delivery.fee ? delivery.fee.total : 0;
  const amount = subtotal + deliveryFee;

  // быстрый заказ из Home
  useEffect(() => {
    const state = history.location.state as { quickOrder?: boolean; selectedItem?: { name: string; price: number; image?: string } } | undefined;
    if (state?.quickOrder && state?.selectedItem) {
      const quickItem = {
        id: String(Date.now()),
        name: state.selectedItem.name,
        price: state.selectedItem.price,
        image: state.selectedItem.image,
        quantity: 1,
      };
      dispatch({ type: "ADD_ITEM", payload: quickItem });
      history.replace("/order", {});
    }
  }, [history, dispatch]);
  // Бонусы начисляются сервером: 1% от суммы заказа (без учёта использованных бонусов)
  const bonusEarned = Math.floor(amount * 0.01);

  const getUserId = () => {
    if (user?.uid) return user.uid;
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const u = JSON.parse(userData);
        return u.phone || u.id || "87053096206";
      }
    } catch (e) {
      console.error("Ошибка парсинга user из localStorage:", e);
    }
    return "87053096206";
  };
  const userId = getUserId();

  // загрузки
  const fetchOrders = useCallback(async () => {
    try {
      const result = await safeApiRequestWithRetry<ApiOrder[]>('orders', { action: 'get', userId });
      
      if (!result.success) {
        console.error("Ошибка загрузки заказов:", result.error);
        setOrders([]);
        return;
      }

      const data = result.data;
      if (!data) {
        setOrders([]);
        return;
      }

      const toIso = (o: { createdAt?: unknown; date?: unknown }) => {
        const createdAt = o.createdAt;
        if (createdAt && typeof createdAt === 'object' && createdAt !== null && 'seconds' in (createdAt as Record<string, unknown>)) {
          const secs = (createdAt as { seconds?: number }).seconds;
          if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
        }
        if (typeof o.createdAt === 'string') return new Date(o.createdAt).toISOString();
        if (typeof o.date === 'string') return new Date(o.date).toISOString();
        return new Date().toISOString();
      };

      const raw: ApiOrder[] = Array.isArray(data) ? data : ((data as { orders?: ApiOrder[] }).orders || []);
      const normalized: ListedOrder[] = raw.map((o) => ({
        id: o.id,
        orderNumberDisplay: o.orderNumberDisplay,
        amount: o.amount ?? o.totalAmount ?? 0,
        status: (o.status as ListedOrder['status']) || 'pending',
        date: o.date || toIso({ createdAt: o.createdAt, date: o.date }),
        deliveryType: o.deliveryType || 'pickup',
        items: (o.items ?? []).map((it) => ({
          name: it.name ?? '',
          quantity: it.quantity ?? 0,
          price: it.price ?? 0,
          sizeKey: it.sizeKey,
          milkKey: it.milkKey,
          syrupKey: it.syrupKey,
        }))
      }));
      setOrders(normalized);
    } catch (error) {
      console.error("Критическая ошибка загрузки заказов:", error);
      setOrders([]);
    }
  }, [userId]);

  const fetchBonusData = useCallback(async () => {
    try {
      const result = await safeApiRequestWithRetry('bonus', { action: 'user', userId });
      
      if (!result.success) {
        console.error("Ошибка загрузки бонусных данных:", result.error);
        setBonusData(null);
        return;
      }

      if (result.data) {
        setBonusData(result.data as { balance: number; level: string; multiplier: number });
      }
    } catch (error) {
      console.error("Критическая ошибка загрузки бонусных данных:", error);
      setBonusData(null);
    }
  }, [userId]);

  const fetchPromoCodes = useCallback(async () => {
    try {
      const result = await safeApiRequestWithRetry<PromoCode[]>('promo', { action: 'codes', userId });
      
      if (!result.success) {
        console.error("Ошибка загрузки промокодов:", result.error);
        setPromoCodes([]);
        return;
      }

      if (!result.data) {
        setPromoCodes([]);
        return;
      }

      setPromoCodes(
        result.data.filter(
          (code: PromoCode) => !code.isUsed && new Date(code.expiresAt || 0) > new Date()
        )
      );
    } catch (error) {
      console.error("Критическая ошибка загрузки промокодов:", error);
      setPromoCodes([]);
    }
  }, [userId]);

  useEffect(() => {
    fetchOrders();
    fetchBonusData();
    fetchPromoCodes();
    const interval = setInterval(() => {
      fetchOrders();
      fetchBonusData();
      fetchPromoCodes();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchBonusData, fetchPromoCodes]);

  // изменения количества
  const handleUpdateQuantity = useCallback(
    (id: string, delta: number) => {
      const type = delta > 0 ? "INCREASE_QUANTITY" : "DECREASE_QUANTITY";
      dispatch({ type, payload: id });
    },
    [dispatch]
  );

  // оформление заказа
  const handleOrder = async () => {
    if (items.length === 0) return;
    
    // Проверка наличия телефона - показываем модалку если нет
    if (!user?.phone) {
      showPhoneInput();
      setToastMessage('Для оформления заказа укажите номер телефона');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    // Проверка готовности доставки
    if (delivery.type === 'delivery' && !delivery.isReady) {
      setToastMessage('Пожалуйста, заполните адрес доставки');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    setLoading(true);
    try {
      // Генерируем clientRequestId для идемпотентности
      const clientRequestId = generateClientRequestId();
      
      // Prepare delivery info
      const deliveryInfo: DeliveryInfo = {
        type: delivery.type,
        ...(delivery.type === 'delivery' && {
          address: delivery.address,
          timeSlot: delivery.timeSlot || undefined,
          fee: delivery.fee || undefined,
          phone: user?.phone,
        }),
      };
      
      const orderData = {
        userId,
        clientRequestId,
        customerName: user?.name || 'Клиент',
        customerPhone: user?.phone,
        deliveryType: delivery.type, // 'pickup' или 'delivery'
        deliveryInfo, // Full delivery details
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          // pass modifiers if present
          sizeKey: item.sizeKey,
          milkKey: item.milkKey,
          syrupKey: item.syrupKey,
        })),
        amount: Math.max(0, amount - bonusToUse),
        bonusToUse: bonusToUse,
        customerInfo: {},
      };

      const response = await fetch(apiUrl('placeOrder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok) {
        const newId: string = result?.order?.id || result?.orderId;
        const total: number = result?.order?.amount || result?.order?.totalAmount || orderData.amount;
        const status: string = result?.order?.status || 'pending';
        
        if (newId) {
          setLastPlaced({ id: newId, amount: total });
          // QR код показываем только для готовых заказов
          if (status === 'ready') {
            setQrPayload(JSON.stringify({ type: 'ORDER', id: newId, total }));
            setQrOpen(true);
          }
        }

        dispatch({ type: 'CLEAR_CART' });
        setBonusToUse(0);
        await fetchOrders();
        await fetchBonusData();
        await fetchPromoCodes();

        // Показываем соответствующее сообщение в зависимости от статуса
        const message = result.message || `Заказ #${newId.slice(-8)} принят! Ожидайте подтверждения.`;
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else {
        setToastMessage('Ошибка при оформлении заказа: ' + (result.error || 'Неизвестная ошибка'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Ошибка заказа:', error);
      setToastMessage('Ошибка при оформлении заказа');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white text-slate-900">
      {/* светлый хедер */}
      <header className="p-5 bg-white/70 backdrop-blur-md sticky top-0 z-10 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-extrabold text-center">Ваш заказ</h1>
      </header>

      <main className="p-5 space-y-8 pb-28">
        {/* КОРЗИНА (сверху) */}
        <section>
          <h2 className="text-lg font-extrabold tracking-tight mb-3">Корзина</h2>

          <AnimatePresence>
            {items.length === 0 ? (
              <EmptyCartState onGoToMenu={() => history.push("/menu")} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <motion.ul layout className="space-y-3">
                  {items.map((it: CartItem) => (
                    <CartItemCard
                      key={it.id}
                      item={it}
                      onUpdateQuantity={handleUpdateQuantity}
                    />
                  ))}
                </motion.ul>

                {/* БОНУСЫ */}
                <div className="elev-card rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="w-6 h-6 text-amber-500" />
                      <span className="font-bold">Ваши бонусы</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-amber-600">
                        {bonusData.balance}
                      </div>
                      <div className="text-xs text-slate-500">{bonusData.level}</div>
                    </div>
                  </div>

                  {bonusData.balance > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Использовать бонусы:</span>
                        <span className="text-amber-600 font-bold">
                          {bonusToUse} ₸
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.min(bonusData.balance, amount)}
                        value={bonusToUse}
                        disabled={loading}
                        onChange={(e) => setBonusToUse(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>0</span>
                        <span>Макс: {Math.min(bonusData.balance, amount)} ₸</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ПРОМОКОДЫ */}
                {promoCodes.length > 0 && (
                  <div className="elev-card rounded-2xl p-4">
                    <button
                      onClick={() => setShowPromoCodes(!showPromoCodes)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <GiftIcon className="w-6 h-6 text-amber-500" />
                        <span className="font-bold">
                          Ваши промокоды ({promoCodes.length})
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {showPromoCodes ? "▼" : "▶"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showPromoCodes && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 space-y-2"
                        >
                          {promoCodes.map((code: PromoCode) => (
                            <div
                              key={code.code}
                              className="rounded-xl p-3 bg-amber-50 border border-amber-200 flex justify-between items-center"
                            >
                              <div>
                                <div className="font-extrabold text-amber-700">
                                  {code.code}
                                </div>
                                <div className="text-sm text-amber-800/80">
                                  {code.description}
                                </div>
                                <div className="text-xs text-amber-700/70">
                                  До {new Date(code.expiresAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-extrabold text-emerald-600">
                                  {code.type === "fixed"
                                    ? `${code.discount}₸`
                                    : `${code.discount}%`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ИТОГО */}
                <div className="elev-card rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Сумма товаров</span>
                    <span className="font-semibold text-slate-900">{subtotal} ₸</span>
                  </div>
                  {delivery.type === 'delivery' && delivery.fee && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Доставка</span>
                      <span className="font-semibold text-slate-900">
                        {delivery.fee.total === 0 ? (
                          <span className="text-emerald-600">Бесплатно</span>
                        ) : (
                          `${delivery.fee.total} ₸`
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Бонусы к начислению</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <SparklesIcon className="w-4 h-4" />
                      +{bonusEarned} (x{bonusData.multiplier})
                    </span>
                  </div>
                  {bonusToUse > 0 && (
                    <>
                      <div className="border-t border-slate-200 my-2" />
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Списать бонусы</span>
                        <span className="font-semibold text-amber-600">
                          -{bonusToUse} ₸
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-slate-200 my-2" />
                  <div className="flex justify-between items-center font-extrabold text-xl">
                    <span>Итого к оплате</span>
                    <span>{amount - bonusToUse} ₸</span>
                  </div>
                </div>

                {/* ПЕРЕКЛЮЧАТЕЛЬ ДОСТАВКИ/САМОВЫВОЗА */}
                <div className="elev-card rounded-2xl p-4">
                  <div className="text-sm font-bold text-slate-700 mb-3">Способ получения:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => delivery.setType('pickup')}
                      disabled={loading}
                      className={`relative px-4 py-4 rounded-xl font-semibold text-sm transition-all ${
                        delivery.type === 'pickup'
                          ? 'bg-slate-900 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🏪</div>
                      <div>Самовывоз</div>
                    </button>
                    <button
                      onClick={() => delivery.setType('delivery')}
                      disabled={loading}
                      className={`relative px-4 py-4 rounded-xl font-semibold text-sm transition-all ${
                        delivery.type === 'delivery'
                          ? 'bg-slate-900 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🚗</div>
                      <div>Доставка</div>
                    </button>
                  </div>
                </div>

                {/* АДРЕС ДОСТАВКИ (показывать только если выбрана доставка) */}
                <AnimatePresence mode="wait">
                  {delivery.type === 'delivery' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="elev-card rounded-2xl p-4 overflow-hidden"
                    >
                      <div className="text-sm font-bold text-slate-700 mb-4">Адрес доставки:</div>
                      <DeliveryAddressForm
                        address={delivery.address}
                        onChange={delivery.setAddress}
                        validation={delivery.validation}
                        disabled={loading}
                        isProcessing={delivery.isProcessing}
                      />
                      
                      {/* Delivery Fee Info */}
                      {delivery.fee && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm text-slate-700">
                              <span className="font-semibold">Стоимость доставки</span>
                              <div className="text-xs text-slate-500 mt-1">
                                {delivery.fee.zone.name} • {formatDeliveryTime(delivery.fee.estimatedTime)}
                              </div>
                            </div>
                            <span className="text-lg font-bold text-slate-900">
                              {delivery.fee.total === 0 ? (
                                <span className="text-emerald-600">Бесплатно</span>
                              ) : (
                                `${delivery.fee.total} ₸`
                              )}
                            </span>
                          </div>
                          {delivery.fee.total > 0 && (
                            <div className="text-xs text-slate-500 space-y-1">
                              {delivery.fee.baseFee > 0 && (
                                <div>Базовый тариф: {delivery.fee.baseFee} ₸</div>
                              )}
                              {delivery.fee.distanceSurcharge > 0 && (
                                <div>За расстояние: +{delivery.fee.distanceSurcharge} ₸</div>
                              )}
                              {delivery.fee.timeSurcharge > 0 && (
                                <div>Ночной тариф: +{delivery.fee.timeSurcharge} ₸</div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleOrder}
                  disabled={loading || (delivery.type === 'delivery' && !delivery.isReady)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold text-lg py-4 rounded-xl shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] active:shadow-none transition-colors flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? (
                    <ArrowPathIcon className="w-6 h-6 animate-spin" />
                  ) : (
                    "Оплатить"
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ИСТОРИЯ ЗАКАЗОВ (скрыта под кнопкой) */}
        <section className="pb-2">
          <button
            onClick={() => setShowOrderHistory(!showOrderHistory)}
            className="w-full flex items-center justify-between text-lg font-extrabold tracking-tight mb-3 text-slate-900 hover:text-slate-700 transition-colors"
          >
            <span>Мои заказы {orders.length > 0 && `(${orders.length})`}</span>
            {showOrderHistory ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
          
          <AnimatePresence>
            {showOrderHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {orders.length === 0 ? (
                  <div className="text-slate-500">Нет заказов</div>
                ) : (
                  <ul className="space-y-3">
                    {orders.map((order: ListedOrder) => (
                      <li key={order.id} className="elev-card rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-extrabold text-slate-900">
                            Заказ #{order.orderNumberDisplay || String(order.id).slice(-6)}
                          </span>
                          <OrderStatusBadge
                            status={
                              order.status as "pending" | "accepted" | "ready" | "completed"
                            }
                            deliveryType={order.deliveryType}
                          />
                        </div>
                        <div className="text-sm text-slate-700 mb-1">
                          Сумма:{" "}
                          <span className="font-semibold text-slate-900">
                            {order.amount} ₸
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                          {order.deliveryType === 'delivery' ? (
                            <>🚗 Доставка</>
                          ) : (
                            <>🏪 Самовывоз</>
                          )}
                        </div>
                        {!!order.items?.length && (
                          <div className="mt-2 bg-slate-50 rounded-xl p-2">
                            <div className="text-xs font-semibold text-slate-500 mb-1">Состав заказа:</div>
                            <ul className="space-y-1">
                              {order.items.map((it, idx) => (
                                <li key={idx} className="flex justify-between gap-2 text-xs">
                                  <div className="min-w-0">
                                    <div className="text-slate-900 whitespace-normal break-words">
                                      {it.name} × {it.quantity}
                                    </div>
                                    {(it.sizeKey || it.milkKey || it.syrupKey) && (
                                      <div className="text-[10px] text-slate-600 whitespace-normal break-words">
                                        {[labelSize(it.sizeKey) && `Размер: ${labelSize(it.sizeKey)}`, labelMilk(it.milkKey) && `Молоко: ${labelMilk(it.milkKey)}`, labelSyrup(it.syrupKey) && `Сироп: ${labelSyrup(it.syrupKey)}`]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-slate-900 font-semibold whitespace-nowrap">{it.price * it.quantity} ₸</div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          {order.date
                            ? new Date(order.date).toLocaleString()
                            : "Время неизвестно"}
                        </div>

                        {order.status === "ready" && (
                          <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="text-amber-700 text-sm font-bold mb-3 text-center">
                              🔥 Заказ готов! Покажите QR-код на кассе:
                            </div>
                            <div className="flex justify-center">
                              <QRCode value={`ORDER:${order.id}`} size={120} />
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* тост */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircleIcon className="w-6 h-6 text-white" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR modal after placing order */}
      <AnimatePresence>
        {qrOpen && lastPlaced && qrPayload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQrOpen(false)} />
            <motion.div
              initial={{ y: 40, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.98 }}
              className="relative w-full sm:w-auto sm:min-w-[340px] max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6"
            >
              <button onClick={() => setQrOpen(false)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-900">✕</button>
              <h3 className="text-lg font-extrabold text-slate-900 mb-1">Покажите QR бариста</h3>
              <div className="text-sm text-slate-600 mb-4">Заказ #{String(lastPlaced.id).slice(-6)} · {lastPlaced.amount} ₸</div>
              <div className="flex justify-center py-2">
                <QRCode value={qrPayload} size={180} />
              </div>
              <div className="mt-4 text-center text-xs text-slate-500">Бариста отсканирует QR и примет заказ</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Order;
