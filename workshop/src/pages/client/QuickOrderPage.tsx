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
import { Button, WorkshopLoader } from '@/components/ui';
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
      <div style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircleIcon style={{ width: 40, height: 40, color: '#16a34a' }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Заказ отправлен!</h2>
          <p style={{ color: '#94a3b8' }}>Ожидайте подтверждения</p>
        </motion.div>
      </div>
    );
  }

  if (!template) {
    return (
      <div style={{ minHeight: '100%', background: '#f8fafc' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <button onClick={() => history.goBack()} style={{ padding: 8, marginLeft: -8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowLeftIcon style={{ width: 20, height: 20, color: '#475569' }} />
            </button>
            <h1 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Быстрый заказ</h1>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Нет сохранённого заказа</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Сделайте первый заказ для этой точки</p>
          <Button onClick={() => history.push(`/client/menu?outletId=${outletId}`)}>Перейти в меню</Button>
        </div>
      </div>
    );
  }

  const totalAmount = template.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountPercent = clientData?.discountPercent || 0;
  const discountAmount = discountPercent > 0 ? Math.round(totalAmount * discountPercent / 100) : 0;
  const finalTotal = totalAmount - discountAmount;

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: 160 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <button onClick={() => history.goBack()} style={{ padding: 8, marginLeft: -8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeftIcon style={{ width: 20, height: 20, color: '#475569' }} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Быстрый заказ</h1>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{clientData?.outletName}</p>
          </div>
        </div>
      </div>

      {/* Order Preview */}
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Ваш последний заказ</h3>
            <button onClick={handleEditOrder} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#92400e', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <PencilSquareIcon style={{ width: 16, height: 16 }} />
              Изменить
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', paddingTop: 12, paddingBottom: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {template.items.map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>{getLocalizedName(item.productName)} × <strong>{item.quantity}</strong></span>
                <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.subtotal.toLocaleString()} ₸</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>Сумма:</span>
            <span style={{ fontWeight: 700, color: discountPercent > 0 ? '#94a3b8' : '#0f172a', fontSize: discountPercent > 0 ? 14 : 24, textDecoration: discountPercent > 0 ? 'line-through' : 'none' }}>
              {totalAmount.toLocaleString()} ₸
            </span>
          </div>
          {discountPercent > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ color: '#d97706', fontSize: 14, fontWeight: 500 }}>Скидка {discountPercent}%</span>
                <span style={{ color: '#d97706', fontSize: 14, fontWeight: 500 }}>−{discountAmount.toLocaleString()} ₸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Итого:</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{finalTotal.toLocaleString()} ₸</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div style={{ position: 'fixed', bottom: '5rem', left: 0, right: 0, padding: '8px 16px', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 60 }}>
        {orderBlocked && (
          <div style={{ marginBottom: 8, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, fontSize: 14, color: '#b91c1c', textAlign: 'center' }}>
            🕐 {orderBlocked}
          </div>
        )}
        <Button fullWidth size="lg" onClick={handleQuickOrder} loading={submitting} disabled={submitting || !!orderBlocked}>
          {orderBlocked ? 'Заказ закрыт' : '🚀 Заказать одним нажатием'}
        </Button>
      </div>
    </div>
  );
};

export default QuickOrderPage;
