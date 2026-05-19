export const pageVariants = (_isMobile?: boolean) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
});

export const transitions = {
  base: { type: 'spring', stiffness: 200, damping: 20, mass: 0.5 } as any
};
