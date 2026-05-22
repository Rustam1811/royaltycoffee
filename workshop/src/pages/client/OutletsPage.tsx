import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BuildingStorefrontIcon, 
  PlusIcon, 
  MapPinIcon, 
  ClockIcon,
  PhoneIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Input, WorkshopLoader } from '@/components/ui';
import { getClientByUid, addClientOutlet } from '@/services';
import { ClientOutlet } from '@/types';

interface NewOutletForm {
  name: string;
  phone: string;
  address: string;
  deliveryTime: string;
}

/**
 * Страница выбора точки клиента
 * Клиент видит свои точки (кофейни) и выбирает для какой делать заказ
 * Также может добавить новую точку
 */
const OutletsPage: React.FC = () => {
  const { user } = useUser();
  const history = useHistory();
  const [outlets, setOutlets] = useState<ClientOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string>('');
  
  // Форма добавления точки
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<NewOutletForm>({
    name: '',
    phone: '',
    address: '',
    deliveryTime: '08:00',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      
      try {
        const client = await getClientByUid(user.uid);
        if (client) {
          setClientId(client.id);
          setOutlets(client.outlets.filter(o => o.isActive));
        }
      } catch (error) {
        console.error('Error loading outlets:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.uid]);

  const handleSelectOutlet = (outlet: ClientOutlet) => {
    history.push(`/client/menu?outletId=${outlet.id}&outletName=${encodeURIComponent(outlet.name)}`);
  };

  const handleFormChange = (field: keyof NewOutletForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOutlet = async () => {
    if (!formData.name || !formData.address || !formData.phone) {
      return;
    }

    setSaving(true);
    try {
      await addClientOutlet(clientId, {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        deliveryTime: formData.deliveryTime,
        isActive: true,
      });
      
      // Reload outlets
      const client = await getClientByUid(user!.uid);
      if (client) {
        setOutlets(client.outlets.filter(o => o.isActive));
      }
      
      // Reset form
      setFormData({ name: '', phone: '', address: '', deliveryTime: '08:00' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding outlet:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <WorkshopLoader text="Загрузка точек..." />;
  }

  const S = {
    page: { minHeight: '100%', background: '#f8fafc', paddingBottom: '24px' } as React.CSSProperties,
    header: { background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '44px 20px 24px' } as React.CSSProperties,
    h1: { fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' } as React.CSSProperties,
    subtext: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '4px' } as React.CSSProperties,
    content: { padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' } as React.CSSProperties,
    card: { background: '#fff', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer', border: '1.5px solid transparent' } as React.CSSProperties,
    cardBody: { padding: '16px' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'flex-start', gap: '14px' } as React.CSSProperties,
    iconBox: { width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties,
    iconBoxSmall: { width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties,
    cardInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,
    outletName: { fontWeight: 700, color: '#0f172a', fontSize: '16px', margin: 0 } as React.CSSProperties,
    metaRow: { display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' } as React.CSSProperties,
    metaText: { fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    deliveryText: { fontSize: '13px', fontWeight: 600, color: '#92400e' } as React.CSSProperties,
    arrowBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', flexShrink: 0, alignSelf: 'center' } as React.CSSProperties,
    addCard: { background: '#fff', borderRadius: '20px', border: '2px dashed #e2e8f0', cursor: 'pointer' } as React.CSSProperties,
    addCardInner: { padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' } as React.CSSProperties,
    addLabel: { fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '15px' } as React.CSSProperties,
    addSub: { fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' } as React.CSSProperties,
    formCard: { background: '#fff', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as React.CSSProperties,
    formHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' } as React.CSSProperties,
    formTitle: { display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
    formTitleText: { fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '16px' } as React.CSSProperties,
    closeBtn: { width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '14px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' } as React.CSSProperties,
    hint: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' } as React.CSSProperties,
    actions: { display: 'flex', gap: '10px', marginTop: '20px' } as React.CSSProperties,
    btnOutline: { flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '15px', cursor: 'pointer' } as React.CSSProperties,
    btnPrimary: { flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(61,10,17,0.25)' } as React.CSSProperties,
    btnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' } as React.CSSProperties,
    emptyState: { textAlign: 'center', padding: '40px 16px' } as React.CSSProperties,
    emptyCircle: { width: '88px', height: '88px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' } as React.CSSProperties,
    emptyTitle: { fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' } as React.CSSProperties,
    emptyText: { color: '#94a3b8', fontSize: '14px', maxWidth: '280px', margin: '0 auto', lineHeight: 1.5 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={S.h1}>Мои точки</h1>
            <p style={S.subtext}>
              {outlets.length > 0 ? `${outlets.length} ${outlets.length === 1 ? 'точка' : outlets.length < 5 ? 'точки' : 'точек'} · выберите для заказа` : 'Добавьте вашу первую точку'}
            </p>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🏪
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={S.content}>

        {/* Existing Outlets */}
        {outlets.map((outlet, index) => (
          <motion.div
            key={outlet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            style={S.card}
            onClick={() => handleSelectOutlet(outlet)}
          >
            <div style={S.cardBody}>
              <div style={S.row}>
                <div style={S.iconBox}>
                  <BuildingStorefrontIcon style={{ width: 26, height: 26, color: '#92400e', display: 'block' }} />
                </div>
                <div style={S.cardInfo}>
                  <p style={S.outletName}>{outlet.name}</p>
                  <div style={S.metaRow}>
                    <MapPinIcon style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0, display: 'block' }} />
                    <span style={S.metaText}>{outlet.address}</span>
                  </div>
                  <div style={S.metaRow}>
                    <PhoneIcon style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0, display: 'block' }} />
                    <span style={S.metaText}>{outlet.phone}</span>
                  </div>
                  {outlet.deliveryTime && (
                    <div style={S.metaRow}>
                      <ClockIcon style={{ width: 14, height: 14, color: '#92400e', flexShrink: 0, display: 'block' }} />
                      <span style={S.deliveryText}>Доставка к {outlet.deliveryTime}</span>
                    </div>
                  )}
                </div>
                <div style={S.arrowBox}>
                  <svg style={{ width: 20, height: 20, display: 'block' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              {/* Order button */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Нажмите чтобы сделать заказ</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5A0D17', background: '#fef3c7', padding: '4px 12px', borderRadius: 20 }}>Заказать →</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Outlet / Form */}
        <AnimatePresence mode="wait">
          {!showAddForm ? (
            <motion.div key="add-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={S.addCard} onClick={() => setShowAddForm(true)}>
                <div style={S.addCardInner}>
                  <div style={S.iconBox}>
                    <PlusIcon style={{ width: 24, height: 24, color: '#92400e', display: 'block' }} />
                  </div>
                  <div>
                    <p style={S.addLabel}>Добавить точку</p>
                    <p style={S.addSub}>Новый адрес доставки</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="add-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={S.formCard}>
                <div style={S.cardBody}>
                  {/* Form Header */}
                  <div style={S.formHeader}>
                    <div style={S.formTitle}>
                      <div style={S.iconBoxSmall}>
                        <PlusIcon style={{ width: 20, height: 20, color: '#92400e', display: 'block' }} />
                      </div>
                      <p style={S.formTitleText}>Новая точка</p>
                    </div>
                    <button style={S.closeBtn} onClick={() => setShowAddForm(false)}>
                      <XMarkIcon style={{ width: 18, height: 18, display: 'block' }} />
                    </button>
                  </div>

                  {/* Fields */}
                  <div style={S.fieldGroup}>
                    <div>
                      <label style={S.label}>Название точки</label>
                      <Input placeholder="Например: Кофейня на Арбате" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Телефон для связи</label>
                      <Input type="tel" placeholder="+7 (999) 123-45-67" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Адрес доставки</label>
                      <Input placeholder="Улица, дом, вход/этаж" value={formData.address} onChange={(e) => handleFormChange('address', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Время доставки</label>
                      <Input type="time" value={formData.deliveryTime} onChange={(e) => handleFormChange('deliveryTime', e.target.value)} />
                      <p style={S.hint}>К какому времени нужно привезти заказ</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={S.actions}>
                    <button style={S.btnOutline} onClick={() => setShowAddForm(false)}>Отмена</button>
                    <button
                      style={{ ...S.btnPrimary, ...(!formData.name || !formData.address || !formData.phone || saving ? S.btnDisabled : {}) }}
                      onClick={handleAddOutlet}
                      disabled={!formData.name || !formData.address || !formData.phone || saving}
                    >
                      {saving ? (
                        <>
                          <svg style={{ width: 16, height: 16, display: 'block', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <CheckIcon style={{ width: 16, height: 16, display: 'block' }} />
                          Добавить
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {outlets.length === 0 && !showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={S.emptyState}>
            <div style={S.emptyCircle}>
              <BuildingStorefrontIcon style={{ width: 44, height: 44, color: '#92400e', display: 'block' }} />
            </div>
            <p style={S.emptyTitle}>Начните с добавления точки</p>
            <p style={S.emptyText}>Добавьте адрес вашей кофейни или ресторана, чтобы начать делать заказы</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OutletsPage;

