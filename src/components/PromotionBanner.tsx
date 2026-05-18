import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TagIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ApiService } from '../services/apiConfig';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const user = localStorage.getItem('user');
        const userId = user ? (JSON.parse(user).uid || JSON.parse(user).id) : null;
        const data = await ApiService.promotions.getAll(userId);

        const now = new Date();
        const active = (data.promotions || []).filter((promo: Promotion) => {
          const start = new Date(promo.startDate);
          const end = new Date(promo.endDate);
          const underLimit = !promo.usageLimit || promo.usedCount < promo.usageLimit;
          return promo.isActive && now >= start && now <= end && underLimit;
        });

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

  // We need list early for handleScroll closure, so compute it here
  const list = showAll ? promotions : promotions.slice(0, maxItems);

  /* ─── Scroll-based dot indicator ─── */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || list.length === 0) return;
    const cardWidth = el.scrollWidth / list.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, list.length - 1));
  }, [list.length]);

  // Re-bind scroll handler when list changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll, list.length]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="px-4">
          <div className="h-48 rounded-2xl bg-white/60 backdrop-blur animate-pulse shadow-card" />
        </div>
      </div>
    );
  }

  if (list.length === 0) return null;

  return (
    <div className={`${className}`}>
      {/* ─── Horizontal image carousel ─── */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {list.map((promotion) => {
          const imgSrc = promotion.imageUrl || promotion.image;
          const left = daysLeft(promotion.endDate);
          const isHot = left <= 3;

          return (
            <motion.div
              key={promotion.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={() => setSelectedPromo(promotion)}
              className={`
                relative flex-shrink-0 snap-center cursor-pointer
                active:scale-[0.97] transition-transform duration-200
                ${list.length === 1 ? 'w-full' : 'w-[82vw] max-w-[360px]'}
              `}
            >
              {imgSrc ? (
                /* ─── Image card: fixed aspect ratio, object-cover ─── */
                <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-black/15 aspect-[4/5]">
                  <img
                    src={imgSrc}
                    alt={promotion.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                  {/* Subtle gradient overlay at bottom for readability */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Hot badge */}
                  {isHot && (
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-500/90 text-white shadow-lg backdrop-blur-sm">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {left === 0 ? 'Последний день' : `Ещё ${left} дн.`}
                      </span>
                    </div>
                  )}

                  {/* Discount badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-extrabold bg-[#D4AF37]/90 text-black shadow-lg backdrop-blur-sm">
                      <TagIcon className="w-3.5 h-3.5" />
                      {getDiscountText(promotion)}
                    </span>
                  </div>

                  {/* Title overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3">
                    <p className="text-white text-[14px] font-bold leading-tight line-clamp-1 drop-shadow-md">
                      {promotion.title}
                    </p>
                  </div>
                </div>
              ) : (
                /* ─── Fallback card (no image) — same aspect ratio ─── */
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#5A0D17] to-[#4A0E14] shadow-lg p-5 aspect-[4/5] flex flex-col justify-between border border-white/10">
                  {isHot && (
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-2xl" />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D4AF37] text-black">
                        <TagIcon className="w-3.5 h-3.5" />
                        {getDiscountText(promotion)}
                      </span>
                      {isHot && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-red-500 text-white">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {left === 0 ? 'Последний день' : `${left} дн.`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white text-[16px] font-bold leading-tight line-clamp-2">
                      {promotion.title}
                    </h3>
                    {promotion.description && (
                      <p className="mt-1.5 text-white/50 text-[13px] leading-snug line-clamp-2">
                        {promotion.description}
                      </p>
                    )}
                  </div>
                  <p className="relative z-10 text-white/30 text-[12px] mt-3">
                    до {formatDateShort(promotion.endDate)}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── Dot indicators ─── */}
      {list.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-1 px-4">
          {list.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? 'w-5 bg-[#D4AF37]'
                  : 'w-1.5 bg-[#3D0A11]/15'
              }`}
            />
          ))}
        </div>
      )}

      {/* ─── Premium Promotion Detail Bottom Sheet ─── */}
      <AnimatePresence>
        {selectedPromo && (
          <>
            <motion.div
              key="promo-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl"
              onClick={() => setSelectedPromo(null)}
            />
            <motion.div
              key="promo-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] rounded-t-[32px] flex flex-col overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #4A0E14 0%, #3D0A11 40%, #2C0810 100%)',
              }}
            >
              {/* Decorative gold line at top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Hero image */}
              {(selectedPromo.imageUrl || selectedPromo.image) ? (
                <div className="relative mx-4 mt-2 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 aspect-[16/10]">
                  <img
                    src={selectedPromo.imageUrl || selectedPromo.image}
                    alt={selectedPromo.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3D0A11] via-transparent to-transparent opacity-60" />
                  {/* Discount badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#3D0A11] text-[13px] font-extrabold shadow-lg shadow-[#D4AF37]/40">
                      <TagIcon className="w-4 h-4" />
                      {getDiscountText(selectedPromo)}
                    </span>
                  </div>
                </div>
              ) : (
                /* No-image: large discount display */
                <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/20 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center">
                      <TagIcon className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <span className="text-white/50 text-sm font-medium">Скидка</span>
                  </div>
                  <span className="text-3xl font-extrabold text-[#D4AF37]">
                    {getDiscountText(selectedPromo)}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-6 space-y-4">
                {/* Title + description */}
                <div>
                  <h2 className="text-[22px] font-extrabold text-white leading-tight tracking-tight">
                    {selectedPromo.title}
                  </h2>
                  {selectedPromo.description && (
                    <p className="mt-2.5 text-[14px] text-white/45 leading-relaxed">
                      {selectedPromo.description}
                    </p>
                  )}
                </div>

                {/* Info pills row */}
                <div className="flex flex-wrap gap-2">
                  {/* Days left pill */}
                  {(() => {
                    const left = daysLeft(selectedPromo.endDate);
                    const isUrgent = left <= 3;
                    return (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold ${
                        isUrgent
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : 'bg-white/5 text-white/60 border border-white/8'
                      }`}>
                        <ClockIcon className="w-3.5 h-3.5" />
                        {left === 0 ? 'Последний день!' : `Ещё ${left} дн.`}
                      </div>
                    );
                  })()}

                  {/* Period pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold bg-white/5 text-white/60 border border-white/8">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDateShort(selectedPromo.startDate)} — {formatDateShort(selectedPromo.endDate)}
                  </div>

                  {/* Category pill */}
                  {selectedPromo.category && (
                    <div className="inline-flex items-center px-3 py-2 rounded-xl text-[12px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/15">
                      {selectedPromo.category}
                    </div>
                  )}
                </div>

                {/* Details cards */}
                {(selectedPromo.minOrderAmount || selectedPromo.usageLimit) && (
                  <div className="space-y-2">
                    {selectedPromo.minOrderAmount ? (
                      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3.5">
                        <span className="text-[13px] text-white/40 font-medium">Минимальная сумма</span>
                        <span className="text-[14px] font-bold text-white">{selectedPromo.minOrderAmount} ₸</span>
                      </div>
                    ) : null}

                    {selectedPromo.usageLimit ? (
                      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[13px] text-white/40 font-medium">Использовано</span>
                          <span className="text-[13px] font-bold text-white/60">
                            {selectedPromo.usedCount} из {selectedPromo.usageLimit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(
                                (selectedPromo.usedCount / (selectedPromo.usageLimit || 1)) * 100,
                                100
                              )}%`,
                            }}
                            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => setSelectedPromo(null)}
                  className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E0C048] to-[#D4AF37] text-[#3D0A11] font-bold text-[15px] active:scale-[0.97] transition-transform shadow-xl shadow-[#D4AF37]/25 mt-2"
                >
                  Понятно
                </button>

                {/* Safe area */}
                <div className="h-16" />
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
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="sheet"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="
          fixed inset-x-4 top-[8vh] z-[60] max-w-md mx-auto
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
