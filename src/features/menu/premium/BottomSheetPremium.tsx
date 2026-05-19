import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: ()=>void;
  children: React.ReactNode;
  maxHeight?: string | number;
  variant?: 'dark' | 'light';
  className?: string;
}

/**
 * Центрированная модалка (не fullscreen, по центру экрана)
 */
export const BottomSheetPremium: React.FC<Props> = ({
  open,
  onClose,
  children,
  maxHeight = '85vh',
  className
}) => {
  const prefersReduced = useReducedMotion();

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const fast = prefersReduced ? { duration: 0 } : undefined;

  const backdropVariants = {
    hidden: { 
      opacity: 0, 
      transition: { duration: 0.25, ...fast } 
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.3, ...fast }
    }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      transition: { 
        duration: 0.2,
        ...fast 
      }
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { 
        duration: 0.25,
        ease: [0, 0, 0.2, 1] as const,
        ...fast
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            role="presentation"
            onClick={(e) => {
              // Close only if clicking exactly on backdrop, not bubbled from modal
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="absolute inset-0 -z-10 bg-black/60" />

            {/* Centered Modal */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className={[
                'w-full max-w-sm rounded-3xl overflow-hidden',
                'flex flex-col',
                'bg-white text-gray-900',
                'shadow-2xl',
                className || ''
              ].join(' ')}
              style={{ maxHeight }}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
