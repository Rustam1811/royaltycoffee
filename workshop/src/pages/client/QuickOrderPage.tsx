import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { useCart } from '@/contexts/CartContext';
import { Card, CardBody, Button, WorkshopLoader } from '@/components/ui';
import { getQuickOrderTemplate, getClientByUid, createOrder, getWorkshopSettings, isOrderingAllowed } from '@/services';
import { QuickOrderTemplate, LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

/**
 * Страница быстрого заказа (повтор последнего)
 */
const QuickOrderPage: React.FC = () => {
  const query = useQuery();
  const history = useHistory();
  const { user } = useUser();
  const { loadFromTemplate } = useCart();
  const outletId = query.get('outletId') || '';
  
  const [template, setTemplate] = useState<QuickOrderTemplate | null>(null);
  const [clientData, setClientData] = useState<{ id: string; companyName: string; outletName: string; outletAddress: string; discountPercent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderBlocked, setOrderBlocked] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid || !outletId) return;
      
      try {
        const [client, settings] = await Promise.all([
          getClientByUid(user.uid),
          getWorkshopSettings(),
        ]);
        
        const check = isOrderingAllowed(settings.orderCutoffTime);
        if (!check.allowed) {
          setOrderBlocked(check.message);
        }
        
        if (client) {
          const outlet = client.outlets.find(o => o.id === outletId);
          setClientData({
            id: client.id,
            companyName: client.companyName,
            outletName: outlet?.name || 'Точка',
            outletAddress: outlet?.address || '',
            discountPercent: client.discountPercent || 0,
          });
          
          const templateData = await getQuickOrderTemplate(client.id, outletId);
          setTemplate(templateData);
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.uid, outletId]);

  const handleQuickOrder = async () => {
    if (!template || !clientData || orderBlocked) return;
    
    setSubmitting(true);
    try {
      const rawTotal = template.items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountPercent = clientData.discountPercent || 0;
      const discountAmount = discountPercent > 0 ? Math.round(rawTotal * discountPercent / 100) : 0;
      const finalTotal = rawTotal - discountAmount;

      await createOrder({
        clientId: clientData.id,
        clientName: clientData.companyName,
        outletId,
        outletName: clientData.outletName,
        outletAddress: clientData.outletAddress,
        items: template.items,
        totalAmount: finalTotal,
        ...(discountPercent > 0 ? { discountPercent, discountAmount } : {}),
        status: 'pending',
      });
      
      setSuccess(true);
      
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

  const handleEditOrder = () => {
    if (!template || !clientData) return;
    
    // Загружаем шаблон в корзину и переходим на страницу меню
    loadFromTemplate(template.items);
    history.push(`/client/menu?outletId=${outletId}&outletName=${encodeURIComponent(clientData.outletName)}`);
  };

  if (loading) {
    return <WorkshopLoader text="Загрузка..." />;
  }

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
            Ожидайте подтверждения
          </p>
        </motion.div>
      </div>
    );
  }

  if (!template) {
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
            <h1 className="font-semibold text-slate-900">Быстрый заказ</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Нет сохранённого заказа
          </h2>
          <p className="text-slate-500 text-center mb-6">
            Сделайте первый заказ для этой точки
          </p>
          <Button onClick={() => history.push(`/client/menu?outletId=${outletId}`)}>
            Перейти в меню
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = template.items.reduce((sum, item) => sum + item.subtotal, 0);

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
            <h1 className="font-semibold text-slate-900">Быстрый заказ</h1>
            <p className="text-sm text-slate-500">{clientData?.outletName}</p>
          </div>
        </div>
      </div>

      {/* Order Preview */}
      <div className="px-4 py-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Ваш последний заказ</h3>
              <button
                onClick={handleEditOrder}
                className="flex items-center gap-1 text-workshop-600 text-sm font-medium"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Изменить
              </button>
            </div>
            
            <div className="space-y-2 py-3 border-y border-slate-100">
              {template.items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {getLocalizedName(item.productName)} × <strong>{item.quantity}</strong>
                  </span>
                  <span className="text-slate-900 font-medium">
                    {item.subtotal.toLocaleString()} ₸
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-slate-600">Сумма:</span>
              <span className={`font-bold text-slate-900 ${clientData?.discountPercent ? 'text-lg line-through text-slate-400' : 'text-2xl'}`}>
                {totalAmount.toLocaleString()} ₸
              </span>
            </div>
            {clientData && clientData.discountPercent > 0 && (
              <>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-amber-600 text-sm font-medium">Скидка {clientData.discountPercent}%</span>
                  <span className="text-amber-600 text-sm font-medium">
                    −{Math.round(totalAmount * clientData.discountPercent / 100).toLocaleString()} ₸
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-900 font-semibold">Итого:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {(totalAmount - Math.round(totalAmount * clientData.discountPercent / 100)).toLocaleString()} ₸
                  </span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-[60] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" style={{ bottom: '5rem' }}>
        {orderBlocked && (
          <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 text-center">
            🕐 {orderBlocked}
          </div>
        )}
        <Button
          fullWidth
          size="lg"
          onClick={handleQuickOrder}
          loading={submitting}
          disabled={submitting || !!orderBlocked}
        >
          {orderBlocked ? 'Заказ закрыт' : '🚀 Заказать одним нажатием'}
        </Button>
      </div>
    </div>
  );
};

export default QuickOrderPage;
