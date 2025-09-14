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

const formatDateShort = (ts: string | number | Date) =>
  new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

const daysLeft = (endDate: string | number | Date) => {
  const now = new Date();
  const end = new Date(endDate);
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
    <div className={`${className} space-y-3`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white shadow-card">
          <MegaphoneIcon className="w-4 h-4" />
        </span>
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Акции</h2>
      </div>

      <AnimatePresence mode="sync">
        <motion.div
          variants={listContainer(0.05)}
          initial="hidden"
          animate="show"
          exit="exit"
          className="space-y-3"
        >
          {list.map((promotion) => {
            const left = daysLeft(promotion.endDate);
            const isHot = left <= 3;

            return (
              <motion.div
                key={promotion.id}
                variants={listItem(!!prefersReduced)}
                className="
                  relative overflow-hidden rounded-[var(--radius)]
                  bg-surface shadow-card
                  p-4 text-[var(--text-primary)]
                "
              >
                {/* мягкая аура вместо бордеров */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-black/10 blur-2xl" />
                  <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-black/10 blur-2xl" />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Чипы */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-semibold bg-black text-white shadow-press">
                        <TagIcon className="w-3.5 h-3.5" />
                        Скидка {getDiscountText(promotion)}
                      </span>
                      {promotion.category && (
                        <span className="inline-flex items-center px-2 h-6 rounded-full text-[11px] font-semibold bg-black/80 text-white shadow-press">
                          {promotion.category}
                        </span>
                      )}
                      {isHot && (
                        <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-semibold bg-black/70 text-white shadow-press">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {left === 0 ? 'Последний день' : `${left} дн.`}
                        </span>
                      )}
                    </div>

                    {/* Заголовок/описание */}
                    <h3 className="text-[16px] font-bold leading-tight line-clamp-1">
                      {promotion.title}
                    </h3>
                    {promotion.description && (
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-snug line-clamp-2">
                        {promotion.description}
                      </p>
                    )}

                    {/* Мета */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-secondary)]">
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
                        <div className="w-full h-1 rounded-full bg-black/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-black rounded-full"
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
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/50 border border-black/5 shadow-inner flex-shrink-0">
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
