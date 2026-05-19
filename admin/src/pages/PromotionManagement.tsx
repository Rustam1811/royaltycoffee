// src/admin/PromotionManagement.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import { api } from '../services/api';
import { toISODate, safeStringValue } from '../utils/date';
import { useImageUpload } from '../hooks/useImageUpload';
import { ImageUploader } from '../components/ImageUploader';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discount?: number; // legacy field name from older promotions
  startDate: string;
  endDate: string;
  category: string;
  minOrderAmount: number;
  targetAudience: 'all_users' | 'loyal_customers';
  isActive: boolean;
  usageCount: number;
  createdAt?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Все категории' },
  { value: 'coffee', label: 'Кофе' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'desserts', label: 'Десерты' },
  { value: 'breakfast', label: 'Завтраки' },
];

/** Safely convert any date-like value (string, Date, Firestore Timestamp) to Date */
interface FirestoreTimestampLike {
  toDate(): Date;
  seconds: number;
}
const safeDateParse = (d?: unknown): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') { const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; }
  if (typeof d === 'object' && d !== null && typeof (d as FirestoreTimestampLike).toDate === 'function') return (d as FirestoreTimestampLike).toDate();
  if (typeof d === 'object' && d !== null && typeof (d as { seconds: number }).seconds === 'number') return new Date((d as { seconds: number }).seconds * 1000);
  return null;
};

const fmtDate = (d?: unknown) => {
  const dt = safeDateParse(d);
  return dt ? dt.toLocaleDateString('ru-RU') : '—';
};
const nowBetween = (start?: unknown, end?: unknown) => {
  const s = safeDateParse(start);
  const e = safeDateParse(end);
  if (!s || !e) return false;
  const n = Date.now();
  return n >= s.getTime() && n <= e.getTime();
};

const chip = (text: string, tone: 'green' | 'gray' | 'amber' = 'gray') =>
  `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
    tone === 'green'
      ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/30'
      : tone === 'amber'
      ? 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/30'
      : 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-300/60'
  }`;

// ───────────────────────────────────────────────────────────

