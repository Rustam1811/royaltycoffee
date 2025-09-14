import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShellProps {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ title, children, right }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-['Manrope']">
      <header className="h-14 backdrop-blur bg-[var(--color-bg-base)]/80 border-b border-black/5 flex items-center px-5 justify-between sticky top-0 z-30">
        <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
        {right}
      </header>
      <main className="flex-1 px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 360, damping: 36 } }}
            exit={{ opacity: 0, y: -8 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
