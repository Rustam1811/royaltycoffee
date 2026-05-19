import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  BuildingStorefrontIcon,
  PlusIcon,
  ChevronRightIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, Badge, Button, WorkshopLoader, Input } from '@/components/ui';
import { getAllClients, createClient, addOutlet, getClientOrders, updateClient } from '@/services';
import { WorkshopClient, ClientOutlet, WorkshopOrder, OrderStatus, LocalizedString } from '@/types';
import { auth } from '@/lib/firebase';
import { useUser } from '@/contexts/UserContext';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  in_production: 'Готовится',
  ready: 'Готов',
  delivered: 'Принято',
  cancelled: 'Отменён',
};
const ORDER_STATUS_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  confirmed: 'info',
  in_production: 'info',
  ready: 'success',
  delivered: 'success',
  cancelled: 'danger',
};

const getLocalizedName = (name: LocalizedString): string => name.ru || name.en || name.kz || '';

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);

// ─── Modal: Создать клиента ───
const CreateClientModal: React.FC<{
  onCreated: (client: WorkshopClient) => void;
  onClose: () => void;
}> = ({ onCreated, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) { setError('Введите корректный email'); return; }
    if (!password || password.length < 6) { setError('Пароль минимум 6 символов'); return; }

    setSaving(true);
    try {
      // 1. Создаём Firebase Auth пользователя через API
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Вы не авторизованы');
      const token = await currentUser.getIdToken();

      const resp = await fetch('/api/roles/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          displayName: email.trim().split('@')[0],
          role: 'workshop_client',
        }),
      });

      const result = await resp.json();
      if (!result.success) throw new Error(result.error || 'Ошибка создания пользователя');

      const uid = result.data.uid;

      // 2. Создаём минимальный документ клиента — он заполнит остальное при первом входе (онбординг)
      const clientId = await createClient({
        uid,
        email: email.trim().toLowerCase(),
        companyName: '',
        contactPerson: '',
        phone: '',
        outlets: [],
        isActive: true,
        onboardingCompleted: false,
      });

      onCreated({
        id: clientId,
        uid,
        email: email.trim().toLowerCase(),
        companyName: '',
        contactPerson: '',
        phone: '',
        outlets: [],
        isActive: true,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Новый клиент</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

          {/* Auth credentials only */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Данные для входа</h3>
            <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="client@company.kz" />
              <Input label="Пароль *" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов" />
            </div>
            <p className="text-xs text-slate-400 mt-3 px-1">
              💡 Клиент войдёт с этими данными в Цех. При первом входе заполнит информацию о компании и добавит точки доставки.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>Отмена</Button>
            <Button type="submit" fullWidth loading={saving}>Создать клиента</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Modal: Добавить точку к клиенту ───
const AddOutletModal: React.FC<{
  client: WorkshopClient;
  onAdded: (outlet: ClientOutlet) => void;
  onClose: () => void;
}> = ({ client, onAdded, onClose }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) { setError('Заполните название и адрес'); return; }
    setSaving(true);
    try {
      await addOutlet(client.id, { name: name.trim(), address: address.trim(), phone: phone.trim() || undefined, isActive: true });
      const newOutlet: ClientOutlet = {
        id: `outlet_${Date.now()}`,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        isActive: true,
        createdAt: new Date(),
      };
      onAdded(newOutlet);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Новая точка</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
          <div className="space-y-3">
            <Input label="Название *" value={name} onChange={e => setName(e.target.value)} placeholder="Кофейня №3" />
            <Input label="Адрес *" value={address} onChange={e => setAddress(e.target.value)} placeholder="ул. Кабанбай батыра 11" />
            <Input label="Телефон" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 777..." />
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>Отмена</Button>
            <Button type="submit" fullWidth loading={saving}>Добавить</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/**
 * Страница управления клиентами цеха
 */
const ClientsPage: React.FC = () => {
  const { user } = useUser();
  const isOwner = user?.role === 'workshop_owner' || user?.role === 'superowner';
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<WorkshopClient | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddOutlet, setShowAddOutlet] = useState(false);
  const [detailTab, setDetailTab] = useState<'outlets' | 'orders'>('outlets');
  const [clientOrders, setClientOrders] = useState<WorkshopOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [savingWorkshopFlag, setSavingWorkshopFlag] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = (client: WorkshopClient) => {
    setClients(prev => [client, ...prev]);
  };

  const handleOpenClient = async (client: WorkshopClient) => {
    setSelectedClient(client);
    setDetailTab('outlets');
    setClientOrders([]);
    setDiscountValue(client.discountPercent ? String(client.discountPercent) : '');
    // Preload orders in background
    setOrdersLoading(true);
    try {
      const orders = await getClientOrders(client.id);
      setClientOrders(orders);
    } catch (err) {
      console.error('Error loading client orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOutletAdded = (outlet: ClientOutlet) => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, outlets: [...selectedClient.outlets, outlet] };
    setSelectedClient(updated);
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleSaveDiscount = async () => {
    if (!selectedClient) return;
    const percent = discountValue.trim() === '' ? 0 : parseFloat(discountValue);
    if (isNaN(percent) || percent < 0 || percent > 100) return;
    setSavingDiscount(true);
    try {
      await updateClient(selectedClient.id, { discountPercent: percent });
      const updated = { ...selectedClient, discountPercent: percent };
      setSelectedClient(updated);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Error saving discount:', err);
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleToggleWorkshopFlag = async () => {
    if (!selectedClient) return;
    const newValue = !selectedClient.isInternalWorkshop;
    setSavingWorkshopFlag(true);
    try {
      await updateClient(selectedClient.id, { isInternalWorkshop: newValue });
      const updated = { ...selectedClient, isInternalWorkshop: newValue };
      setSelectedClient(updated);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Error updating workshop flag:', err);
    } finally {
      setSavingWorkshopFlag(false);
    }
  };

  if (loading) {
    return <WorkshopLoader text="Загрузка клиентов..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Клиенты</h1>
            <p className="text-white/60 text-sm mt-0.5">{clients.length} компаний</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Clients List */}
      <div className="px-4 py-4 space-y-3">
        {clients.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Нет клиентов</h3>
              <p className="text-slate-500 mb-4">Создайте первого клиента с email и паролем.<br/>Он сможет заходить в Цех и делать заказы.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Создать клиента
              </Button>
            </CardBody>
          </Card>
        ) : (
          clients.map((client, index) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}>
              <Card hover onClick={() => handleOpenClient(client)}>
                <CardBody className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-workshop-100 flex items-center justify-center flex-shrink-0">
                    <UserGroupIcon className="w-6 h-6 text-workshop-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {client.companyName || client.email}
                      </h3>
                      {!client.isActive && <Badge variant="danger" size="sm">Неактивен</Badge>}
                      {!client.onboardingCompleted && <Badge variant="warning" size="sm">Ожидает</Badge>}
                      {client.discountPercent != null && client.discountPercent > 0 && (
                        <Badge variant="default" size="sm">-{client.discountPercent}%</Badge>
                      )}
                      {client.isInternalWorkshop && (
                        <Badge variant="info" size="sm">🏭 Цех</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {client.contactPerson || (client.onboardingCompleted ? '' : 'Не прошёл онбординг')}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-slate-400">
                        <BuildingStorefrontIcon className="w-4 h-4" />
                        <span className="text-sm">{client.outlets.filter(o => o.isActive).length} точек</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <EnvelopeIcon className="w-4 h-4" />
                        <span className="text-sm truncate">{client.email}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-slate-400" />
                </CardBody>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Client Details Modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={() => setSelectedClient(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-shrink-0 p-6 pb-0">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {selectedClient.companyName || selectedClient.email}
                </h2>
                <p className="text-slate-500 mb-4">
                  {selectedClient.contactPerson || (selectedClient.onboardingCompleted ? '' : '⏳ Клиент ещё не заполнил данные')}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><EnvelopeIcon className="w-4 h-4" /> Email:</span>
                    <span className="text-slate-900 font-medium">{selectedClient.email}</span>
                  </div>
                  {selectedClient.phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1"><PhoneIcon className="w-4 h-4" /> Телефон:</span>
                      <span className="text-slate-900">{selectedClient.phone}</span>
                    </div>
                  )}
                </div>

                {/* Discount — owner only */}
                {isOwner && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-sm text-amber-700 font-medium whitespace-nowrap">Скидка %</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-20 h-8 text-center font-semibold text-slate-900 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={handleSaveDiscount}
                      disabled={savingDiscount}
                      className="ml-auto px-3 py-1.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      {savingDiscount ? '...' : 'Сохранить'}
                    </button>
                  </div>
                )}

                {/* Internal Workshop toggle — owner only */}
                {isOwner && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Клиент-цех</p>
                      <p className="text-xs text-slate-500 mt-0.5">Видит позиции, скрытые от других клиентов</p>
                    </div>
                    <button
                      onClick={handleToggleWorkshopFlag}
                      disabled={savingWorkshopFlag}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        selectedClient.isInternalWorkshop ? 'bg-workshop-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          selectedClient.isInternalWorkshop ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Show discount badge for non-owners if it exists */}
                {!isOwner && selectedClient.discountPercent != null && selectedClient.discountPercent > 0 && (
                  <div className="mb-4 p-2 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    <span className="text-sm text-amber-700 font-medium">Скидка: {selectedClient.discountPercent}%</span>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200">
                  <button
                    onClick={() => setDetailTab('outlets')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                      detailTab === 'outlets'
                        ? 'border-workshop-500 text-workshop-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BuildingStorefrontIcon className="w-4 h-4 inline mr-1.5" />
                    Точки ({selectedClient.outlets.length})
                  </button>
                  <button
                    onClick={() => setDetailTab('orders')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                      detailTab === 'orders'
                        ? 'border-workshop-500 text-workshop-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5" />
                    Заказы ({clientOrders.length})
                  </button>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {detailTab === 'outlets' ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">
                        Точки ({selectedClient.outlets.length})
                      </h3>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddOutlet(true)}>
                        <PlusIcon className="w-4 h-4 mr-1" /> Добавить
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedClient.outlets.map(outlet => (
                        <div key={outlet.id}
                          className={`p-3 rounded-xl border ${outlet.isActive ? 'border-slate-200 bg-white' : 'border-red-100 bg-red-50'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{outlet.name}</p>
                              <p className="text-sm text-slate-500">{outlet.address}</p>
                              {outlet.phone && <p className="text-xs text-slate-400 mt-0.5">{outlet.phone}</p>}
                            </div>
                            {!outlet.isActive && <Badge variant="danger" size="sm">Неактивна</Badge>}
                          </div>
                        </div>
                      ))}
                      {selectedClient.outlets.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Нет точек. Добавьте первую.</p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Orders tab */
                  ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin w-6 h-6 border-2 border-workshop-500 border-t-transparent rounded-full" />
                      <span className="ml-3 text-slate-500 text-sm">Загрузка заказов...</span>
                    </div>
                  ) : clientOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardDocumentListIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Нет заказов</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientOrders.map(order => (
                        <div key={order.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                          {/* Order header */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{order.outletName}</p>
                              <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                            </div>
                            <Badge variant={ORDER_STATUS_VARIANT[order.status]} size="sm">
                              {ORDER_STATUS_LABEL[order.status]}
                            </Badge>
                          </div>

                          {/* Items */}
                          <div className="space-y-1 py-2 border-t border-slate-100">
                            {order.items.slice(0, 5).map(item => (
                              <div key={item.productId} className="flex justify-between text-sm">
                                <span className="text-slate-600 truncate">
                                  {getLocalizedName(item.productName)} × {item.quantity}
                                </span>
                                <span className="text-slate-900 font-medium ml-2 flex-shrink-0">
                                  {item.subtotal.toLocaleString()} ₸
                                </span>
                              </div>
                            ))}
                            {order.items.length > 5 && (
                              <p className="text-xs text-slate-400">+{order.items.length - 5} ещё...</p>
                            )}
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 mt-2">
                              💬 {order.notes}
                            </div>
                          )}

                          {/* Discount info */}
                          {order.discountPercent != null && order.discountPercent > 0 && (
                            <div className="flex justify-between text-xs text-amber-600 mt-1 pt-1 border-t border-slate-100">
                              <span>Скидка {order.discountPercent}%</span>
                              <span>−{(order.discountAmount || 0).toLocaleString()} ₸</span>
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                            <span className="text-xs text-slate-500">Итого</span>
                            <span className="font-bold text-slate-900">{order.totalAmount.toLocaleString()} ₸</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
                
              <div className="flex-shrink-0 px-6 pb-6 pt-3">
                <Button fullWidth variant="outline" onClick={() => setSelectedClient(null)}>Закрыть</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Client Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateClientModal
            onCreated={handleClientCreated}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Add Outlet Modal */}
      <AnimatePresence>
        {showAddOutlet && selectedClient && (
          <AddOutletModal
            client={selectedClient}
            onAdded={handleOutletAdded}
            onClose={() => setShowAddOutlet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientsPage;
