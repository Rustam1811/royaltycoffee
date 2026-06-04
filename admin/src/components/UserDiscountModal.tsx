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

type Category = 'drinks' | 'food' | 'all';

const CATEGORY_OPTIONS: { value: Category; label: string; emoji: string; hint: string }[] = [
  { value: 'drinks', label: 'Напитки', emoji: '☕', hint: 'Фикс. скидка на напитки. Накопительная лояльность в этой точке перестаёт расти.' },
  { value: 'food',   label: 'Выпечка', emoji: '🥐', hint: 'Скидка только на еду. Накопительная лояльность не меняется.' },
  { value: 'all',    label: 'Всё',     emoji: '🛒', hint: 'Фикс. скидка на весь чек. Накопительная лояльность в этой точке перестаёт расти.' },
];

const UserDiscountModal: React.FC<Props> = ({ open, user, restrictedOutletId, role, onClose, onSaved }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [discounts, setDiscounts] = useState<PersonalDiscountsMap>({});
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [allOutlets, setAllOutlets] = useState(false);
  const [percent, setPercent] = useState(5);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState<Category>('drinks');
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
        // Преселект: для бариста — всегда его единственная точка
        if (isBarista && restrictedOutletId) {
          setSelectedOutletIds([restrictedOutletId]);
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
        await setUserDiscount(user.uid, outletId, percent, comment || undefined, category);
      }
      const fresh = await getUserDiscounts(user.uid);
      setDiscounts(fresh);
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (key: string) => {
    if (!user) return;
    if (!confirm('Снять скидку?')) return;
    setSaving(true);
    try {
      await removeUserDiscount(user.uid, key);
      const fresh = await getUserDiscounts(user.uid);
      setDiscounts(fresh);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  /** Парсинг ключа discounts: `outletId:category` или legacy `outletId`. */
  const parseKey = (key: string): { outletId: string; cat: Category } => {
    const colon = key.indexOf(':');
    if (colon === -1) return { outletId: key, cat: 'all' };
    return { outletId: key.slice(0, colon), cat: (key.slice(colon + 1) as Category) || 'all' };
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
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Centered modal */}
          <div className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-4 pointer-events-none">
            <motion.div
              className="pointer-events-auto bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {/* Header */}
              <div className="flex-shrink-0 bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 py-4 flex items-center justify-between text-white">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate">🏷️ Персональная скидка</h2>
                  <p className="text-xs text-emerald-100 mt-0.5 truncate">
                    {user.name || 'Клиент'}{user.phone ? ` · ${user.phone}` : ''}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition"
                  aria-label="Закрыть"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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
                        {currentDiscountsEntries.map(([key, entry]) => {
                          const { outletId, cat } = parseKey(key);
                          const catOpt = CATEGORY_OPTIONS.find(c => c.value === (entry.category || cat));
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200"
                            >
                              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white font-bold flex flex-col items-center justify-center text-sm leading-none">
                                <span>{entry.percent}%</span>
                                <span className="text-[10px] mt-0.5 opacity-90">{catOpt?.emoji}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate">
                                  {outletName(outletId)}
                                </div>
                                <div className="text-xs text-emerald-700 truncate">
                                  {catOpt?.label || 'Всё'}
                                  {entry.comment ? ` · ${entry.comment}` : ''}
                                </div>
                              </div>
                              {(canChooseAll || (isBarista && outletId === restrictedOutletId)) && (
                                <button
                                  onClick={() => handleRemove(key)}
                                  className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                                  disabled={saving}
                                  aria-label="Удалить"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Outlets selector — скрыто у бариста (у него одна точка) */}
                  {!isBarista && (
                    <section>
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                        Применить к точкам
                      </h3>
                      {canChooseAll && (
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 mb-2 cursor-pointer hover:bg-slate-50">
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
                  )}

                  {/* Для бариста — info-блок про его точку */}
                  {isBarista && locations[0] && (
                    <section className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <MapPinIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase text-slate-500 font-bold tracking-wider">Точка</div>
                        <div className="font-semibold text-sm text-slate-900 truncate">{locations[0].name}</div>
                      </div>
                    </section>
                  )}

                  {/* Category */}
                  <section>
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Тип скидки
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategory(opt.value)}
                          className={`p-3 rounded-2xl border text-center transition ${
                            category === opt.value
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-2xl leading-none">{opt.emoji}</div>
                          <div className={`text-xs font-bold mt-1 ${category === opt.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {opt.label}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                      {CATEGORY_OPTIONS.find(c => c.value === category)?.hint}
                    </p>
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
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
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
                      ⚠️ {error}
                    </div>
                  )}
                </>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white border-t border-slate-200 p-4 flex gap-3">
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
                  className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  <CheckIcon className="w-5 h-5" />
                  {saving ? 'Сохраняем...' : `Сохранить ${percent}%`}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserDiscountModal;
