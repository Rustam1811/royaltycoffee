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
import { Card, CardBody, Button, Textarea } from '@/components/ui';
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
        className="w-14 h-8 text-center font-semibold text-slate-900 border border-workshop-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-workshop-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-14 h-8 text-center font-semibold text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-text"
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Заказ отправлен!
          </h2>
          <p className="text-slate-500">
            Ожидайте подтверждения от цеха
          </p>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => history.goBack()}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="font-semibold text-slate-900">Корзина</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Корзина пуста
          </h2>
          <p className="text-slate-500 text-center mb-6">
            Добавьте продукцию из меню
          </p>
          <Button onClick={() => history.goBack()}>
            Перейти в меню
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <button
            onClick={() => history.goBack()}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900">Корзина</h1>
            <p className="text-sm text-slate-500">{outletName}</p>
          </div>
        </div>
      </div>

      {/* Cart Items — pb accounts for bottom bar + navbar */}
      <div className="px-4 py-4 space-y-3 max-w-3xl mx-auto pb-52">
        {items.map((item, index) => (
          <motion.div
            key={item.productId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardBody className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      {getLocalizedName(item.productName)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {item.price.toLocaleString()} ₸ / {item.unit}
                    </p>
                  </div>
                  
                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <QuantityInput
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.productId, q)}
                      min={1}
                    />
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-workshop-500 text-white flex items-center justify-center hover:bg-workshop-600"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Subtotal */}
                  <span className="font-bold text-slate-900">
                    {item.subtotal.toLocaleString()} ₸
                  </span>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
        
        {/* Delivery date */}
        <Card>
          <CardBody>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Дата доставки
            </label>
            <input
              type="date"
              value={deliveryDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-workshop-500"
            />
          </CardBody>
        </Card>

        {/* Notes */}
        <Card>
          <CardBody>
            <Textarea
              label="Комментарий к заказу"
              placeholder="Например: доставить до 8:00"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardBody>
        </Card>
      </div>

      {/* Submit Button — above bottom navbar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 pt-2 z-40 bg-gradient-to-t from-white via-white to-white/0">
        <div className="max-w-3xl mx-auto">
          {/* Blocked by cutoff time */}
          {orderBlocked && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 text-center">
              🕐 {orderBlocked}
            </div>
          )}

          {/* Minimum order warning */}
          {!orderBlocked && (() => {
            const discountPercent = clientData?.discountPercent || 0;
            const discountAmount = discountPercent > 0 ? Math.round(totalAmount * discountPercent / 100) : 0;
            const finalTotal = totalAmount - discountAmount;
            if (finalTotal < minOrderAmount) {
              const remaining = minOrderAmount - finalTotal;
              return (
                <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-2xl text-sm text-orange-700 text-center">
                  🛒 Минимальный заказ — {minOrderAmount.toLocaleString()} ₸. Добавьте ещё на {remaining.toLocaleString()} ₸
                </div>
              );
            }
            return null;
          })()}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-600">{items.length} позиций</span>
              <span className={`font-bold text-slate-900 ${clientData?.discountPercent ? 'text-base line-through text-slate-400' : 'text-xl'}`}>
                {totalAmount.toLocaleString()} ₸
              </span>
            </div>
            {clientData && clientData.discountPercent > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-600 text-sm font-medium">Скидка {clientData.discountPercent}%</span>
                <span className="text-amber-600 text-sm font-medium">
                  −{Math.round(totalAmount * clientData.discountPercent / 100).toLocaleString()} ₸
                </span>
              </div>
            )}
            {clientData && clientData.discountPercent > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-900 font-semibold">Итого</span>
                <span className="text-xl font-bold text-slate-900">
                  {(totalAmount - Math.round(totalAmount * clientData.discountPercent / 100)).toLocaleString()} ₸
                </span>
              </div>
            )}
            <Button
              fullWidth
              size="lg"
              onClick={handleSubmitOrder}
              loading={submitting}
              disabled={submitting || items.length === 0 || !!orderBlocked || (() => {
                const discountPercent = clientData?.discountPercent || 0;
                const discountAmount = discountPercent > 0 ? Math.round(totalAmount * discountPercent / 100) : 0;
                return (totalAmount - discountAmount) < minOrderAmount;
              })()}
            >
              {orderBlocked ? 'Заказ закрыт' : 'Оформить заказ'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
