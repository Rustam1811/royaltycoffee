/**
 * UserDiscountModal — назначить персональную скидку клиенту по выбранным точкам.
 *
 * Доступно для super_owner / owner (везде) и для бариста (только своя точка).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, TrashIcon, CheckIcon, MapPinIcon } from '@heroicons/react/24/outline';
import {
  getUserDiscounts,
  setUserDiscount,
  removeUserDiscount,
  type PersonalDiscountsMap,
} from '@/services/personalDiscounts';
import { locationService } from '@/services/locationService';
import { Location } from '@/types/location';

interface Props {
  open: boolean;
  user: { uid: string; name?: string | null; phone?: string | null } | null;
  /** Если задан — баристе доступна только эта точка. */
  restrictedOutletId?: string | null;
  /** Роль текущего пользователя — управляет UI. */
  role: 'superowner' | 'owner' | 'admin' | 'barista' | string;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESET_PERCENTS = [0, 5, 10, 15, 20, 25, 30];

const UserDiscountModal: React.FC<Props> = ({ open, user, restrictedOutletId, role, onClose, onSaved }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [discounts, setDiscounts] = useState<PersonalDiscountsMap>({});
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [allOutlets, setAllOutlets] = useState(false);
  const [percent, setPercent] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChooseAll = role === 'superowner' || role === 'owner';
  const isBarista = role === 'barista';

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [locs, existing] = await Promise.all([
          locationService.getLocations().catch(() => [] as Location[]),
          getUserDiscounts(user.uid),
        ]);
        if (cancelled) return;
        const visibleLocs = isBarista && restrictedOutletId
          ? locs.filter(l => l.id === restrictedOutletId)
          : locs;
        setLocations(visibleLocs);
        setDiscounts(existing);
        // Преселект: если есть скидка для restrictedOutletId — заполнить
        if (isBarista && restrictedOutletId && existing[restrictedOutletId]) {
          setSelectedOutletIds([restrictedOutletId]);
          setPercent(existing[restrictedOutletId].percent);
        } else if (visibleLocs.length === 1) {
          setSelectedOutletIds([visibleLocs[0].id]);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки точек');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, isBarista, restrictedOutletId]);

  const hasAnySelection = allOutlets || selectedOutletIds.length > 0;

  const handleToggleOutlet = (id: string) => {
    setSelectedOutletIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    if (!hasAnySelection) {
      setError('Выберите хотя бы одну точку');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const targets = allOutlets ? ['*'] : selectedOutletIds;
      for (const outletId of targets) {
        await setUserDiscount(user.uid, outletId, percent, comment || undefined);
      }
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (outletId: string) => {
    if (!user) return;
    if (!confirm('Снять скидку с этой точки?')) return;
    setSaving(true);
    try {
      await removeUserDiscount(user.uid, outletId);
      const fresh = await getUserDiscounts(user.uid);
      setDiscounts(fresh);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const outletName = (id: string) => {
    if (id === '*') return 'Все точки';
    return locations.find(l => l.id === id)?.name || id;
  };

  const currentDiscountsEntries = useMemo(() => Object.entries(discounts), [discounts]);

  return (
    <AnimatePresence>
      {open && user && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto md:inset-x-auto md:right-0 md:bottom-0 md:top-0 md:w-[480px] md:rounded-l-3xl md:rounded-tr-none md:rounded-br-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Персональная скидка</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user.name || 'Клиент'}{user.phone ? ` · ${user.phone}` : ''}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <XMarkIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {loading && (
                <div className="text-center py-10 text-slate-500 text-sm">Загрузка...</div>
              )}

              {!loading && (
                <>
                  {/* Existing discounts */}
                  {currentDiscountsEntries.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                        Активные скидки
                      </h3>
                      <div className="space-y-2">
                        {currentDiscountsEntries.map(([outletId, entry]) => (
                          <div
                            key={outletId}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
                              {entry.percent}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 text-sm truncate">
                                {outletName(outletId)}
                              </div>
                              {entry.comment && (
                                <div className="text-xs text-slate-500 truncate">{entry.comment}</div>
                              )}
                            </div>
                            {(canChooseAll || (isBarista && outletId === restrictedOutletId)) && (
                              <button
                                onClick={() => handleRemove(outletId)}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                                disabled={saving}
                                aria-label="Удалить"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Outlets selector */}
                  <section>
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Применить к точкам
                    </h3>
                    {canChooseAll && (
                      <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-emerald-600"
                          checked={allOutlets}
                          onChange={e => setAllOutlets(e.target.checked)}
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-900">Все точки сети</div>
                          <div className="text-xs text-slate-500">Скидка действует везде</div>
                        </div>
                      </label>
                    )}
                    {!allOutlets && (
                      <div className="space-y-1.5">
                        {locations.length === 0 && (
                          <div className="text-sm text-slate-400 text-center py-4">Нет доступных точек</div>
                        )}
                        {locations.map(loc => (
                          <label
                            key={loc.id}
                            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                              selectedOutletIds.includes(loc.id)
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-emerald-600"
                              checked={selectedOutletIds.includes(loc.id)}
                              onChange={() => handleToggleOutlet(loc.id)}
                            />
                            <MapPinIcon className="w-4 h-4 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-slate-900 truncate">{loc.name}</div>
                              <div className="text-xs text-slate-500 truncate">{loc.address}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Percent */}
                  <section>
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Размер скидки
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESET_PERCENTS.map(p => (
                        <button
                          key={p}
                          onClick={() => setPercent(p)}
                          className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                            percent === p
                              ? 'bg-slate-900 text-white shadow-lg'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={percent}
                      onChange={e => setPercent(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </section>

                  {/* Comment */}
                  <section>
                    <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Комментарий (необязательно)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Например: партнёр / VIP"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </section>

                  {error && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading || !hasAnySelection}
                className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                {saving ? 'Сохраняем...' : `Сохранить ${percent}%`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserDiscountModal;
