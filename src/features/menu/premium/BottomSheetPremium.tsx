import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo, useDragControls, useReducedMotion } from 'framer-motion';

type SheetVariant = 'sheet' | 'center';
type Tone = 'dark' | 'light';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string | number;
  variant?: SheetVariant;
  tone?: Tone;
  className?: string;
}

export const BottomSheetPremium: React.FC<Props> = ({
  open,
  onClose,
  children,
  maxHeight = '92vh',
  variant = 'sheet',
  tone = 'dark',
  className,
}) => {
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const prefersReduced = useReducedMotion();

  const isSheet = variant === 'sheet';
  const isLight = tone === 'light';

  useEffect(() => {
    if (!open || !isSheet) return;
    y.set(0);
  }, [open, y, isSheet]);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!isSheet) return;
      const panel = panelRef.current;
      if (!panel) {
        onClose();
        return;
      }
      const height = panel.getBoundingClientRect().height;
      const passedDistance = info.offset.y > height * 0.33;
      const fastSwipe = info.velocity.y > 500;
      if (passedDistance || fastSwipe) {
        onClose();
      } else {
        y.set(0);
      }
    },
    [isSheet, onClose, y],
  );

  const onWheelCapture = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!isSheet) return;
    const el = scrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 0 && event.deltaY < 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight && event.deltaY > 0;
    if (!atTop && !atBottom) {
      event.stopPropagation();
    }
  }, [isSheet]);

  const fast = prefersReduced ? { duration: 0 } : undefined;

  const sheetVariants = {
    hidden: {
      y: '100%',
      transition: { type: 'spring' as const, stiffness: 500, damping: 40, duration: 0.3, ...fast },
    },
    visible: {
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 500,
        damping: 40,
        duration: 0.3,
        ...fast,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0, transition: { duration: 0.2, ...fast } },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        ...fast,
      },
    },
  };

  const renderSheet = () => (
    <>
      <motion.div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{
          backdropFilter: isLight ? 'blur(6px)' : 'blur(10px)',
          WebkitBackdropFilter: isLight ? 'blur(6px)' : 'blur(10px)',
        }}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <span
          className={`absolute inset-0 ${
            isLight
              ? 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.25),rgba(0,0,0,0.55))]'
              : 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.4),rgba(0,0,0,0.7))]'
          }`}
        />
      </motion.div>

      <motion.div
        ref={panelRef}
        drag="y"
        dragControls={dragControls}
        dragListener
        dragElastic={{ top: 0, bottom: 0.2 }}
        dragConstraints={{ top: 0, bottom: 600 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className={[
          'fixed inset-x-0 bottom-0 z-50 will-change-transform transform-gpu flex flex-col',
          'rounded-t-[32px]',
          isLight
            ? 'bg-[var(--color-bg-elev-1)] text-[var(--color-text-primary)]'
            : 'bg-[#0F1215] text-white',
          'shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)]',
          className || '',
        ].join(' ')}
        style={{ y, maxHeight }}
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <div className="relative w-full shrink-0 select-none">
          <div className="w-full h-1.5 flex justify-center py-3" onPointerDown={(event) => dragControls.start(event)}>
            <div
              className={`w-12 h-1.5 rounded-full ${
                isLight ? 'bg-[var(--color-border)]' : 'bg-white/20'
              }`}
            />
          </div>
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 rounded-t-[32px] bg-gradient-to-b from-black/5 to-transparent mix-blend-multiply" />
        </div>

        <div
          ref={scrollRef}
          id="premium-sheet-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
          onWheel={onWheelCapture}
          onTouchStart={(event) => {
            const el = scrollRef.current;
            if (el && el.scrollTop <= 5) {
              const touch = event.touches[0];
              if (touch) {
                const pointerEvent = new PointerEvent('pointerdown', {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  bubbles: true,
                });
                dragControls.start(pointerEvent);
              }
            } else {
              event.stopPropagation();
            }
          }}
          onTouchMove={(event) => {
            const el = scrollRef.current;
            if (!el) return;
            const atTop = el.scrollTop <= 5;
            if (!atTop) {
              event.stopPropagation();
            }
          }}
        >
          {children}
          <div className="h-[28px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </div>
      </motion.div>
    </>
  );

  const renderCenter = () => (
    <>
      <motion.div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      />
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        variants={{
          hidden: { opacity: 0, scale: 0.95, y: 20 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 220, damping: 26, ...fast },
          },
          exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.18 } },
        }}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div
          role="dialog"
          aria-modal="true"
          className={[
            'flex w-[min(95vw,440px)] flex-col',
            'rounded-3xl bg-white shadow-2xl ring-1 ring-black/5',
            className || '',
          ].join(' ')}
          style={{ maxHeight: '85vh' }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );

  return <AnimatePresence>{open && (isSheet ? renderSheet() : renderCenter())}</AnimatePresence>;
};
