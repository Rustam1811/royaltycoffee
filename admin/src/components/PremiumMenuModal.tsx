import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../../src/contexts/CartContext';

// === TYPES ===
interface Option {
  key: string;
  name: string;
  price: number;
  image: string;
}

interface PremiumDrinkItem {
  id: string | number;
  name: string;
  price: number;
  image: string;
  categoryId?: string | number;
}

interface Props {
  item: PremiumDrinkItem | null;
  open: boolean;
  onClose: () => void;
  type?: 'drinks' | 'food';
}

// === CONSTANTS ===
const DRINK_SIZES = [
  { key: 's', label: 'S', volume: 250, multiplier: 0.9, unit: 'мл' },
  { key: 'm', label: 'M', volume: 350, multiplier: 1, unit: 'мл' },
  { key: 'l', label: 'L', volume: 450, multiplier: 1.18, unit: 'мл' },
];

const FOOD_SIZES = [
  { key: 'standard', label: 'Стандарт', volume: 0, multiplier: 1.0, unit: '' },
  { key: 'large', label: 'Большая', volume: 0, multiplier: 1.3, unit: '' },
  { key: 'xl', label: 'XL', volume: 0, multiplier: 1.6, unit: '' },
];

const MILKS: Option[] = [
  { key:'regular',     name:'Обычное',         price:0,   image:'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=160&h=160&fit=crop&auto=format' },
  { key:'oat',         name:'Овсяное',         price:200, image:'https://images.unsplash.com/photo-1600623560792-d0b2d4e30b91?w=160&h=160&fit=crop&auto=format' },
  { key:'almond',      name:'Миндальное',      price:250, image:'https://images.unsplash.com/photo-1569478412303-6f566ac41a37?w=160&h=160&fit=crop&auto=format' },
  { key:'coconut',     name:'Кокосовое',       price:250, image:'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=160&h=160&fit=crop&auto=format' },
  { key:'lactosefree', name:'Безлактозное',    price:180, image:'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=160&h=160&fit=crop&auto=format' },
];

