import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo, useDragControls, useReducedMotion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: ()=>void;
  children: React.ReactNode;
  maxHeight?: string | number;
  variant?: 'dark' | 'light';
  className?: string;
}

/**
 * Premium bottom sheet:
 * — без чёрных бордеров; только мягкие тени
 * — backdrop blur, градиентный overlay
 * — свайп вниз с порогом по доле высоты
 * — Esc/overlay закрывают
 * — блокирует скролл body при открытии
 */
export const BottomSheetPremium: React.FC<Props> = ({
  open,
  onClose,
  children,
  maxHeight = '92vh',
  variant = 'dark',
  className
}) => {
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const prefersReduced = useReducedMotion();
  const isLight = variant === 'light';

  // Сброс смещения при закрытии
  useEffect(()=>{ if (!open) y.set(0); }, [open, y]);

  // Блокируем фоновый скролл, когда открыт + компенсация скроллбара
  useEffect(() => {
    if (!open) return;
    const { overflow, paddingRight } = document.body.style;
    const hasScrollbar = window.innerWidth > document.documentElement.clientWidth;
    if (hasScrollbar) {
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  // Esc для закрытия
  useEffect(()=>{
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    if (!panel) return onClose();
    const h = panel.getBoundingClientRect().height;
    const passedDistance = info.offset.y > h * 0.18;     // порог 18% высоты
    const fastSwipe = info.velocity.y > 900;             // быстрый свайп вниз
    if (passedDistance || fastSwipe) onClose();
    else y.set(0); // вернуться на место
  }, [onClose, y]);

  // Предотвращаем «протекание» скролла: если контент на верх/низ — разрешаем свайп листа
  const onWheelCapture = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 0 && e.deltaY < 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight && e.deltaY > 0;
    if (atTop || atBottom) {
      // позволяем фреймеру ловить жест, не стопим
    } else {
      e.stopPropagation();
    }
  };

  const fast = prefersReduced ? { duration: 0 } : undefined;

  const sheetVariants = {
    hidden: {
      y: '100%',
      transition: { type: 'spring' as const, stiffness: 380, damping: 32, ...fast }
    },
    visible: {
      y: 0,
      transition: { 
        type: 'spring' as const,
        stiffness: 380,
        damping: 32,
        delayChildren: 0.12,
        staggerChildren: 0.06,
        ...fast
      }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const, ...fast } },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        delay: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
        ...fast
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay без бордеров: градиент + blur */}
          <motion.div
            role="presentation"
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              backdropFilter: isLight ? 'blur(6px)' : 'blur(10px)',
              WebkitBackdropFilter: isLight ? 'blur(6px)' : 'blur(10px)'
            }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <span
              className={`absolute inset-0 ${isLight ? 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.25),rgba(0,0,0,0.55))]' : 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.4),rgba(0,0,0,0.7))]'}`}
            />
          </motion.div>

          {/* Sheet без чёрных бордеров, только мягкие тени */}
          <motion.div
            ref={panelRef}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            className={[
              'fixed inset-x-0 bottom-0 z-50 will-change-transform transform-gpu flex flex-col',
              'rounded-t-[32px]',
              isLight
                ? 'bg-[var(--color-bg-elev-1)] text-[var(--color-text-primary)]'
                : 'bg-[#0F1215] text-white',
              // мягкая объёмная тень без бордера
              'shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)]',
              className || ''
            ].join(' ')}
            style={{ y, maxHeight }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* хэндл */}
            <div className="relative w-full shrink-0 select-none">
              <div
                className="w-full h-1.5 flex justify-center py-3"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div
                  className={`w-12 h-1.5 rounded-full ${
                    isLight ? 'bg-[var(--color-border)]' : 'bg-white/20'
                  }`}
                />
              </div>
              {/* Верхний мягкий fade — без бордеров */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 rounded-t-[32px] bg-gradient-to-b from-black/5 to-transparent mix-blend-multiply" />
            </div>

            {/* контентная область со своим скроллом */}
            <div
              ref={scrollRef}
              id="premium-sheet-scroll"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
              onWheel={onWheelCapture}
              onTouchMove={(e) => {
                const el = scrollRef.current;
                if (!el) return;
                const atTop = el.scrollTop <= 0;
                const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
                // если не у края — не даём событию «подняться» до drag
                if (!atTop && !atBottom) e.stopPropagation();
              }}
            >
              {children}
              {/* Отступ под iOS home-indicator / sticky CTA снизу */}
              <div className="h-[28px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
