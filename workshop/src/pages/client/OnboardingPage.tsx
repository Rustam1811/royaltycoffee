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
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Button, Input, WorkshopLoader } from '@/components/ui';
import { getClientByUid, updateClient, addOutlet } from '@/services';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      window.location.href = '/login';
    }
  };

  const handleFinish = async () => {
    // Если в форме осталась заполненная точка — добавим её автоматически,
    // чтобы пользователю не приходилось искать кнопку «Добавить точку».
    const outletsToSave = [...outlets];
    if (outletForm.name.trim() && outletForm.address.trim()) {
      outletsToSave.push({ ...outletForm });
    }

    if (outletsToSave.length === 0) {
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
      for (const outlet of outletsToSave) {
        await addOutlet(clientDocId, {
          name: outlet.name.trim(),
          address: outlet.address.trim(),
          phone: outlet.phone.trim() || undefined,
          deliveryTime: outlet.deliveryTime || '08:00',
          isActive: true,
        });
      }

      // очищаем форму на случай, если останемся на странице
      setOutlets(outletsToSave);
      setOutletForm({ name: '', address: '', phone: '', deliveryTime: '08:00' });

      setStep(3);

      // Через 2.5 секунды перенаправляем
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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Всё готово!</h1>
          <p className="text-gray-500">Добро пожаловать в Цех. Переходим к заказам...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-6 pt-12 pb-8 relative">
        {/* Logout button — доступен в любой момент онбординга */}
        <button
          type="button"
          onClick={handleLogout}
          className="absolute top-12 right-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-2.5 py-1.5"
          aria-label="Выйти из аккаунта"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Выйти
        </button>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Добро пожаловать!</h1>
              <p className="text-white/60 text-sm">Заполните данные для начала работы</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          <div className="flex justify-between text-xs text-workshop-100 mt-2">
            <span>О компании</span>
            <span>Точки доставки</span>
          </div>
        </motion.div>
      </div>

      <div className="px-5 py-6 -mt-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Step 1 — Company Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-workshop-100 rounded-xl flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-workshop-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Информация о компании</h2>
                <p className="text-sm text-slate-500">Расскажите о вашем бизнесе</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Название компании *"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="ООО Кофейня Астана"
              />
              <Input
                label="Контактное лицо *"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="Ваше имя"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <PhoneIcon className="w-4 h-4 inline mr-1" />
                  Телефон *
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+7 777 123 4567"
                />
              </div>
            </div>

            <Button fullWidth onClick={handleStep1Next} className="mt-6">
              Далее →
            </Button>
          </motion.div>
        )}

        {/* Step 2 — Outlets */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-workshop-100 rounded-xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-6 h-6 text-workshop-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Точки доставки</h2>
                  <p className="text-sm text-slate-500">Куда будем доставлять заказы?</p>
                </div>
              </div>

              {/* Added outlets list */}
              {outlets.length > 0 && (
                <div className="space-y-2 mb-4">
                  {outlets.map((o, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <MapPinIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{o.name}</p>
                        <p className="text-xs text-slate-500 truncate">{o.address}</p>
                      </div>
                      <button type="button" onClick={() => removeOutlet(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add outlet form */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOutletToList}
                  disabled={!outletForm.name.trim() || !outletForm.address.trim()}
                  fullWidth
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> Добавить точку
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => { setStep(1); setError(''); }}>
                ← Назад
              </Button>
              <Button
                fullWidth
                onClick={handleFinish}
                loading={saving}
                disabled={
                  saving ||
                  (outlets.length === 0 && (!outletForm.name.trim() || !outletForm.address.trim()))
                }
              >
                Продолжить →
              </Button>
            </div>

            {outlets.length === 0 ? (
              <p className="text-xs text-slate-400 text-center px-4">
                Заполните название и адрес — мы сохраним точку автоматически при нажатии «Продолжить».
                Чтобы добавить ещё несколько точек, нажмите «Добавить точку».
              </p>
            ) : (
              <p className="text-xs text-slate-400 text-center px-4">
                Можно добавить ещё одну точку или нажать «Продолжить», чтобы завершить настройку.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
