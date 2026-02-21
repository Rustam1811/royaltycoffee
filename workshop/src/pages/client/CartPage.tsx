import React, { useState, useEffect } from 'react';
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
import { createOrder, getClientByUid } from '@/services';
import { LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clientData, setClientData] = useState<{ id: string; companyName: string } | null>(null);

  useEffect(() => {
    const loadClient = async () => {
      if (!user?.uid) return;
      const client = await getClientByUid(user.uid);
      if (client) {
        setClientData({ id: client.id, companyName: client.companyName });
      }
    };
    loadClient();
  }, [user?.uid]);

  const handleSubmitOrder = async () => {
    if (!clientData || items.length === 0) return;
    
    setSubmitting(true);
    try {
      await createOrder({
        clientId: clientData.id,
        clientName: clientData.companyName,
        outletId,
        outletName,
        outletAddress: '', // TODO: получить из outlet
        items,
        totalAmount,
        status: 'pending',
        notes: notes.trim() || undefined,
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
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
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

      {/* Cart Items */}
      <div className="px-4 py-4 space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.productId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardBody className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900">
                    {getLocalizedName(item.productName)}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {item.price.toLocaleString()} ₸ / {item.unit}
                  </p>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-workshop-500 text-white flex items-center justify-center hover:bg-workshop-600"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Subtotal */}
                <div className="text-right min-w-[80px]">
                  <div className="font-bold text-slate-900">
                    {item.subtotal.toLocaleString()} ₸
                  </div>
                </div>
                
                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </CardBody>
            </Card>
          </motion.div>
        ))}
        
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

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-600">Итого:</span>
          <span className="text-2xl font-bold text-slate-900">
            {totalAmount.toLocaleString()} ₸
          </span>
        </div>
        <Button
          fullWidth
          size="lg"
          onClick={handleSubmitOrder}
          loading={submitting}
          disabled={submitting || items.length === 0}
        >
          Оформить заказ
        </Button>
      </div>
    </div>
  );
};

export default CartPage;
