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
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { Card, CardBody, Button, Input, PageLoader } from '@/components/ui';
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
    // Переходим на страницу меню с выбранной точкой
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
    return <PageLoader text="Загрузка точек..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <h1 className="text-2xl font-bold">Мои точки</h1>
        <p className="text-workshop-100 mt-1">
          {outlets.length > 0 
            ? 'Выберите точку для заказа' 
            : 'Добавьте вашу первую точку'
          }
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        
        {/* Existing Outlets */}
        {outlets.map((outlet, index) => (
          <motion.div
            key={outlet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover onClick={() => handleSelectOutlet(outlet)}>
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-workshop-100 flex items-center justify-center flex-shrink-0">
                    <BuildingStorefrontIcon className="w-6 h-6 text-workshop-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {outlet.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                      <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{outlet.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                      <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{outlet.phone}</span>
                    </div>
                    
                    {outlet.deliveryTime && (
                      <div className="flex items-center gap-1.5 mt-1 text-workshop-600">
                        <ClockIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Доставка к {outlet.deliveryTime}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}

        {/* Add Outlet Card */}
        <AnimatePresence mode="wait">
          {!showAddForm ? (
            <motion.div
              key="add-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card 
                hover 
                onClick={() => setShowAddForm(true)}
                className="border-2 border-dashed border-slate-200 bg-slate-50/50"
              >
                <CardBody>
                  <div className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-xl bg-workshop-100 flex items-center justify-center">
                      <PlusIcon className="w-6 h-6 text-workshop-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Добавить точку</h3>
                      <p className="text-sm text-slate-500">Новый адрес доставки</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardBody>
                  {/* Form Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-workshop-100 flex items-center justify-center">
                        <PlusIcon className="w-5 h-5 text-workshop-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900">Новая точка</h3>
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Название точки
                      </label>
                      <Input
                        placeholder="Например: Кофейня на Арбате"
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        <PhoneIcon className="w-4 h-4 inline mr-1" />
                        Телефон для связи
                      </label>
                      <Input
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        <MapPinIcon className="w-4 h-4 inline mr-1" />
                        Адрес доставки
                      </label>
                      <Input
                        placeholder="Улица, дом, вход/этаж"
                        value={formData.address}
                        onChange={(e) => handleFormChange('address', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        <ClockIcon className="w-4 h-4 inline mr-1" />
                        Время доставки
                      </label>
                      <Input
                        type="time"
                        value={formData.deliveryTime}
                        onChange={(e) => handleFormChange('deliveryTime', e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        К какому времени нужно привезти заказ
                      </p>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddOutlet}
                      disabled={!formData.name || !formData.address || !formData.phone || saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Сохранение...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4" />
                          Добавить
                        </span>
                      )}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State Help */}
        {outlets.length === 0 && !showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BuildingStorefrontIcon className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Начните с добавления точки
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Добавьте адрес вашей кофейни или ресторана, чтобы начать делать заказы
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OutletsPage;
