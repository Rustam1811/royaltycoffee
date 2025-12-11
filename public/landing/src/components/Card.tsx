import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

type CardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
};

export function Card({ title, description, icon, className }: CardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={prefersReducedMotion ? undefined : { opacity: 0, translateY: 16 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, translateY: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('glass-panel rounded-2xl p-6 shadow-card', className)}
    >
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-inner">{icon}</div>}
      <h3 className="text-lg font-semibold text-mist">{title}</h3>
      <p className="mt-3 text-sm text-gray-500">{description}</p>
    </motion.article>
  );
}