const PromotionManagement: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  // Image upload hook
  const { uploading, progress, error: uploadError, upload, reset: resetUpload } = useImageUpload();

  const [form, setForm] = useState({
    title: '',
    description: '',
    image: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    startDate: '',
    endDate: '',
    category: 'all',
    minOrderAmount: 0,
    targetAudience: 'all_users' as 'all_users' | 'loyal_customers',
    isActive: true,
  });

  // ui filters
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ promotions: Promotion[] } | Promotion[]>('/promo?action=promotions');
      setPromotions((data as { promotions: Promotion[] }).promotions || data as Promotion[]);
    } catch (e) {
      console.error('Ошибка загрузки акций:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      image: '',
      discountType: 'percentage',
      discountValue: 0,
      startDate: '',
      endDate: '',
      category: 'all',
      minOrderAmount: 0,
      targetAudience: 'all_users',
      isActive: true,
    });
    resetUpload();
  };

  const handleImageUpload = async (file: File) => {
    const result = await upload(file);
    if (result) {
      setForm({ ...form, image: result.url });
    }
  };

  const onEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      title: safeStringValue(p.title, ''),
      description: safeStringValue(p.description, ''),
      image: safeStringValue(p.image, ''),
      discountType: p.discountType || 'percentage',
      discountValue: p.discountValue ?? p.discount ?? 0,
      startDate: toISODate(p.startDate),
      endDate: toISODate(p.endDate),
      category: safeStringValue(p.category, 'all'),
      minOrderAmount: p.minOrderAmount,
      targetAudience: p.targetAudience || 'all_users',
      isActive: p.isActive,
    });
    setShowModal(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm('Удалить эту акцию?')) return;
    setLoading(true);
    try {
      await api.delete(`/promo?action=promotions&id=${id}`);
      await fetchPromotions();
    } catch (e) {
      console.error('Ошибка удаления:', e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = editing ? { ...form, id: editing.id } : form;
      const path = `/promo?action=promotions${editing ? `&id=${editing.id}` : ''}`;
      
      if (editing) {
        await api.put(path, body);
      } else {
        await api.post(path, body);
      }
      
      await fetchPromotions();
      setShowModal(false);
      setEditing(null);
      resetForm();
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return promotions
      .filter((p) => (cat === 'all' ? true : p.category === cat))
      .filter((p) =>
        status === 'all'
          ? true
          : status === 'active'
          ? p.isActive && nowBetween(p.startDate, p.endDate)
          : !p.isActive || !nowBetween(p.startDate, p.endDate)
      )
      .filter((p) => (q ? `${p.title} ${p.description}`.toLowerCase().includes(q.toLowerCase()) : true));
  }, [promotions, q, cat, status]);

  const totalActive = promotions.filter((p) => p.isActive && nowBetween(p.startDate, p.endDate)).length;
  const totalSoon = promotions.filter((p) => p.isActive && !nowBetween(p.startDate, p.endDate)).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-b from-slate-100 via-slate-100 to-white min-h-screen pb-20"
    >
      <div className="max-w-7xl mx-auto p-3 sm:p-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 -mx-6 mb-6 px-6 py-4 bg-transparent shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TagIcon className="w-7 h-7 text-white drop-shadow" />
              <h1 className="text-2xl font-bold text-slate-900 font-sans">
                Управление акциями
              </h1>
            </div>
            <motion.button
              onClick={() => {
                resetForm();
                setEditing(null);
                setShowModal(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-900 text-white px-5 py-3 rounded-3xl font-semibold shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] hover:bg-white transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Новая акция
            </motion.button>
          </div>
          {/* quick stats */}
          <div className="mt-4 flex gap-3">
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-300">
              {promotions.length} всего
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/30">
              {totalActive} активны
            </span>
            {totalSoon > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/30">
                {totalSoon} запланированы
              </span>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 bg-slate-100 rounded-3xl px-4">
              <div className="flex items-center gap-3 h-12">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-600" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск по названию или описанию…"
                  className="w-full bg-transparent outline-none text-sm text-slate-900 font-sans"
                />
              </div>
            </div>

            <div className="bg-slate-100 rounded-3xl px-4 min-w-[200px]">
              <div className="flex items-center gap-3 h-12">
                <FunnelIcon className="w-5 h-5 text-slate-600" />
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="bg-transparent outline-none text-sm text-slate-900 font-sans w-full"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-100 rounded-3xl px-4 min-w-[180px]">
              <div className="flex items-center gap-3 h-12">
                <CheckSolid className="w-5 h-5 text-slate-600" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="bg-transparent outline-none text-sm text-slate-900 font-sans w-full"
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Неактивные</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* List */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] p-4"
                >
                  <div className="h-40 bg-slate-100 rounded-3xl mb-4 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded mb-2 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded mb-6 animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded-3xl animate-pulse" />
                </motion.div>
              ))}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center text-slate-600 py-16 bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)]"
            >
              <TagIcon className="w-16 h-16 mx-auto mb-4 opacity-50 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900 font-sans">Акций пока нет</h3>
              <p className="text-sm text-slate-600 font-sans mt-2">Создайте первую акцию, чтобы порадовать гостей.</p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {filtered.map((p, index) => {
                const active = p.isActive && nowBetween(p.startDate, p.endDate);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Image */}
                    {p.image && (
                      <div className="relative h-48">
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                        {/* top tools */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <motion.button
                            onClick={() => onEdit(p)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-10 h-10 rounded-3xl bg-white/90 hover:bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all duration-200"
                            title="Редактировать"
                          >
                            <PencilIcon className="w-4 h-4 text-slate-900" />
                          </motion.button>
                          <motion.button
                            onClick={() => onDelete(p.id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-10 h-10 rounded-3xl bg-white/90 hover:bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all duration-200"
                            title="Удалить"
                          >
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </motion.button>
                        </div>

                        {/* status chip */}
                        <div className="absolute left-3 top-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            active 
                              ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/30' 
                              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-300'
                          }`}>
                            {active ? 'Активна' : 'Неактивна'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 font-sans mb-2 line-clamp-2">{p.title}</h3>
                          <p className="text-sm text-slate-600 font-sans line-clamp-3">{p.description}</p>
                        </div>
                        {!p.image && (
                          <div className="flex gap-2">
                            <motion.button 
                              onClick={() => onEdit(p)} 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </motion.button>
                            <motion.button 
                              onClick={() => onDelete(p.id)} 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-xl hover:bg-slate-100"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </motion.button>
                          </div>
                        )}
                      </div>

                      {/* Discount card */}
                      <div className="mt-4 rounded-3xl bg-gradient-to-br from-[var(--color-accent-orange)]/10 via-[var(--color-accent-pink)]/6 to-transparent ring-1 ring-[var(--color-accent-orange)]/20 p-4 text-center">
                        <div className="text-3xl font-bold text-slate-900 font-sans">
                          {p.discountType === 'percentage' 
                            ? `${p.discountValue ?? p.discount ?? 0}%` 
                            : `${p.discountValue ?? p.discount ?? 0}₸`}
                        </div>
                        <div className="text-xs text-slate-600 font-sans mt-1">
                          {p.discountType === 'percentage' ? 'скидка' : 'фиксированная скидка'}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-sans">Период</span>
                          <span className="flex items-center gap-1 text-slate-900 font-sans">
                            <CalendarIcon className="w-4 h-4" />
                            {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-sans">Категория</span>
                          <span className="text-slate-900 font-sans">{p.category}</span>
                        </div>
                        {p.minOrderAmount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-sans">Мин. заказ</span>
                            <span className="text-slate-900 font-sans">{p.minOrderAmount}₸</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-sans">Использований</span>
                          <span className="text-slate-900 font-sans">{p.usageCount}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          p.targetAudience === 'all_users' 
                            ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-300' 
                            : 'bg-gradient-to-r from-[var(--color-accent-orange)]/10 to-[var(--color-accent-pink)]/10 text-amber-600 ring-1 ring-[var(--color-accent-orange)]/20'
                        }`}>
                          {p.targetAudience === 'all_users' ? 'Все пользователи' : 'Постоянные'}
                        </span>
                        {active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                            <CheckCircleIcon className="w-4 h-4" /> Действует
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm font-sans">Неактивна</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50">
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="relative mx-auto mt-8 w-[min(920px,92vw)] bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] flex flex-col max-h-[90vh]"
              >
                {/* Modal header */}
                <div className="px-6 py-4 bg-gradient-to-b from-[var(--color-bg-elevated)] to-[var(--color-bg-elevated)]/60 border-b border-slate-200 shrink-0">
                  <h2 className="text-xl font-bold text-slate-900 font-sans">
                    {editing ? 'Редактировать акцию' : 'Новая акция'}
                  </h2>
                </div>

                <form onSubmit={onSubmit} className="p-4 overflow-y-auto grow">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* form left (2 cols) */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Название</label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Описание</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          rows={3}
                          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Тип скидки</label>
                          <select
                            value={form.discountType}
                            onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed' })}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                          >
                            <option value="percentage">Процент (%)</option>
                            <option value="fixed">Фиксированная (₸)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Размер скидки</label>
                          <input
                            type="number"
                            value={String(form.discountValue || '')}
                            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) || 0 })}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                            min={0}
                            step={form.discountType === 'percentage' ? 1 : 1}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Дата начала</label>
                          <input
                            type="date"
                            value={toISODate(form.startDate)}
                            onChange={(e) => setForm({ ...form, startDate: toISODate(e.target.value) })}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 font-sans mb-2">Дата окончания</label>
                          <input
                            type="date"
                            value={toISODate(form.endDate)}
                            onChange={(e) => setForm({ ...form, endDate: toISODate(e.target.value) })}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 text-slate-900 font-sans"
                            required
                          />
                        </div>
                      </div>

                      {/* Image uploader */}
                      <ImageUploader
                        imageUrl={form.image}
                        onImageChange={(url) => setForm({ ...form, image: url })}
                        uploading={uploading}
                        progress={progress}
                        error={uploadError}
                        onUpload={handleImageUpload}
                      />
                    </div>
                    {/* preview right (1 col) */}
                    <div className="md:col-span-1 elev-card overflow-hidden flex flex-col justify-between">
                      <div className="h-40 bg-slate-100 flex items-center justify-center">
                        {form.image ? (
                          <img src={form.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-400 text-sm">Превью изображения</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="text-sm font-semibold">{form.title || 'Название акции'}</div>
                        <div className="text-xs text-slate-600 line-clamp-2 mt-1">
                          {form.description || 'Краткое описание…'}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={chip(form.discountType === 'percentage' ? `${form.discountValue || 0}%` : `${form.discountValue || 0}₸`, 'amber')} />
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {form.startDate || '—'} — {form.endDate || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditing(null);
                        resetForm();
                      }}
                      className="glossy-pill px-4 py-2 text-sm font-semibold active:scale-95"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-semibold shadow-[0_12px_36px_-16px_rgba(0,0,0,0.65)] hover:bg-black active:scale-95 disabled:opacity-60"
                    >
                      {loading ? 'Сохранение…' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      {/* End Modal */}
      </div>
    </motion.div>
  );
};

export default PromotionManagement;
