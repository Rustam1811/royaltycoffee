import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string | number;
  variant?: 'dark' | 'light';
  className?: string;
}

// Lightweight bottom sheet for Admin (looks like client modal)
const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, children, maxHeight = '92vh', variant = 'light', className }) => {
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isLight = variant === 'light';

  useEffect(() => { if (!open) y.set(0); }, [open, y]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              backdropFilter: isLight ? 'blur(4px)' : 'blur(8px)',
              WebkitBackdropFilter: isLight ? 'blur(4px)' : 'blur(8px)'
            }}
          >
            <span className={`absolute inset-0 ${isLight ? 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.35),rgba(0,0,0,0.6))]' : 'bg-[radial-gradient(120%_120%_at_50%_20%,rgba(0,0,0,0.45),rgba(0,0,0,0.75))]'}`} />
          </motion.div>

          <motion.div
            ref={panelRef}
            className={[
              'fixed inset-x-0 bottom-0 z-50 will-change-transform transform-gpu flex flex-col rounded-t-3xl',
              isLight ? 'bg-white text-[var(--color-text-primary)]' : 'bg-[#0F1215] text-white',
              'shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)]',
              className || ''
            ].join(' ')}
            style={{ y, maxHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="w-full h-1.5 flex justify-center py-3">
              <div className={`w-12 h-1.5 rounded-full ${isLight ? 'bg-[var(--color-border)]' : 'bg-white/20'}`} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {children}
              <div className="h-8" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
