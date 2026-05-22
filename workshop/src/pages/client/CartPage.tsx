import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrashIcon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/contexts/UserContext';
import { createOrder, getClientByUid, getWorkshopSettings, isOrderingAllowed } from '@/services';
import { LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

// ─── Inline editable quantity ───
const QuantityInput: React.FC<{
  value: number;
  onChange: (qty: number) => void;
  min?: number;
}> = ({ value, onChange, min = 1 }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    const num = parseInt(draft, 10);
    if (!isNaN(num) && num >= min) {
      onChange(num);
    } else {
      setDraft(value.toString());
    }
  };

  const startEdit = () => {
    setDraft(value.toString());
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        style={{ width: 56, height: 32, textAlign: 'center', fontWeight: 600, color: '#0f172a', border: '1px solid #d4a574', borderRadius: 8, background: '#fff', outline: 'none', fontSize: 14 }}
        min={min}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      style={{ width: 56, height: 32, textAlign: 'center', fontWeight: 600, color: '#0f172a', borderRadius: 8, background: 'none', border: 'none', cursor: 'text', fontSize: 14 }}
      title="Нажмите чтобы ввести число"
    >
      {value}
    </button>
  );
};

/**
 * Страница корзины и оформления заказа
 */
const CartPage: React.FC = () => {
  const query = useQuery();
  const history = useHistory();
  const { user } = useUser();
  const outletId = query.get('outletId') || '';
  const outletName = decodeURIComponent(query.get('outletName') || 'Точка');
  
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCart();
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clientData, setClientData] = useState<{ id: string; companyName: string; discountPercent: number } | null>(null);
  const [cutoffTime, setCutoffTime] = useState('17:00');
  const [approvalThreshold, setApprovalThreshold] = useState(20000);
  const [minOrderAmount, setMinOrderAmount] = useState(8000);
  const [orderBlocked, setOrderBlocked] = useState('');

  useEffect(() => {
    const loadClient = async () => {
      if (!user?.uid) return;
      const [client, settings] = await Promise.all([
        getClientByUid(user.uid),
        getWorkshopSettings(),
      ]);
      if (client) {
        setClientData({ id: client.id, companyName: client.companyName, discountPercent: client.discountPercent || 0 });
      }
      setCutoffTime(settings.orderCutoffTime);
      setApprovalThreshold(settings.bonusApprovalThreshold);
      if (settings.minOrderAmount) setMinOrderAmount(settings.minOrderAmount);

      // Проверяем время заказа
      const check = isOrderingAllowed(settings.orderCutoffTime);
      if (!check.allowed) {
        setOrderBlocked(check.message);
      }
    };
    loadClient();
  }, [user?.uid]);

  const handleSubmitOrder = async () => {
    if (!clientData || items.length === 0) return;
    
    // Проверка времени заказа
    const check = isOrderingAllowed(cutoffTime);
    if (!check.allowed) {
      setOrderBlocked(check.message);
      return;
    }

    // Проверка минимальной суммы заказа
    const discountPercent = clientData.discountPercent || 0;
    const discountAmount = discountPercent > 0 ? Math.round(totalAmount * discountPercent / 100) : 0;
    const finalTotal = totalAmount - discountAmount;
    if (finalTotal < minOrderAmount) {
      alert(`Минимальная сумма заказа — ${minOrderAmount.toLocaleString()} ₸. Добавьте ещё позиций.`);
      return;
    }

    setSubmitting(true);
    try {
      const needsApproval = finalTotal > approvalThreshold;

      await createOrder({
        clientId: clientData.id,
        clientName: clientData.companyName,
        outletId,
        outletName,
        outletAddress: '',
        items,
        totalAmount: finalTotal,
        ...(discountPercent > 0 ? { discountPercent, discountAmount } : {}),
        status: 'pending',
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(needsApproval ? { requiresApproval: true } : {}),
        ...(deliveryDate ? { deliveryDate } : {}),
      });
      
      setSuccess(true);
      clearCart();
      
      // Через 2 секунды переходим на страницу заказов
      setTimeout(() => {
        history.push('/client/orders');
      }, 2000);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ошибка при создании заказа');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100%', background: 'linear-gradient(135deg, #3D0A11 0%, #5A0D17 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 20 }} style={{ textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircleIcon style={{ width: 52, height: 52, color: '#fff', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Заказ отправлен!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>Ожидайте подтверждения от цеха</p>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100%', background: '#f8fafc' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #5A0D17 100%)', padding: '44px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => history.goBack()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
              <ArrowLeftIcon style={{ width: 20, height: 20, display: 'block' }} />
            </button>
            <h1 style={{ fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }}>Корзина</h1>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 48 }}>🛒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Корзина пуста</h2>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 15 }}>Добавьте продукцию из меню</p>
          <button onClick={() => history.goBack()} style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Перейти в меню
          </button>
        </div>
      </div>
    );
  }

  const discountPercent = clientData?.discountPercent || 0;
  const discountAmount = discountPercent > 0 ? Math.round(totalAmount * discountPercent / 100) : 0;
  const finalTotal = totalAmount - discountAmount;
  const isBelowMin = finalTotal < minOrderAmount;

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* Gradient header */}
      <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #5A0D17 100%)', padding: '44px 20px 20px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 720, margin: '0 auto' }}>
          <button onClick={() => history.goBack()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
            <ArrowLeftIcon style={{ width: 20, height: 20, display: 'block' }} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }}>Оформление заказа</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>{outletName} · {items.length} поз.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{finalTotal.toLocaleString()} ₸</p>
            {discountPercent > 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>скидка {discountPercent}%</p>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxWidth: 720, margin: '0 auto', paddingBottom: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Section label */}
        <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 2px', padding: '0 4px' }}>Состав заказа</p>

        {/* Cart items */}
        {items.map((item, index) => (
          <motion.div
            key={item.productId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{getLocalizedName(item.productName)}</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>{item.price.toLocaleString()} ₸ / {item.unit}</p>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  style={{ width: 32, height: 32, borderRadius: 10, background: '#fef2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  <TrashIcon style={{ width: 16, height: 16, color: '#ef4444', display: 'block' }} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', borderRadius: 12, padding: '4px 6px' }}>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    style={{ width: 32, height: 32, borderRadius: 9, background: '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <MinusIcon style={{ width: 16, height: 16, display: 'block' }} />
                  </button>
                  <QuantityInput value={item.quantity} onChange={(q) => updateQuantity(item.productId, q)} min={1} />
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    style={{ width: 32, height: 32, borderRadius: 9, background: '#5A0D17', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                  >
                    <PlusIcon style={{ width: 16, height: 16, display: 'block' }} />
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0 }}>{item.subtotal.toLocaleString()} ₸</p>
                  {discountPercent > 0 && (
                    <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>→ {Math.round(item.subtotal * (1 - discountPercent / 100)).toLocaleString()} ₸</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Delivery + Notes */}
        <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 2px', padding: '0 4px' }}>Детали доставки</p>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '14px 16px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>📅 Дата доставки</label>
          <input
            type="date"
            value={deliveryDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDeliveryDate(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#0f172a', outline: 'none', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '14px 16px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>💬 Комментарий</label>
          <textarea
            placeholder="Например: доставить до 8:00"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '11px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#0f172a', outline: 'none', fontSize: 15, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, zIndex: 40 }}>
        {/* Alerts */}
        {(orderBlocked || (!orderBlocked && isBelowMin)) && (
          <div style={{ padding: '0 16px 8px', maxWidth: 720, margin: '0 auto' }}>
            {orderBlocked ? (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, fontSize: 14, color: '#b91c1c', textAlign: 'center' }}>
                🕐 {orderBlocked}
              </div>
            ) : (
              <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, fontSize: 14, color: '#c2410c', textAlign: 'center' }}>
                Минимальный заказ — {minOrderAmount.toLocaleString()} ₸, ещё {(minOrderAmount - finalTotal).toLocaleString()} ₸
              </div>
            )}
          </div>
        )}

        {/* Summary card */}
        <div style={{ background: '#fff', borderTop: '1px solid #f1f5f9', boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', padding: '14px 16px 16px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Price breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: discountPercent > 0 ? 6 : 12 }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>{items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'позиция' : 'позиций'}</span>
              {discountPercent > 0 ? (
                <span style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'line-through' }}>{totalAmount.toLocaleString()} ₸</span>
              ) : (
                <span style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>{finalTotal.toLocaleString()} ₸</span>
              )}
            </div>
            {discountPercent > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>Скидка {discountPercent}%</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>{finalTotal.toLocaleString()} ₸</span>
              </div>
            )}

            <button
              onClick={handleSubmitOrder}
              disabled={submitting || items.length === 0 || !!orderBlocked || isBelowMin}
              style={{
                width: '100%', padding: '15px', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: submitting || !!orderBlocked || isBelowMin ? 'not-allowed' : 'pointer',
                background: submitting || !!orderBlocked || isBelowMin ? '#cbd5e1' : 'linear-gradient(135deg, #3D0A11, #5A0D17)',
                color: submitting || !!orderBlocked || isBelowMin ? '#94a3b8' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: submitting || !!orderBlocked || isBelowMin ? 'none' : '0 4px 16px rgba(61,10,17,0.35)',
              }}
            >
              {submitting ? (
                <>
                  <svg style={{ width: 20, height: 20, display: 'block' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Отправляем...
                </>
              ) : orderBlocked ? '🔒 Заказ закрыт' : isBelowMin ? `Минимум ${minOrderAmount.toLocaleString()} ₸` : '✓ Оформить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
