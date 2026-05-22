import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BuildingStorefrontIcon,
  UserCircleIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Input, WorkshopLoader } from '@/components/ui';
import { getClientByUid, updateClient, addOutlet } from '@/services';

interface OutletDraft {
  name: string;
  address: string;
  phone: string;
  deliveryTime: string;
}

/**
 * Онбординг для нового клиента цеха.
 * Показывается при первом входе — клиент заполняет данные о компании и добавляет точки доставки.
 */
const OnboardingPage: React.FC = () => {
  const { user } = useUser();
  const history = useHistory();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientDocId, setClientDocId] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = Company, 2 = Outlets, 3 = Done

  // Step 1 — Company Info
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 — Outlets
  const [outlets, setOutlets] = useState<OutletDraft[]>([]);
  const [outletForm, setOutletForm] = useState<OutletDraft>({ name: '', address: '', phone: '', deliveryTime: '08:00' });

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.uid) return;

      try {
        const client = await getClientByUid(user.uid);
        if (!client) {
          // Нет документа клиента — возможно создан но без документа
          setLoading(false);
          return;
        }

        // Если онбординг уже пройден — редирект на outlets
        if (client.onboardingCompleted) {
          history.replace('/client/outlets');
          return;
        }

        setClientDocId(client.id);
      } catch (err) {
        console.error('Error checking onboarding:', err);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user?.uid, history]);

  const handleStep1Next = () => {
    if (!companyName.trim()) { setError('Введите название компании'); return; }
    if (!contactPerson.trim()) { setError('Введите контактное лицо'); return; }
    if (!phone.trim()) { setError('Введите телефон'); return; }
    setError('');
    setStep(2);
  };

  const addOutletToList = () => {
    if (!outletForm.name.trim() || !outletForm.address.trim()) return;
    setOutlets(prev => [...prev, { ...outletForm }]);
    setOutletForm({ name: '', address: '', phone: '', deliveryTime: '08:00' });
  };

  const removeOutlet = (index: number) => {
    setOutlets(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (outlets.length === 0) {
      setError('Добавьте хотя бы одну точку доставки');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // 1. Обновляем данные компании
      await updateClient(clientDocId, {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        onboardingCompleted: true,
      });

      // 2. Добавляем каждую точку
      for (const outlet of outlets) {
        await addOutlet(clientDocId, {
          name: outlet.name.trim(),
          address: outlet.address.trim(),
          phone: outlet.phone.trim() || undefined,
          deliveryTime: outlet.deliveryTime || '08:00',
          isActive: true,
        });
      }

      setStep(3);

      // Через 2 секунды перенаправляем
      setTimeout(() => {
        history.replace('/client/outlets');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <WorkshopLoader text="Загрузка..." />;
  }

  // Step 3 — Success
  if (step === 3) {
    return (
      <div style={{ minHeight: '100%', background: 'linear-gradient(to bottom, #f0fdf4, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ width: 96, height: 96, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckIcon style={{ width: 48, height: 48, color: '#16a34a' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Всё готово!</h1>
          <p style={{ color: '#6b7280' }}>Добро пожаловать в Цех. Переходим к заказам...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(to bottom, #fff1f2, #fff, #fff1f2)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '48px 24px 32px' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SparklesIcon style={{ width: 28, height: 28, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Добро пожаловать!</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>Заполните данные для начала работы</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: step >= 1 ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'background 0.3s' }} />
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: step >= 2 ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'background 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            <span>О компании</span>
            <span>Точки доставки</span>
          </div>
        </motion.div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 12, fontSize: 14 }}>
            {error}
          </motion.div>
        )}

        {/* Step 1 — Company Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, background: '#fef3c7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircleIcon style={{ width: 24, height: 24, color: '#92400e' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Информация о компании</h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Расскажите о вашем бизнесе</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input label="Название компании *" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ООО Кофейня Астана" />
                <Input label="Контактное лицо *" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Ваше имя" />
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    <PhoneIcon style={{ width: 16, height: 16 }} />
                    Телефон *
                  </label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 777 123 4567" />
                </div>
              </div>

              <button onClick={handleStep1Next} style={{ width: '100%', padding: '15px', marginTop: 24, background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(61,10,17,0.3)' }}>Далее →</button>
            </div>
          </motion.div>
        )}

        {/* Step 2 — Outlets */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, background: '#fef3c7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BuildingStorefrontIcon style={{ width: 24, height: 24, color: '#92400e' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Точки доставки</h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Куда будем доставлять заказы?</p>
                </div>
              </div>

              {/* Added outlets list */}
              {outlets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {outlets.map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
                      <MapPinIcon style={{ width: 20, height: 20, color: '#16a34a', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.address}</p>
                      </div>
                      <button type="button" onClick={() => removeOutlet(i)} style={{ padding: 6, color: '#f87171', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <TrashIcon style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add outlet form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 16px', background: '#f8fafc', borderRadius: 20, border: '2px dashed #d4a574' }}>
                <Input
                  label="Название точки"
                  value={outletForm.name}
                  onChange={e => setOutletForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Кофейня на Абая"
                />
                <Input
                  label="Адрес"
                  value={outletForm.address}
                  onChange={e => setOutletForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ул. Абая 50"
                />
                <Input
                  label="Телефон точки"
                  type="tel"
                  value={outletForm.phone}
                  onChange={e => setOutletForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+7 777 ..."
                />
                <Input
                  label="Время доставки"
                  type="time"
                  value={outletForm.deliveryTime}
                  onChange={e => setOutletForm(prev => ({ ...prev, deliveryTime: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={addOutletToList}
                  disabled={!outletForm.name.trim() || !outletForm.address.trim()}
                  style={{ width: '100%', padding: '11px', border: '2px dashed #d4a574', borderRadius: 12, color: !outletForm.name.trim() || !outletForm.address.trim() ? '#cbd5e1' : '#92400e', fontWeight: 600, fontSize: 14, background: 'none', cursor: !outletForm.name.trim() || !outletForm.address.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <PlusIcon style={{ width: 16, height: 16, display: 'block' }} /> Добавить точку
                </button>
              </div>
            </div>

            {/* Continue button — shown prominently when at least one outlet added */}
            {outlets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button onClick={handleFinish} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                  {saving ? 'Сохранение...' : '✓ Продолжить и сделать заказ'}
                </button>
              </motion.div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setStep(1); setError(''); }} style={{ flex: 1, padding: '13px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                ← Назад
              </button>
              {outlets.length === 0 && (
                <button disabled style={{ flex: 1, padding: '13px', background: '#e2e8f0', color: '#94a3b8', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'not-allowed' }}>
                  Готово ✓
                </button>
              )}
            </div>

            {outlets.length === 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '0 16px' }}>
                Добавьте хотя бы одну точку, чтобы мы знали куда доставлять заказы
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
