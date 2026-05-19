// src/ui/motion.ts
import type { Variants, Transition } from 'framer-motion';

// Transitions
export const transitions = {
  // Apple-like smooth durations
  fast: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as Transition,
  base: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } as Transition,
  slow: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 35 } as Transition,
  springSnappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
};

export const pageVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: reduced ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, transition: reduced ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
});

export const listContainer = (stagger = 0.25): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: 0.4 } },
  exit: { transition: { staggerChildren: 0.25, staggerDirection: -1 } },
});

export const listItem = (reduced: boolean): Variants => ({
  hidden: { opacity: 0, y: 0, scale: reduced ? 1 : 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: reduced ? { duration: 0 } : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: 0, scale: reduced ? 1 : 0.98, transition: reduced ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
});

export const toggleVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0, scale: reduced ? 1 : 0.98 },
  active: { opacity: 1, scale: 1, transition: reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 35 } },
  inactive: { opacity: 1, scale: 1 },
});

export const fadeSlide = (reduced: boolean): Variants => ({
  hidden: { opacity: 0, y: reduced ? 0 : 32 },
  visible: { opacity: 1, y: 0, transition: reduced ? { duration: 0 } : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
  out: { opacity: 0, y: reduced ? 0 : -32, transition: reduced ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
});
