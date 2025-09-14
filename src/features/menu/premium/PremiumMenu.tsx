import React, { useState, useMemo, useRef, useCallback } from 'react';
import { DrinkCardPremium, PremiumDrinkItem } from './DrinkCardPremium';
import { BottomSheetPremium } from './BottomSheetPremium';
import { AnimatePresence, motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { useFlyToCart } from '../../menu/hooks/useFlyToCart';
import { FlyToCartLayer } from '../../menu/components/FlyToCartLayer';
import { useCart } from '../../../contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { listContainer, listItem, fadeSlide } from '../../../ui/motion';

// Restore Option interface (was removed accidentally)
interface Option { key: string; name: string; price: number; image: string; }

const SIZES = [
  { key: 's', label: 'S', volume: 250, multiplier: 0.9 },
  { key: 'm', label: 'M', volume: 350, multiplier: 1 },
  { key: 'l', label: 'L', volume: 450, multiplier: 1.18 },
];

// Replace hardcoded display names with translation keys (options.* namespace)
const MILKS: Option[] = [
  { key:'regular',     name:'options.milk.regular',     price:0,   image:'https://images.unsplash.com/photo-1580913428730-546268b21c08?w=160&h=160&fit=crop&auto=format' },
  { key:'oat',         name:'options.milk.oat',         price:200, image:'https://images.unsplash.com/photo-1585238342028-977c5b7d6d83?w=160&h=160&fit=crop&auto=format' },
  { key:'almond',      name:'options.milk.almond',      price:250, image:'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=160&h=160&fit=crop&auto=format' },
  { key:'coconut',     name:'options.milk.coconut',     price:250, image:'https://images.unsplash.com/photo-1605478638360-6e94c6fb9c89?w=160&h=160&fit=crop&auto=format' },
  { key:'lactosefree', name:'options.milk.lactosefree', price:180, image:'https://images.unsplash.com/photo-1591397836498-5c6a0d69aef1?w=160&h=160&fit=crop&auto=format' },
];

const SYRUPS: Option[] = [
  { key:'vanilla', name:'options.syrup.vanilla', price:200, image:'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=160&h=160&fit=crop&auto=format' },
  { key:'caramel', name:'options.syrup.caramel', price:200, image:'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=160&h=160&fit=crop&auto=format' },
  { key:'hazelnut', name:'options.syrup.hazelnut', price:220, image:'https://images.unsplash.com/photo-1633436370590-223c9e0d2afd?w=160&h=160&fit=crop&auto=format' },
  { key:'coconut', name:'options.syrup.coconut', price:220, image:'https://images.unsplash.com/photo-1522184216316-3c58b7b9acb9?w=160&h=160&fit=crop&auto=format' },
  { key:'mint', name:'options.syrup.mint', price:200, image:'https://images.unsplash.com/photo-1557804483-ef3ae78eca57?w=160&h=160&fit=crop&auto=format' },
  { key:'banana', name:'options.syrup.banana', price:200, image:'https://images.unsplash.com/photo-1574226516831-e1dff420e43e?w=160&h=160&fit=crop&auto=format' },
];

const TOPPINGS: Option[] = [
  { key:'cinnamon', name:'options.topping.cinnamon', price:0,   image:'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=160&h=160&fit=crop&auto=format' },
  { key:'cocoa',    name:'options.topping.cocoa',    price:0,   image:'https://images.unsplash.com/photo-1587731827307-94079b73f0ac?w=160&h=160&fit=crop&auto=format' },
  { key:'choco',    name:'options.topping.choco',    price:120, image:'https://images.unsplash.com/photo-1599785209707-28f3ac5d6f4b?w=160&h=160&fit=crop&auto=format' },
  { key:'marsh',    name:'options.topping.marsh',    price:150, image:'https://images.unsplash.com/photo-1615486364546-924318e36175?w=160&h=160&fit=crop&auto=format' },
];

interface Props { items: PremiumDrinkItem[]; categories?: { key:string; label:string }[]; }

// Restore Pill component (used for selectors)
const Pill: React.FC<{ active: boolean; onClick: () => void; layoutId?: string; rightBadge?: React.ReactNode; children: React.ReactNode; }> = ({ active, onClick, layoutId, rightBadge, children }) => (
  <motion.button
    layoutId={layoutId}
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={`relative h-14 px-6 rounded-[20px] text-[13px] font-bold overflow-hidden group outline-none backdrop-blur-xl
      ${active
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-[0_20px_50px_-16px_rgba(0,0,0,0.60)] border border-gray-700'
        : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-700 hover:from-gray-50 hover:via-gray-100 hover:to-gray-150 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.20)] hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.30)] border border-gray-200/60 hover:border-gray-300/80'}`}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 rounded-[20px] ${active ? 'animate-pulse' : ''}`} />
    <span className="relative z-10 flex items-center gap-2">
      {children}
      {rightBadge}
    </span>
  </motion.button>
);

export const PremiumMenu: React.FC<Props> = ({ items, categories }) => {
  const { i18n, t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const [activeCat, setActiveCat] = useState<string>(categories?.[0]?.key || '');
  const [openId, setOpenId] = useState<string|number|null>(null);
  const [size, setSize] = useState('m');
  const [qty, setQty] = useState(1);
  const [milkKey, setMilkKey] = useState('regular');
  const [syrupKeys, setSyrupKeys] = useState<string[]>([]);
  const [toppingKeys, setToppingKeys] = useState<string[]>([]);
  const [panel, setPanel] = useState<'milk'|'syrup'|'topping'|null>('milk');
  const [dark,setDark] = useState(false);

  const openItem = useMemo(()=> items.find(i=>i.id===openId) || null, [openId, items]);
  const basePrice = openItem?.price || 0;
  const sizeMult = SIZES.find(s=>s.key===size)?.multiplier || 1;
  const milkPrice = MILKS.find(m=>m.key===milkKey)?.price || 0;
  const syrupPrice = syrupKeys.reduce((sum,k)=> sum + (SYRUPS.find(s=>s.key===k)?.price||0), 0);
  const toppingPrice = toppingKeys.reduce((sum,k)=> sum + (TOPPINGS.find(t=>t.key===k)?.price||0), 0);
  const total = Math.round((basePrice * sizeMult + milkPrice + syrupPrice + toppingPrice) * qty);

  const cartRef = useRef<HTMLDivElement|null>(null);
  const { items: flyItems, trigger: triggerFly } = useFlyToCart();
  const { dispatch } = useCart();
  const selectionsRef = useRef<Record<string|number,{milk:string;syrup:string;tops:string;size:string}>>({});

  const rememberSelection = useCallback(()=>{
    if(openItem) selectionsRef.current[openItem.id] = {
      milk: milkKey, syrup: syrupKeys.join(','), tops: toppingKeys.join(','), size
    };
  }, [openItem, milkKey, syrupKeys, toppingKeys, size]);

  const openWith = (id: string|number) => {
    const prev = selectionsRef.current[id];
    if (prev) {
      setMilkKey(prev.milk);
      setSyrupKeys(prev.syrup? prev.syrup.split(',').filter(Boolean):[]);
      setToppingKeys(prev.tops? prev.tops.split(',').filter(Boolean):[]);
      setSize(prev.size);
    } else {
      resetState();
    }
    setOpenId(id);
  };

  const resetState = () => {
    setSize('m'); setQty(1); setMilkKey('regular'); setSyrupKeys([]); setToppingKeys([]); setPanel(null);
  };

  const handleAdd = useCallback(()=>{
    if (!openItem) return;
    rememberSelection();
    dispatch({
      type:'ADD_ITEM',
      payload:{
        id:Number(openItem.id),
        name:openItem.name,
        price: total,
        quantity: qty,
        image: openItem.image,
        sizeKey: size,
        milkKey,
        syrupKey: [...syrupKeys, ...toppingKeys].join('+')
      }
    });
    const source = document.querySelector(`[data-fly-id="${openItem.id}"]`) as HTMLElement | null;
    triggerFly(source, cartRef.current, openItem.image);
    cartRef.current?.classList.add('cart-pulse');
    setTimeout(()=> cartRef.current?.classList.remove('cart-pulse'), 720);
    setOpenId(null);
  }, [openItem, total, qty, size, milkKey, syrupKeys, toppingKeys, dispatch, triggerFly, rememberSelection]);

  const toggleMulti = (arrSetter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], key: string) => {
    arrSetter(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  };

  const panelData: Option[] = panel ? (panel==='milk' ? MILKS : panel==='syrup' ? SYRUPS : panel==='topping' ? TOPPINGS : []) : [];
  const isSelected = (k:string) => panel==='milk' ? milkKey===k : panel==='syrup' ? syrupKeys.includes(k) : toppingKeys.includes(k);
  const selectItem = (k:string) => {
    if(panel==='milk') setMilkKey(k);
    else if(panel==='syrup') toggleMulti(setSyrupKeys, syrupKeys, k);
    else if(panel==='topping') toggleMulti(setToppingKeys, toppingKeys, k);
  };

  // ====== VISUAL: улучшенные премиум стили ======
  
  const prevTotalRef = useRef(total);
  const diff = total - prevTotalRef.current;
  if(diff!==0) prevTotalRef.current = total;

  const visibleItems = useMemo(()=> categories && activeCat ? items.filter(i=> String(i.categoryId) === activeCat) : items, [items, categories, activeCat]);

  // Swipe navigation for categories
  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!categories || categories.length <= 1) return;
    
    const currentIndex = categories.findIndex(c => c.key === activeCat);
    if (currentIndex === -1) return;
    
    let nextIndex: number;
    if (direction === 'left') {
      // Swipe left = next category
      nextIndex = currentIndex === categories.length - 1 ? 0 : currentIndex + 1;
    } else {
      // Swipe right = previous category  
      nextIndex = currentIndex === 0 ? categories.length - 1 : currentIndex - 1;
    }
    
    setActiveCat(categories[nextIndex].key);
  }, [categories, activeCat]);

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    
    // Check if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const minSwipeDistance = 50;
      
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swiped left
          handleSwipe('left');
        } else {
          // Swiped right
          handleSwipe('right');
        }
      }
    }
  }, [touchStart, touchEnd, handleSwipe]);

  const changeLang = () => {
    const order: string[] = ['ru','en','kz'];
    const idx = order.indexOf(i18n.language as string);
    const next = order[(idx+1)%order.length];
    i18n.changeLanguage(next);
  };

  return (
    <LayoutGroup>
      <div className={`min-h-screen ${dark?'dark-theme':''} bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans transition-colors`}>
        {/* Header */}
        <div className="pt-4 pb-4 sticky top-0 z-20 bg-[var(--color-bg-base)]/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold tracking-tight">{t('ui.menu')}</h1>
            {categories && categories.length > 1 && (
              <div className="flex items-center gap-1">
                {categories.map((cat) => (
                  <div
                    key={cat.key}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      cat.key === activeCat ? 'bg-black w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {categories && categories.length>0 && (
              <div className="hidden sm:flex gap-3 mr-2">
                {/* small category indicators (desktop) */}
              </div>
            )}
            <button onClick={changeLang} className="px-3 h-9 rounded-full bg-[var(--color-bg-alt)] text-[13px] font-medium active:scale-95 shadow">{i18n.language.toUpperCase()}</button>
            <button onClick={()=>setDark(d=>!d)} className="w-9 h-9 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center active:scale-95 shadow text-[13px] font-semibold">{dark?'🌙':'☀️'}</button>
          </div>
        </div>
        {categories && categories.length>0 && (
          <div className="sticky top-[68px] z-10 px-4 pb-4 pt-1 bg-[var(--color-bg-base)]/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <nav className="flex gap-4 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              {categories.map(c=>{
                const active = c.key === activeCat;
                return (
                  <button key={c.key} onClick={()=>setActiveCat(c.key)} className={`relative pb-2 text-[13px] font-medium tracking-tight transition-colors ${active? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                    <span className="px-1 py-1.5">{c.label}</span>
                    {active && <motion.span layoutId="pmenu-cat-underline" className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-[var(--color-text-primary)]" transition={{type:'spring', stiffness: 520, damping: 34}} />}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
        {/* Premium Grid */}
        <div 
          className="px-6 pb-32"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div 
            key={activeCat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {visibleItems.map((it) => (
              <motion.div 
                key={it.id} 
                variants={listItem(!!prefersReduced)}
                initial={false}
                layout="position"
              >
                <DrinkCardPremium item={it} onOpen={openWith} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <FlyToCartLayer items={flyItems} />

        {/* Sheet */}
        <BottomSheetPremium
          open={!!openId}
          onClose={()=>{rememberSelection(); setOpenId(null); setPanel(null);}}
          variant={dark?'dark':'light'}
          className="shadow-[0_-8px_32px_-6px_rgba(0,0,0,0.15)]"
        >
          <AnimatePresence mode="wait">
            {openItem && (
              <motion.div key={openItem.id} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.18}} className="pb-64">
                <div className="px-6 pt-1 relative">
                  {/* hero */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <motion.img
                      layoutId={`drink-img-${openItem.id}`}
                      src={openItem.image}
                      alt={openItem.name}
                      className="w-[58%] max-w-[240px] drop-shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                    />
                  </div>
                  <motion.h2 layoutId={`drink-title-${openItem.id}`} className="text-[24px] font-semibold tracking-tight text-center">
                    {openItem.name}
                  </motion.h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-2">{t('ui.customize')}</p>

                  {/* Size */}
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="mt-8"
                  >
                    <div className="text-[11px] uppercase font-semibold tracking-[1px] text-[var(--color-text-tertiary)] mb-3 px-1 flex items-center gap-2">
                      {t('ui.size')}
                    </div>
                    <div className="flex gap-3 justify-center">
                      {SIZES.map((s, index)=>{
                        const active=s.key===size;
                        return (
                          <motion.button
                            key={s.key}
                            initial={{opacity:0, y:32, scale:0.98}}
                            animate={{
                              opacity:1, 
                              y:0, 
                              scale: 1,
                              transition: prefersReduced 
                                ? { duration: 0 }
                                : { 
                                    delay: 0.4 + index*0.25, 
                                    duration: 0.8, 
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                  }
                            }}
                            onClick={()=>setSize(s.key)}
                            whileHover={{scale: 1.02}}
                            whileTap={{scale:0.95}}
                            className={`relative h-14 min-w-[72px] px-6 rounded-[20px] text-[13px] font-bold transition-all duration-300 outline-none backdrop-blur-xl overflow-hidden group will-change-transform
                              ${active
                                ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-[0_20px_50px_-16px_rgba(0,0,0,0.60)] border border-gray-700'
                                : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-700 hover:from-gray-50 hover:via-gray-100 hover:to-gray-150 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.20)] hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.30)] border border-gray-200/60 hover:border-gray-300/80'}`}
                          >
                            {/* Shimmer effect */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent transform -skew-x-12 ${active ? 'animate-pulse' : ''} rounded-[20px]`} />
                            
                            <div className="relative z-10">
                              <span className="block leading-none text-[16px] font-black">{s.label}</span>
                              <span className="block text-[10px] mt-1 opacity-70 font-semibold tabular-nums">{s.volume} мл</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Toggles panels */}
                  <div className="mt-8">
                    <div className="text-[11px] uppercase font-semibold tracking-[1px] text-[var(--color-text-tertiary)] mb-3 px-1 flex items-center gap-2">
                      {t('ui.options')}
                    </div>

                    <motion.div
                      variants={fadeSlide(!!prefersReduced)}
                      initial="hidden"
                      animate="visible"
                      exit="out"
                      className="grid grid-cols-3 gap-3"
                    >
                      <Pill active={panel==='milk'} onClick={()=>setPanel(panel==='milk' ? null : 'milk')} layoutId="panel-milk">
                        {t('ui.milk')}
                      </Pill>
                      <Pill active={panel==='syrup'} onClick={()=>setPanel(panel==='syrup' ? null : 'syrup')} layoutId="panel-syrup">
                        {t('ui.syrups')}
                      </Pill>
                      <Pill active={panel==='topping'} onClick={()=>setPanel(panel==='topping'? null:'topping')} layoutId="panel-topping">
                        {t('ui.toppings')}
                      </Pill>
                    </motion.div>

                    <AnimatePresence mode="wait">
                      {panel && (
                        <motion.div
                          key={panel}
                          variants={fadeSlide(!!prefersReduced)}
                          initial="hidden"
                          animate="visible"
                          exit="out"
                          className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
                        >
                          {panelData.map((opt, index)=>{
                            const active = isSelected(opt.key);
                            return (
                              <motion.button
                                key={opt.key}
                                layout
                                variants={listItem(!!prefersReduced)}
                                initial="hidden"
                                animate="show"
                                transition={{
                                  delay: prefersReduced ? 0 : index * 0.25,
                                  layout: { duration: 0.8 },
                                  duration: 0.3,
                                  ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                onClick={()=>selectItem(opt.key)}
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.02 }}
                                className={`relative p-3 rounded-2xl border transition-all text-left group overflow-hidden ${
                                  active
                                    ? 'border-black bg-black/5 shadow-lg'
                                    : 'border-black/10 bg-white hover:border-black/20 hover:shadow-md'
                                }`}
                              >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12" />

                                <div className="relative mb-2">
                                  <motion.img
                                    layoutId={`option-img-${panel || 'none'}-${opt.key}`}
                                    src={opt.image}
                                    alt=""
                                    className="w-full h-16 object-cover rounded-[16px] group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <motion.span
                                    layoutId={`option-name-${panel || 'none'}-${opt.key}`}
                                    className="block leading-tight text-[13px] font-semibold"
                                  >
                                    {t(opt.name, opt.name.split('.').pop())}
                                  </motion.span>
                                  {opt.price>0 && (
                                    <motion.span
                                      layoutId={`option-price-${panel || 'none'}-${opt.key}`}
                                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5"
                                    >
                                      +{opt.price}₸
                                    </motion.span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Toppings */}
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="mt-8"
                  >
                    <div className="text-[11px] uppercase font-semibold tracking-[1px] text-[var(--color-text-tertiary)] mb-3 px-1 flex items-center gap-2">
                      {t('ui.toppings')}
                      <motion.button
                        layoutId="topping-toggle"
                        onClick={()=>setPanel(panel==='topping' ? null : 'topping')}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          panel==='topping' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {panel==='topping' ? '−' : '+'}
                      </motion.button>
                    </div>

                    <AnimatePresence mode="wait">
                      {panel === 'topping' && (
                        <motion.div
                          layout
                          variants={listContainer(0.25)}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
                        >
                          {TOPPINGS.map((opt, index)=>{
                            const active = toppingKeys.includes(opt.key);
                            return (
                              <motion.button
                                key={opt.key}
                                layout
                                variants={listItem(!!prefersReduced)}
                                initial="hidden"
                                animate="show"
                                transition={{
                                  delay: prefersReduced ? 0 : index * 0.08,
                                  layout: { duration: 0.3 }
                                }}
                                onClick={()=>toggleMulti(setToppingKeys, toppingKeys, opt.key)}
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.02 }}
                                className={`relative p-3 rounded-2xl border transition-all text-left group overflow-hidden will-change-transform ${
                                  active
                                    ? 'border-black bg-black/5 shadow-lg'
                                    : 'border-black/10 bg-white hover:border-black/20 hover:shadow-md'
                                }`}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12" />
                                <div className="relative mb-2">
                                  <motion.img layoutId={`topping-img-${opt.key}`} src={opt.image} alt="" className="w-full h-16 object-cover rounded-[16px] group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <motion.span layoutId={`topping-name-${opt.key}`} className="block leading-tight text-[13px] font-semibold">
                                    {t(opt.name, opt.name.split('.').pop())}
                                  </motion.span>
                                  {opt.price>0 && (
                                    <motion.span layoutId={`topping-price-${opt.key}`} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5">
                                      +{opt.price}₸
                                    </motion.span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Upsell */}
                <div className="px-6 pt-4 pb-2">
                  <div className="text-[11px] uppercase font-semibold tracking-[1px] text-[var(--color-text-tertiary)] mb-3">{t('ui.together')}</div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                    {[{id:'u1',name:'Чизкейк',price:1590,image:openItem.image},{id:'u2',name:'Маффин',price:890,image:openItem.image}].map(u=> (
                      <button
                        key={u.id}
                        onClick={()=>{dispatch({ type:'ADD_ITEM', payload:{ id: Number(openItem.id)+Math.random(), name:u.name, price:u.price, quantity:1, image:u.image, sizeKey:size, milkKey, syrupKey:'' }});}}
                        className="flex-shrink-0 w-[140px] rounded-2xl bg-[var(--color-bg-alt)] p-3 text-left active:scale-95 transition shadow-[0_4px_16px_-10px_rgba(0,0,0,0.28)] hover:bg-[var(--color-bg-elev-2)]"
                      >
                        <div className="h-20 flex items-center justify-center">
                          <img src={u.image} alt="" className="w-full h-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]" />
                        </div>
                        <div className="text-[12px] font-semibold leading-tight mt-2 line-clamp-2">{u.name}</div>
                        <div className="text-[12px] font-medium opacity-70 mt-1">{u.price} ₸</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky CTA */}
          <div className="fixed left-0 right-0 bottom-[88px] z-[60] px-4 pb-2 pointer-events-none">
            <div ref={cartRef} className="pointer-events-auto bg-[var(--color-bg-elev-1)] rounded-[30px] p-4 flex items-center gap-4 shadow-[0_6px_22px_-10px_rgba(0,0,0,0.28)]">
              <div className="flex items-center bg-[var(--color-bg-alt)] rounded-full overflow-hidden shadow">
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-12 h-12 flex items-center justify-center text-xl font-semibold active:scale-90 transition disabled:opacity-30 will-change-transform" disabled={qty===1}>-</button>
                <div className="w-12 text-center font-semibold tabular-nums text-[17px]">{qty}</div>
                <button onClick={()=>setQty(q=>q+1)} className="w-12 h-12 flex items-center justify-center text-xl font-semibold active:scale-90 transition will-change-transform">+</button>
              </div>
              <div className="flex-1" />
              <motion.button onClick={handleAdd} whileTap={{scale:.93}} className="relative overflow-hidden rounded-full px-8 h-14 flex items-center gap-4 bg-black text-white font-semibold shadow-[0_12px_36px_-16px_rgba(0,0,0,0.65)] dark:bg-white dark:text-black will-change-transform">
                <span className="text-[15px] font-bold">{t('ui.add')} {total} ₸</span>
                {diff!==0 && <span key={total} className="absolute -top-3 right-3 bg-[var(--color-bg-alt)] text-[11px] px-2 py-0.5 rounded-full font-semibold shadow">{diff>0?`+${diff}`:diff}</span>}
              </motion.button>
            </div>

            {openItem && (
              <div className="mt-2 text-[11px] font-medium text-[var(--color-text-secondary)] px-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>{t('ui.base','База')}: {Math.round(basePrice * sizeMult)}₸</span>
                {milkPrice>0 && <span>{t('ui.milk') } +{milkPrice}</span>}
                {syrupPrice>0 && <span>{t('ui.syrups')} +{syrupPrice}</span>}
                {toppingPrice>0 && <span>{t('ui.toppings')} +{toppingPrice}</span>}
                <span className="font-semibold text-[var(--color-text-primary)]">= {total}₸</span>
              </div>
            )}
          </div>
        </BottomSheetPremium>
      </div>
    </LayoutGroup>
  );
};
