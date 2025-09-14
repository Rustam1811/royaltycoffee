import React from 'react';
import { DrinkItem } from './types';
import { DrinkCard } from './DrinkCard';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { listContainer, listItem } from '../../../ui/motion';

interface Props {
  items: DrinkItem[];
  onSelect: (id: string | number)=>void;
  loading?: boolean;
}

const Skeleton: React.FC = () => (
  <div className="relative bg-neutral-200/70 rounded-2xl overflow-hidden aspect-[3/4]">
    <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.6),transparent)] animate-[shimmer_1.4s_infinite] bg-[length:200%_100%]" />
  </div>
);

export const DrinkGrid: React.FC<Props> = ({ items, onSelect, loading }) => {
  const prefersReduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={loading? 'loading' : 'loaded'}
        variants={listContainer(0.06)}
        initial="hidden"
        animate="show"
        exit="exit"
        className="grid grid-cols-2 gap-4 px-4 pt-5 pb-24"
      >
        {loading
          ? Array.from({length:6}).map((_,i)=>(<Skeleton key={i}/>))
          : items.map(it => (
            <motion.div key={it.id} variants={listItem(!!prefersReduced)}>
              <DrinkCard item={it} onSelect={onSelect} />
            </motion.div>
          ))}
      </motion.div>
    </AnimatePresence>
  );
};