const SYRUPS: Option[] = [
  { key:'vanilla', name:'Ваниль', price:200, image:'https://images.unsplash.com/photo-1587736174440-ddbf2b6a3b4b?w=160&h=160&fit=crop&auto=format' },
  { key:'caramel', name:'Карамель', price:200, image:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&auto=format' },
  { key:'hazelnut', name:'Фундук', price:220, image:'https://images.unsplash.com/photo-1633436370590-223c9e0d2afd?w=160&h=160&fit=crop&auto=format' },
  { key:'coconut', name:'Кокос', price:220, image:'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=160&h=160&fit=crop&auto=format' },
  { key:'mint', name:'Мята', price:200, image:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=160&h=160&fit=crop&auto=format' },
  { key:'banana', name:'Банан', price:200, image:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=160&h=160&fit=crop&auto=format' },
];

const TOPPINGS: Option[] = [
  { key:'cinnamon', name:'Корица', price:0, image:'https://images.unsplash.com/photo-1596040033229-a0b3b64d1673?w=160&h=160&fit=crop&auto=format' },
  { key:'cocoa', name:'Какао', price:0, image:'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=160&h=160&fit=crop&auto=format' },
  { key:'choco', name:'Шоколад', price:120, image:'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=160&h=160&fit=crop&auto=format' },
  { key:'marsh', name:'Маршмеллоу', price:150, image:'https://images.unsplash.com/photo-1566932769119-7a1fb6d7ce23?w=160&h=160&fit=crop&auto=format' },
];

// === TAB BUTTON ===
const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
      active
        ? 'bg-white text-slate-900 shadow border border-slate-300'
        : 'bg-slate-100 text-slate-500'
    }`}
  >
    {children}
  </button>
);

// === SIZE SELECTOR ===
const SizeSelector: React.FC<{ value: string; onChange: (s: string) => void; type?: 'drinks' | 'food' }> = ({ value, onChange, type = 'drinks' }) => {
  const sizes = type === 'food' ? FOOD_SIZES : DRINK_SIZES;
  const selectedIndex = sizes.findIndex(s => s.key === value);
  
  return (
    <div className="relative flex items-center p-1 bg-slate-200 rounded-full">
      {/* Animated white background slider */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white rounded-full shadow-lg"
        initial={false}
        animate={{
          left: `calc(${selectedIndex * (100 / sizes.length)}% + 4px)`,
          width: `calc(${100 / sizes.length}% - 8px)`
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />
      
      {/* Buttons */}
      {sizes.map((s) => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className={`relative z-10 flex-1 py-2 rounded-full transition-colors text-xs font-bold ${
            value === s.key ? 'text-slate-900' : 'text-slate-600'
          }`}
        >
          <div>{s.label}</div>
          {s.volume > 0 && <div className="text-[10px] opacity-70">{s.volume} {s.unit}</div>}
        </button>
      ))}
    </div>
  );
};

// === MAIN COMPONENT ===
export const PremiumMenuModal: React.FC<Props> = ({ item, open, onClose, type = 'drinks' }) => {
  const [size, setSize] = useState(type === 'food' ? 'standard' : 'm');
  const [qty] = useState(1);
  const [milkKey, setMilkKey] = useState('regular');
  const [syrupKeys, setSyrupKeys] = useState<string[]>([]);
  const [toppingKeys, setToppingKeys] = useState<string[]>([]);
  const [panel, setPanel] = useState<'milk'|'syrup'|'topping'|null>(null);
  const { dispatch } = useCart();
  const cartRef = useRef<HTMLDivElement|null>(null);

  const isFood = type === 'food';
  const SIZES = isFood ? FOOD_SIZES : DRINK_SIZES;

  const basePrice = item?.price || 0;
  const sizeMult = SIZES.find(s=>s.key===size)?.multiplier || 1;
  const milkPrice = MILKS.find(m=>m.key===milkKey)?.price || 0;
  const syrupPrice = syrupKeys.reduce((sum,k)=> sum + (SYRUPS.find(s=>s.key===k)?.price||0), 0);
  const toppingPrice = toppingKeys.reduce((sum,k)=> sum + (TOPPINGS.find(t=>t.key===k)?.price||0), 0);
  const total = Math.round((basePrice * sizeMult + milkPrice + syrupPrice + toppingPrice) * qty);

  const resetState = () => {
    setSize(isFood ? 'standard' : 'm');
    setMilkKey('regular');
    setSyrupKeys([]);
    setToppingKeys([]);
    setPanel(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAdd = useCallback(() => {
    if (!item) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: String(item.id),
        name: item.name,
        price: total,
        quantity: qty,
        image: item.image,
        sizeKey: size,
        milkKey,
        syrupKey: [...syrupKeys, ...toppingKeys].join('+')
      }
    });
    cartRef.current?.classList.add('cart-pulse');
    setTimeout(() => cartRef.current?.classList.remove('cart-pulse'), 720);
    handleClose();
  }, [item, total, qty, size, milkKey, syrupKeys, toppingKeys, dispatch]);

  const toggleMulti = (arrSetter: React.Dispatch<React.SetStateAction<string[]>>, key: string) => {
    arrSetter(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  };

  const panelData: Option[] = panel ? (panel==='milk' ? MILKS : panel==='syrup' ? SYRUPS : panel==='topping' ? TOPPINGS : []) : [];

  const isSelected = (k:string) => {
    return panel==='milk' ? milkKey===k : panel==='syrup' ? syrupKeys.includes(k) : toppingKeys.includes(k);
  };

  const selectItem = (k:string) => {
    if(panel==='milk') setMilkKey(k);
    else if(panel==='syrup') toggleMulti(setSyrupKeys, k);
    else if(panel==='topping') toggleMulti(setToppingKeys, k);
  };

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open || !item) return null;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 -z-10 bg-black/60" />

            {/* Centered Modal */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
              className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl"
              style={{ maxHeight: '85vh' }}
            >
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-4 pt-4 pb-4 relative">
                  {/* Close button */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleClose}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center transition-all"
                      aria-label="Закрыть"
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-900" />
                    </button>
                  </div>

                  {/* Hero image */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="eager"
                      width={200}
                      height={240}
                      className="w-[50%] max-w-[200px] drop-shadow-xl"
                    />
                  </div>
                  
                  <h2 className="text-xl font-bold text-center leading-tight mb-2">
                    {item.name}
                  </h2>
                  <p className="text-sm text-gray-500 text-center mb-4">Настройте ваш напиток</p>

                  {/* Табы опций */}
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                      <TabButton active={panel==='milk'} onClick={()=>setPanel(panel==='milk' ? null : 'milk')}>
                        Молоко
                      </TabButton>
                      <TabButton active={panel==='syrup'} onClick={()=>setPanel(panel==='syrup' ? null : 'syrup')}>
                        Сиропы
                      </TabButton>
                      <TabButton active={panel==='topping'} onClick={()=>setPanel(panel==='topping'? null:'topping')}>
                        Топпинги
                      </TabButton>
                    </div>

                    {/* Карточки опций */}
                    <AnimatePresence mode="wait">
                      {panel && panelData.length > 0 && (
                        <motion.div
                          key={panel}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2"
                          style={{ scrollSnapType: 'x mandatory' }}
                        >
                        {panelData.map((opt)=>{
                          const active = isSelected(opt.key);
                          return (
                            <button
                              key={opt.key}
                              onClick={(e)=>{
                                e.stopPropagation();
                                selectItem(opt.key);
                              }}
                              className="relative flex-shrink-0 w-[110px] h-[140px] rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all"
                              style={{ scrollSnapAlign: 'start' }}
                            >
                              {/* Gradient background */}
                              <div className={`absolute inset-0 ${active ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`} />
                              
                              {/* Content overlay */}
                              <div className="relative h-full flex flex-col justify-between p-3">
                                {/* Image at top */}
                                <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden bg-white shadow-md">
                                  <img
                                    src={opt.image}
                                    alt=""
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                
                                {/* Name and price at bottom */}
                                <div className="space-y-1">
                                  <span className={`block text-xs font-bold leading-tight line-clamp-2 ${active ? 'text-white' : 'text-gray-900'}`}>
                                    {opt.name}
                                  </span>
                                  {opt.price > 0 && (
                                    <span className={`block text-[10px] font-bold ${active ? 'text-white' : 'text-amber-600'}`}>
                                      +{opt.price}₸
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Active checkmark */}
                              {active && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                                  <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Fixed CTA at bottom */}
              <div className="shrink-0 border-t border-gray-100 px-4 py-4 bg-white">
                <div className="flex gap-3 items-center" ref={cartRef}>
                  {/* Size selector */}
                  <div className="flex-1">
                    <SizeSelector value={size} onChange={setSize} type={type} />
                  </div>
                  
                  {/* Add button */}
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="w-auto h-14 px-8 rounded-2xl bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center active:scale-95 transition-all hover:bg-gray-800"
                  >
                    + {total} ₸
                  </button>
                </div>
                
                {/* База цены */}
                <div className="text-center text-xs text-gray-500 mt-3">
                  База: {Math.round(basePrice * sizeMult)}₸
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
