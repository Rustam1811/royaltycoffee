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
} from '@heroicons/react/24/outline';
import { Card, CardBody, Badge, Button, PageLoader, Input } from '@/components/ui';
import { getAllClients, createClient, addOutlet } from '@/services';
import { WorkshopClient, ClientOutlet } from '@/types';
import { auth } from '@/lib/firebase';

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
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
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<WorkshopClient | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddOutlet, setShowAddOutlet] = useState(false);

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

  const handleOutletAdded = (outlet: ClientOutlet) => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, outlets: [...selectedClient.outlets, outlet] };
    setSelectedClient(updated);
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  if (loading) {
    return <PageLoader text="Загрузка клиентов..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Клиенты</h1>
            <p className="text-workshop-100 mt-1">{clients.length} компаний</p>
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
              <Card hover onClick={() => setSelectedClient(client)}>
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSelectedClient(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {selectedClient.companyName || selectedClient.email}
                </h2>
                <p className="text-slate-500 mb-4">
                  {selectedClient.contactPerson || (selectedClient.onboardingCompleted ? '' : '⏳ Клиент ещё не заполнил данные')}
                </p>
                
                <div className="space-y-2 mb-6">
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
                
                <div className="mt-6">
                  <Button fullWidth variant="outline" onClick={() => setSelectedClient(null)}>Закрыть</Button>
                </div>
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
