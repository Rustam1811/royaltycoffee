import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MegaphoneIcon, TagIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ApiService } from '../services/apiConfig';
import { listContainer, listItem } from '../ui/motion';

interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  category?: string;
  minOrderAmount?: number;
  startDate: string | number | Date;
  endDate: string | number | Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  imageUrl?: string;
  image?: string;
  createdAt: string | number | Date;
}

interface PromotionBannerProps {
  className?: string;
  showAll?: boolean;
  maxItems?: number;
}

/** Формат текстов скидки (KZT) */
const getDiscountText = (p: Promotion) => {
  if (!p?.discountType || p.discountValue == null) return '0%';
  return p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue} ₸`;
};

/** Safely parse a date-like value (string, number, Date, or Firestore Timestamp {_seconds, _nanoseconds}) */
const safeParse = (ts: unknown): Date => {
  if (!ts) return new Date(NaN);
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj._seconds === 'number') return new Date(obj._seconds * 1000);
    if (typeof obj.seconds === 'number') return new Date((obj.seconds as number) * 1000);
  }
  return new Date(NaN);
};

const formatDateShort = (ts: string | number | Date) =>
  safeParse(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

const daysLeft = (endDate: string | number | Date) => {
  const now = new Date();
  const end = safeParse(endDate);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const PromotionBanner: React.FC<PromotionBannerProps> = ({
  className = '',
  showAll = false,
  maxItems = 3,
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    (async () => {
      try {
        const user = localStorage.getItem('user');
        const userId = user ? JSON.parse(user).id : null;
        const data = await ApiService.promotions.getAll(userId);

        const now = new Date();
        const active = (data.promotions || []).filter((promo: Promotion) => {
          const start = new Date(promo.startDate);
          const end = new Date(promo.endDate);
          const underLimit = !promo.usageLimit || promo.usedCount < promo.usageLimit;
          return promo.isActive && now >= start && now <= end && underLimit;
        });

        // Сортируем — скоро истекают выше
        active.sort((a: Promotion, b: Promotion) => {
          const da = new Date(a.endDate).getTime();
          const db = new Date(b.endDate).getTime();
          return da - db;
        });

        setPromotions(active);
      } catch (e) {
        console.error('Ошибка загрузки акций:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-[var(--radius)] bg-white/60 backdrop-blur animate-pulse shadow-card"
            />
          ))}
        </div>
      </div>
    );
  }

  const list = showAll ? promotions : promotions.slice(0, maxItems);
  if (list.length === 0) return null;

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3 px-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white shadow-lg">
          <MegaphoneIcon className="w-4 h-4" />
        </span>
        <h2 className="text-lg font-bold text-white tracking-tight">Акции</h2>
      </div>

      <AnimatePresence mode="sync">
        <motion.div
          variants={listContainer(0.05)}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {list.map((promotion) => {
            const left = daysLeft(promotion.endDate);
            const isHot = left <= 3;

            return (
              <motion.div
                key={promotion.id}
                variants={listItem(!!prefersReduced)}
                onClick={() => setSelectedPromo(promotion)}
                className="
                  relative overflow-hidden rounded-3xl
                  bg-gradient-to-br from-[#2D0F1A] via-[#3D1525] to-[#4A1A2C]
                  shadow-[0_16px_48px_-20px_rgba(0,0,0,0.5)] border border-amber-900/30
                  p-5 text-white cursor-pointer active:scale-[0.98] transition-transform
                  flex-shrink-0 w-[85vw] max-w-[360px] snap-center
                "
              >
                {/* градиентный акцент для "горячих" акций */}
                {isHot && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-2xl" />
                  </div>
                )}

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Чипы */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold bg-amber-500 text-black shadow-sm">
                        <TagIcon className="w-3.5 h-3.5" />
                        Скидка {getDiscountText(promotion)}
                      </span>
                      {promotion.category && (
                        <span className="inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-semibold bg-white/15 text-amber-200 border border-amber-500/30">
                          {promotion.category}
                        </span>
                      )}
                      {isHot && (
                        <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold bg-red-500 text-white shadow-sm">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {left === 0 ? 'Последний день' : `${left} дн.`}
                        </span>
                      )}
                    </div>

                    {/* Заголовок/описание */}
                    <h3 className="text-[16px] font-bold leading-tight line-clamp-1 text-white">
                      {promotion.title}
                    </h3>
                    {promotion.description && (
                      <p className="mt-1 text-[13px] text-amber-200/70 leading-snug line-clamp-2">
                        {promotion.description}
                      </p>
                    )}

                    {/* Мета */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-amber-200/60">
                      {promotion.minOrderAmount ? (
                        <span className="font-semibold">
                          От {promotion.minOrderAmount} ₸
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        до {formatDateShort(promotion.endDate)}
                      </span>
                      {promotion.usageLimit ? (
                        <span className="inline-flex items-center">
                          {promotion.usedCount}/{promotion.usageLimit}
                        </span>
                      ) : null}
                    </div>

                    {/* Прогресс лимита (если есть) */}
                    {promotion.usageLimit ? (
                      <div className="mt-3">
                        <div className="w-full h-1.5 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-amber-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(
                                (promotion.usedCount / (promotion.usageLimit || 1)) * 100,
                                100
                              )}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* картинка акции (если есть) */}
                  {promotion.imageUrl || promotion.image ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 border-2 border-amber-500/30 shadow-lg flex-shrink-0">
                      <img
                        src={promotion.imageUrl || promotion.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* ─── Promotion Detail Bottom Sheet ─── */}
      <AnimatePresence>
        {selectedPromo && (
          <>
            <motion.div
              key="promo-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
              onClick={() => setSelectedPromo(null)}
            />
            <motion.div
              key="promo-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[60] max-h-[90vh] bg-gradient-to-b from-[#2D0F1A] to-[#1a0e14] rounded-t-[28px] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-white/15" />
              </div>

              {/* Hero image */}
              {(selectedPromo.imageUrl || selectedPromo.image) && (
                <div className="relative h-52 mx-4 rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={selectedPromo.imageUrl || selectedPromo.image}
                    alt={selectedPromo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2D0F1A] via-transparent to-transparent" />
                  {/* Discount badge on image */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-sm font-extrabold shadow-lg shadow-amber-500/30">
                      <TagIcon className="w-4 h-4" />
                      {getDiscountText(selectedPromo)}
                    </span>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6 space-y-5">
                {/* Title + description */}
                <div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight">
                    {selectedPromo.title}
                  </h2>
                  {selectedPromo.description && (
                    <p className="mt-2 text-[15px] text-white/50 leading-relaxed">
                      {selectedPromo.description}
                    </p>
                  )}
                </div>

                {/* Discount card (if no image — show standalone) */}
                {!(selectedPromo.imageUrl || selectedPromo.image) && (
                  <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <TagIcon className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-sm font-medium text-white/70">Скидка</span>
                    </div>
                    <span className="text-2xl font-extrabold text-amber-400">
                      {getDiscountText(selectedPromo)}
                    </span>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Period */}
                  <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CalendarIcon className="w-4 h-4 text-white/30" />
                      <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Период</span>
                    </div>
                    <p className="text-[13px] font-bold text-white/80">
                      {formatDateShort(selectedPromo.startDate)} — {formatDateShort(selectedPromo.endDate)}
                    </p>
                  </div>

                  {/* Days left */}
                  {(() => {
                    const left = daysLeft(selectedPromo.endDate);
                    const isUrgent = left <= 3;
                    return (
                      <div className={`rounded-2xl p-3.5 border ${
                        isUrgent ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.04] border-white/[0.06]'
                      }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <ClockIcon className={`w-4 h-4 ${isUrgent ? 'text-red-400/60' : 'text-white/30'}`} />
                          <span className={`text-[11px] font-semibold uppercase tracking-wider ${isUrgent ? 'text-red-400/50' : 'text-white/30'}`}>Осталось</span>
                        </div>
                        <p className={`text-[13px] font-bold ${isUrgent ? 'text-red-400' : 'text-white/80'}`}>
                          {left === 0 ? 'Последний день!' : `${left} дн.`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Min order */}
                  {selectedPromo.minOrderAmount ? (
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
                      <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Мин. сумма</span>
                      <p className="text-[13px] font-bold text-white/80 mt-1.5">{selectedPromo.minOrderAmount} ₸</p>
                    </div>
                  ) : null}

                  {/* Category */}
                  {selectedPromo.category && (
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
                      <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Категория</span>
                      <p className="text-[13px] font-bold text-amber-300/80 mt-1.5">{selectedPromo.category}</p>
                    </div>
                  )}
                </div>

                {/* Usage progress */}
                {selectedPromo.usageLimit ? (
                  <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Использовано</span>
                      <span className="text-sm font-bold text-white/70">
                        {selectedPromo.usedCount} / {selectedPromo.usageLimit}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            (selectedPromo.usedCount / (selectedPromo.usageLimit || 1)) * 100,
                            100
                          )}%`,
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Close button */}
                <button
                  onClick={() => setSelectedPromo(null)}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/20"
                >
                  Понятно
                </button>

                {/* Safe area bottom — clear bottom nav */}
                <div className="h-20" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* --------- MODAL (без бордеров, стекло, тени) ---------- */

export const PromotionModal: React.FC<{
  promotion: Promotion;
  isOpen: boolean;
  onClose: () => void;
}> = ({ promotion, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="sheet"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="
          fixed inset-x-4 top-[8vh] z-50 max-w-md mx-auto
          rounded-[var(--radius)] overflow-hidden
          bg-surface shadow-float
        "
        onClick={(e) => e.stopPropagation()}
      >
        { (promotion.imageUrl || promotion.image) && (
          <div className="relative h-44 overflow-hidden">
            <img
              src={promotion.imageUrl || promotion.image}
              alt={promotion.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-transparent" />
          </div>
        )}

        <div className="p-5">
          <h2 className="text-[18px] font-extrabold tracking-tight text-[var(--text-primary)]">
            {promotion.title}
          </h2>
          {promotion.description && (
            <p className="mt-2 text-[14px] text-[var(--text-secondary)] leading-snug">
              {promotion.description}
            </p>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-black/5 p-3">
              <span className="font-medium text-[14px]">Скидка</span>
              <span className="text-[16px] font-extrabold text-[var(--text-primary)]">
                {getDiscountText(promotion)}
              </span>
            </div>

            {promotion.minOrderAmount ? (
              <div className="flex items-center justify-between rounded-2xl bg-black/5 p-3">
                <span className="font-medium text-[14px]">Минимальная сумма</span>
                <span className="text-[14px] font-semibold">
                  {promotion.minOrderAmount} ₸
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl bg-black/5 p-3">
              <span className="font-medium text-[14px]">Действует до</span>
              <span className="text-[14px] font-semibold">
                {new Date(promotion.endDate).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              w-full mt-5 h-11 rounded-full
              bg-black text-white font-semibold
              shadow-press active:scale-[.98] transition
            "
          >
            Понятно
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
