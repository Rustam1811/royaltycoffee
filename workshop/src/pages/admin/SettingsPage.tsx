import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ClockIcon,
  Cog6ToothIcon,
  CheckIcon,
  TruckIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, Button, Input, WorkshopLoader } from '@/components/ui';
import { getWorkshopSettings, updateWorkshopSettings, getAllClients } from '@/services';
import { WorkshopClient } from '@/types';

const DAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
];

/**
 * Настройки цеха — для owner/superowner
 */
const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local form state
  const [cutoffTime, setCutoffTime] = useState('17:00');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [contactPhone, setContactPhone] = useState('');
  const [showDeliveryTime, setShowDeliveryTime] = useState(true);
  const [ownOutletIds, setOwnOutletIds] = useState<string[]>([]);

  // All outlets from all clients for the "own outlets" picker
  const [allOutlets, setAllOutlets] = useState<{ id: string; name: string; company: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, clientsData] = await Promise.all([
          getWorkshopSettings(),
          getAllClients(),
        ]);
        setCutoffTime(s.orderCutoffTime);
        setWorkingDays(s.workingDays);
        setContactPhone(s.contactPhone);
        setShowDeliveryTime(s.showDeliveryTime ?? true);
        setOwnOutletIds(s.ownOutletIds ?? []);

        // Build flat outlet list
        const outlets: { id: string; name: string; company: string }[] = [];
        const seen = new Set<string>();
        clientsData.forEach((c: WorkshopClient) => {
          c.outlets?.forEach(o => {
            if (!seen.has(o.id)) {
              seen.add(o.id);
              outlets.push({ id: o.id, name: o.name, company: c.companyName });
            }
          });
        });
        setAllOutlets(outlets.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateWorkshopSettings({
        orderCutoffTime: cutoffTime,
        workingDays,
        contactPhone,
        showDeliveryTime,
        ownOutletIds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WorkshopLoader text="Загрузка настроек..." />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Cog6ToothIcon className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold">Настройки</h1>
            <p className="text-white/60 text-sm mt-0.5">Параметры работы цеха</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Cutoff Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-workshop-500" />
              <h3 className="font-semibold text-slate-900">Время приёма заказов</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-500">
                Клиенты не смогут оформить заказ после этого времени.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 font-medium">До:</span>
                <input
                  type="time"
                  value={cutoffTime}
                  onChange={e => setCutoffTime(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-workshop-500 text-lg font-semibold text-slate-900"
                />
              </div>
              <p className="text-xs text-slate-400">
                Текущее: <strong>{cutoffTime}</strong>. Клиенты увидят «Заказ закрыт» после этого часа.
              </p>
            </CardBody>
          </Card>
        </motion.div>

        {/* Working Days */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Рабочие дни</h3>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`w-11 h-11 rounded-full text-sm font-semibold transition-all ${
                      workingDays.includes(d.value)
                        ? 'bg-workshop-500 text-white'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Контакт цеха</h3>
            </CardHeader>
            <CardBody>
              <Input
                label="Телефон"
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+7 777 123 45 67"
              />
            </CardBody>
          </Card>
        </motion.div>

        {/* Delivery time visibility */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-900">Время доставки</h3>
            </CardHeader>
            <CardBody>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-800">Показывать клиентам</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Клиенты увидят указанное время доставки в своих заказах
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeliveryTime(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${showDeliveryTime ? 'bg-workshop-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showDeliveryTime ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </CardBody>
          </Card>
        </motion.div>

        {/* Own outlets (sorted first in reports) */}
        {allOutlets.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="flex items-center gap-2">
                <BuildingOffice2Icon className="w-5 h-5 text-workshop-500" />
                <h3 className="font-semibold text-slate-900">Собственные точки</h3>
              </CardHeader>
              <CardBody>
                <p className="text-xs text-slate-500 mb-3">
                  Выбранные точки будут отображаться первыми в матрице и накладных.
                </p>
                <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto">
                  {allOutlets.map(outlet => (
                    <label key={outlet.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                      <input
                        type="checkbox"
                        checked={ownOutletIds.includes(outlet.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setOwnOutletIds(prev => [...prev, outlet.id]);
                          } else {
                            setOwnOutletIds(prev => prev.filter(id => id !== outlet.id));
                          }
                        }}
                        className="rounded border-slate-300 text-workshop-500 focus:ring-workshop-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{outlet.name}</p>
                        <p className="text-xs text-slate-400 truncate">{outlet.company}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {ownOutletIds.length > 0 && (
                  <p className="text-xs text-workshop-600 mt-2">
                    Выбрано {ownOutletIds.length} из {allOutlets.length} точек
                  </p>
                )}
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Save */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button fullWidth size="lg" onClick={handleSave} loading={saving}>
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <CheckIcon className="w-5 h-5" /> Сохранено!
              </span>
            ) : (
              'Сохранить настройки'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
