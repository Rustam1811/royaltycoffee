import React, { useMemo, useState } from 'react';
import { CategoryTabs } from './CategoryTabs';
import { DrinkGrid } from './DrinkGrid';
import { DrinkCategoryTab, DrinkItem } from './types';
import { useSwipeable } from 'react-swipeable';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface Props {
  categories: DrinkCategoryTab[];
  drinks: DrinkItem[]; // полный список
  initialCategory?: string;
  onSelectDrink: (id: string|number)=>void;
  loading?: boolean;
}

// Dark bottom sheet stub (will be expanded later)
const DarkConfiguratorSheet: React.FC<{ item: DrinkItem | null; onClose: ()=>void; }>=({ item, onClose })=>{
  const prefersReduced = useReducedMotion();
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity:0 }}
            animate={{ opacity: prefersReduced ? 1 : 0.55 }}
            exit={{ opacity:0 }}
            transition={prefersReduced ? { duration: 0 } : { duration:0.25 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y:'100%' }}
            animate={{ y:0 }}
            exit={{ y:'100%' }}
            transition={prefersReduced ? { duration: 0 } : { type:'spring', stiffness:460, damping:42 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#14181C] text-neutral-100 shadow-[0_-2px_16px_rgba(0,0,0,0.4)] overflow-hidden"
            style={{ maxHeight:'92vh' }}
          >
            {item && (
              <div className="relative w-full h-[48vh]">
                <motion.img
                  layoutId={`drink-img-${item.id}`}
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover object-center"/>
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#14181C]" />
                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/35 backdrop-blur text-white text-xl flex items-center justify-center">×</button>
              </div>
            )}
            <div className="px-5 pb-8 -mt-4">
              <motion.h2 layoutId={`drink-card-${item?.id}`} className="text-lg font-semibold tracking-tight">{item?.name}</motion.h2>
              <p className="text-[13px] text-neutral-400 mt-1">настрой как любишь (β)</p>
              <div className="h-40 flex items-center justify-center text-neutral-500 text-xs">Configurator content…</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const MilkCoffeeMenu: React.FC<Props> = ({ categories, drinks, initialCategory, onSelectDrink, loading }) => {
  const [active, setActive] = useState(initialCategory || categories[0]?.key || '');
  const [selId, setSelId] = useState<string|number|null>(null);
  const items = useMemo(()=> drinks.filter(d=> String(d.category)===String(active)), [drinks, active]);
  const selItem = useMemo(()=> drinks.find(d=> d.id===selId) || null, [drinks, selId]);
  const handlers = useSwipeable({ onSwipedLeft: ()=>{/*...*/}, onSwipedRight: ()=>{/*...*/} });

  return (
    <div {...handlers} className="min-h-[60vh]">
      <CategoryTabs tabs={categories} active={active} onChange={setActive} />
      <DrinkGrid items={items} onSelect={setSelId} loading={loading} />
      <DarkConfiguratorSheet item={selItem} onClose={()=> setSelId(null)} />
    </div>
  );
};
