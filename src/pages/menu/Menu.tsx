import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { RoyalLoader } from '../../components/RoyalLoader';
import { pushBackHandler } from '../../services/backHandler';
import { useMenu } from '../../hooks/useMenu';
import { useTranslation } from 'react-i18next';
import { useLocation as useLocationContext } from '../../contexts/LocationContext';
import { useHistory } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowLeftIcon,
  MapPinIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { PremiumMenuItem, PremiumCategory } from '../../services/menu';
import { theme } from '../../lib/theme';

/* ─── Brand palette (from centralized theme) ─── */
const C = {
  bg: theme.bg,
  circle: theme.card,
  circleRing: theme.gold,
  primary: '#FAFAFA',
  gold: theme.gold,
} as const;

/* ─── Tabs ─── */
type TabKey = 'all' | 'recommended' | 'favorites' | 'order';
const TABS: { key: TabKey }[] = [
  { key: 'all' },
  { key: 'recommended' },
  { key: 'favorites' },
  { key: 'order' },
];

/* ═══════ Promo Banner ═══════ */
const PromoBanner: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const slides = [
    { gradient: 'from-[#5A0D17]/90 to-[#7A1A2A]/90', title: 'Новинки сезона', sub: 'Попробуйте наши фирменные напитки' },
    { gradient: 'from-[#5A0D17]/80 to-[#D4AF37]/60', title: 'Кешбэк до 20%', sub: 'Копите бонусы с каждым заказом' },
    { gradient: 'from-[#7A1A2A]/90 to-[#5A0D17]/70', title: 'Десерты дня', sub: 'Свежая выпечка каждое утро' },
  ];
  return (
    <div className="px-4 mb-5">
      <div className={`relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br ${slides[idx].gradient} border border-[#D4AF37]/20 shadow-sm`}>
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h3 className="text-2xl font-black text-white leading-tight">{slides[idx].title}</h3>
          <p className="text-sm text-white/70 mt-1">{slides[idx].sub}</p>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 20 : 6, backgroundColor: i === idx ? C.gold : 'rgba(255,255,255,0.25)' }} />
        ))}
      </div>
    </div>
  );
};

/* ═══════ Category row (list) ═══════ */
const CategoryRow: React.FC<{ cat: PremiumCategory; items: PremiumMenuItem[]; onClick: () => void }> = ({ cat, items, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-white/10 last:border-b-0 active:bg-white/5 transition-colors">
    <div
      className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 shadow-sm"
      style={{ border: '2.5px solid rgba(212, 175, 55, 0.35)' }}
    >
      <img src={items[0]?.image || '/images/placeholder.png'} alt={cat.label} className="w-full h-full object-contain" loading="lazy" />
    </div>
    <span className="flex-1 text-left text-base font-semibold text-white leading-tight">{cat.label}</span>
    <ChevronRightIcon className="w-5 h-5 text-white/40 flex-shrink-0" />
  </button>
);

/* ═══════ Circular card (2-col grid) ═══════ */
const CircleCard: React.FC<{ item: PremiumMenuItem; onOpen: (item: PremiumMenuItem) => void }> = ({ item, onOpen }) => (
  <button onClick={() => onOpen(item)} className="flex flex-col items-center text-center active:scale-[0.97] transition-transform">
    <div
      className="w-40 h-40 rounded-full overflow-hidden mb-3"
      style={{
        border: '3px solid rgba(212, 175, 55, 0.30)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      <img src={item.image} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
    </div>
    <p className="text-sm font-medium text-[#3D0A11]/90 leading-tight line-clamp-2 px-1 max-w-[10rem]">{item.name}</p>
    <p className="text-[11px] text-[#D4AF37] font-semibold mt-1">{item.price} ₸</p>
  </button>
);

/* ═══════ Item detail page with premium customizer ═══════ */
const ItemDetail: React.FC<{ item: PremiumMenuItem; onBack: () => void }> = ({ item, onBack }) => {
  const { dispatch } = useCart();
  const { t } = useTranslation();
  const mods = item.modifiers || [];

  /* ── Classify modifiers by semantic role ── */
  const sizeMod = mods.find(m => m.title.toLowerCase().includes('размер'));
  const milkMod = mods.find(m => m.title.toLowerCase().includes('молоко'));
  const syrupMod = mods.find(m => m.title.toLowerCase().includes('сироп'));
  const iceMod = mods.find(m => m.title.toLowerCase().includes('лёд') || m.title.toLowerCase().includes('лед'));
  const otherMods = mods.filter(m => m !== sizeMod && m !== milkMod && m !== syrupMod && m !== iceMod);

  /* ── State ── */
  const [selections, setSelections] = useState<Record<number, string | string[] | boolean | number>>(() => {
    const init: Record<number, string | string[] | boolean | number> = {};
    mods.forEach(m => { init[m.id] = m.default; });
    return init;
  });
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const setMod = (id: number, val: string | string[] | boolean | number) =>
    setSelections(prev => ({ ...prev, [id]: val }));

  const toggleMulti = (id: number, opt: string) => {
    const cur = (selections[id] as string[]) || [];
    setMod(id, cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]);
  };

  /* ── Price calculation (uses sizes from Firestore if available) ── */
  const computedPrice = useMemo(() => {
    let base = item.price;
    if (sizeMod && item.sizes && item.sizes.length > 0) {
      const sizeVal = String(selections[sizeMod.id]);
      const matchedSize = item.sizes.find(s => s.label === sizeVal || s.key === sizeVal);
      if (matchedSize) base = matchedSize.price;
    }
    return base;
  }, [item, sizeMod, selections]);

  /* ── Add to cart ── */
  const handleAdd = () => {
    const modSuffix = mods.map(m => `${m.id}:${JSON.stringify(selections[m.id])}`).join('|');
    const uniqueId = modSuffix ? `${item.id}__${modSuffix}` : String(item.id);
    dispatch({
      type: 'ADD_ITEM',
      payload: { id: uniqueId, name: item.name, price: computedPrice, quantity: 1, image: item.image },
    });
    onBack();
  };

  /* ── Tab config for customizer panels ── */
  const panels = useMemo(() => {
    const p: { key: string; label: string; icon: string; mod: typeof mods[0] }[] = [];
    if (milkMod) p.push({ key: 'milk', label: 'Молоко', icon: '🥛', mod: milkMod });
    if (syrupMod) p.push({ key: 'syrup', label: 'Сиропы', icon: '🍯', mod: syrupMod });
    if (iceMod) p.push({ key: 'ice', label: 'Лёд', icon: '🧊', mod: iceMod });
    otherMods.forEach(m => {
      const t = m.title.toLowerCase();
      let icon = '⚙️';
      if (t.includes('сахар')) icon = '🍬';
      else if (t.includes('шоколад')) icon = '🍫';
      else if (t.includes('специ')) icon = '🌿';
      else if (t.includes('мята')) icon = '🌱';
      else if (t.includes('маршм')) icon = '☁️';
      else if (t.includes('сливк')) icon = '🍨';
      else if (t.includes('сладос')) icon = '✨';
      else if (t.includes('вид')) icon = '🍵';
      p.push({ key: `mod-${m.id}`, label: m.title, icon, mod: m });
    });
    return p;
  }, [milkMod, syrupMod, iceMod, otherMods]);

  const activePanelData = panels.find(p => p.key === activePanel);

  /* ── Size pill labels ── */
  const getSizeDisplay = (opt: string) => {
    if (item.sizes) {
      const s = item.sizes.find(sz => sz.label === opt || sz.key === opt);
      if (s) return { label: s.label, sub: s.volume ? `${s.volume} ${t('screen.menu.ml')}` : '', price: s.price };
    }
    return { label: opt.includes('.') ? `${parseFloat(opt) * 1000} ${t('screen.menu.ml')}` : opt, sub: '', price: 0 };
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F4EDE4' }}>
      <div className="relative z-10">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-4 pt-safe pb-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-base font-semibold text-white flex-1 truncate">{item.name}</h1>
      </div>

      <div className="flex flex-col pb-40">
        {/* ── Hero ── */}
        <div className="relative flex justify-center pt-6 pb-4">
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 60%)' }} />
          <div className="relative w-52 h-52 rounded-full overflow-hidden"
            style={{ border: '3px solid rgba(212,175,55,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 8px rgba(212,175,55,0.04)' }}>
            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* ── Info ── */}
        <div className="px-5 text-center">
          <h2 className="text-[22px] font-bold text-[#3D0A11] leading-tight tracking-tight">{item.name}</h2>
          {item.description && (
            <p className="text-[13px] text-[#3D0A11]/40 mt-1.5 leading-relaxed max-w-xs mx-auto">{item.description}</p>
          )}
          {item.badges && item.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {item.badges.map(b => (
                <span key={b.label} className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                    color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>{b.label}</span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-[28px] font-extrabold text-[#D4AF37]">{computedPrice} ₸</span>
          </div>
          {(item.energy || item.protein) && (
            <div className="flex items-center justify-center gap-4 mt-2">
              {item.energy ? <span className="text-[11px] text-[#3D0A11]/30 font-medium">{item.energy} {t('screen.menu.kcal')}</span> : null}
              {item.protein ? <span className="text-[11px] text-[#3D0A11]/30">Б {item.protein}г</span> : null}
              {item.fat ? <span className="text-[11px] text-[#3D0A11]/30">Ж {item.fat}г</span> : null}
              {item.carbs ? <span className="text-[11px] text-[#3D0A11]/30">У {item.carbs}г</span> : null}
            </div>
          )}
        </div>

        {/* ═══ SIZE SELECTOR — animated segmented control ═══ */}
        {sizeMod && sizeMod.options && (
          <div className="mt-6 px-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-[#3D0A11]/40 uppercase tracking-[0.15em]">📐 {t('screen.menu.size')}</span>
              <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.15), transparent)' }} />
            </div>
            <div className="relative flex p-1 rounded-2xl" style={{ background: 'rgba(61,10,17,0.06)', border: '1px solid rgba(61,10,17,0.08)' }}>
              {sizeMod.options.map((opt) => {
                const active = selections[sizeMod.id] === opt;
                const info = getSizeDisplay(opt);
                return (
                  <button key={opt} onClick={() => setMod(sizeMod.id, opt)}
                    className="flex-1 relative z-10 py-3 rounded-xl transition-all duration-200"
                    style={active ? {} : {}}>
                    {active && (
                      <div className="absolute inset-0 rounded-xl"
                        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)',
                          boxShadow: '0 4px 12px rgba(212,175,55,0.35)' }} />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                      <span className={`text-[14px] font-bold ${active ? 'text-[#3D0A11]' : 'text-[#3D0A11]/50'}`}>{info.label}</span>
                      {info.sub && <span className={`text-[10px] mt-0.5 ${active ? 'text-[#3D0A11]/60' : 'text-[#3D0A11]/30'}`}>{info.sub}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ CUSTOMIZER TABS ═══ */}
        {panels.length > 0 && (
          <div className="mt-5 px-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-[#3D0A11]/40 uppercase tracking-[0.15em]">✨ {t('screen.menu.customize')}</span>
              <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.15), transparent)' }} />
            </div>

            {/* Tab buttons */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {panels.map(p => {
                const isActive = activePanel === p.key;
                /* count selected items for badge */
                const sel = selections[p.mod.id];
                const hasSel = p.mod.type === 'multi'
                  ? (sel as string[] || []).length > 0
                  : p.mod.type === 'toggle'
                    ? !!sel
                    : false;
                return (
                  <button key={p.key}
                    onClick={() => setActivePanel(isActive ? null : p.key)}
                    className="relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#D4AF37',
                    } : {
                      background: 'rgba(61,10,17,0.06)',
                      border: '1px solid rgba(61,10,17,0.08)',
                      color: 'rgba(61,10,17,0.5)',
                    }}>
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    {hasSel && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#D4AF37' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active panel content */}
            {activePanelData && (
              <div className="mt-3 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(61,10,17,0.04)', border: '1px solid rgba(61,10,17,0.06)' }}>
                <div className="p-4">
                  {/* SELECT type — vertical option list */}
                  {activePanelData.mod.type === 'select' && activePanelData.mod.options && (
                    <div className="space-y-2">
                      {activePanelData.mod.options.map(opt => {
                        const active = selections[activePanelData.mod.id] === opt;
                        return (
                          <button key={opt} onClick={() => setMod(activePanelData.mod.id, opt)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200"
                            style={active ? {
                              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
                              border: '1px solid rgba(212,175,55,0.25)',
                            } : {
                              background: 'rgba(61,10,17,0.03)',
                              border: '1px solid rgba(61,10,17,0.06)',
                            }}>
                            {/* Radio circle */}
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ border: active ? '2px solid #D4AF37' : '2px solid rgba(61,10,17,0.2)' }}>
                              {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4AF37' }} />}
                            </div>
                            <span className={`text-[14px] font-medium ${active ? 'text-[#3D0A11]' : 'text-[#3D0A11]/50'}`}>{opt}</span>
                            {active && (
                              <svg className="w-4 h-4 text-[#D4AF37] ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* MULTI type — chip grid */}
                  {activePanelData.mod.type === 'multi' && activePanelData.mod.options && (
                    <div className="flex flex-wrap gap-2">
                      {activePanelData.mod.options.map(opt => {
                        const sel = ((selections[activePanelData.mod.id] as string[]) || []).includes(opt);
                        return (
                          <button key={opt} onClick={() => toggleMulti(activePanelData.mod.id, opt)}
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-200"
                            style={sel ? {
                              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
                              border: '1px solid rgba(212,175,55,0.3)',
                            } : {
                              background: 'rgba(61,10,17,0.03)',
                              border: '1px solid rgba(61,10,17,0.08)',
                            }}>
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={sel ? {
                                background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
                              } : {
                                border: '1.5px solid rgba(61,10,17,0.15)',
                              }}>
                              {sel && (
                                <svg className="w-3 h-3 text-[#3D0A11]" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-[13px] font-medium ${sel ? 'text-[#D4AF37]' : 'text-[#3D0A11]/50'}`}>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TOGGLE type */}
                  {activePanelData.mod.type === 'toggle' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-[#3D0A11]/70">{activePanelData.mod.title}</span>
                      <button onClick={() => setMod(activePanelData.mod.id, !selections[activePanelData.mod.id])}
                        className="relative w-[52px] h-[30px] rounded-full transition-all duration-300"
                        style={{
                          background: selections[activePanelData.mod.id]
                            ? 'linear-gradient(135deg, #D4AF37, #B8962E)' : 'rgba(61,10,17,0.1)',
                          boxShadow: selections[activePanelData.mod.id] ? '0 2px 8px rgba(212,175,55,0.3)' : 'none',
                        }}>
                        <div className="absolute top-[3px] w-6 h-6 rounded-full bg-white transition-transform duration-300"
                          style={{
                            transform: selections[activePanelData.mod.id] ? 'translateX(24px)' : 'translateX(3px)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }} />
                      </button>
                    </div>
                  )}

                  {/* SLIDER type */}
                  {activePanelData.mod.type === 'slider' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium text-[#3D0A11]/70">{activePanelData.mod.title}</span>
                        <div className="px-3 py-1 rounded-lg" style={{ background: 'rgba(212,175,55,0.15)' }}>
                          <span className="text-[14px] font-bold text-[#D4AF37]">{String(selections[activePanelData.mod.id])}</span>
                        </div>
                      </div>
                      <input type="range" min={activePanelData.mod.min ?? 0} max={activePanelData.mod.max ?? 3}
                        value={Number(selections[activePanelData.mod.id]) || 0}
                        onChange={e => setMod(activePanelData.mod.id, Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none outline-none"
                        style={{ background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((Number(selections[activePanelData.mod.id]) || 0) / (activePanelData.mod.max || 3)) * 100}%, rgba(61,10,17,0.1) ${((Number(selections[activePanelData.mod.id]) || 0) / (activePanelData.mod.max || 3)) * 100}%, rgba(61,10,17,0.1) 100%)` }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ QUICK TOGGLES for remaining simple mods not in panels ═══ */}
        {/* (All mods are in panels now, but if sizes-only item has no panels this section stays empty) */}
      </div>

      {/* ── Bottom bar — premium floating cart ── */}
      <div className="fixed bottom-20 inset-x-0 z-30 px-4 pb-3 pt-6"
        style={{ background: 'linear-gradient(to top, #F4EDE4 70%, transparent)' }}>
        <div className="flex items-center gap-3 p-3.5 rounded-2xl"
          style={{ background: 'rgba(61,10,17,0.97)', backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(212,175,55,0.1)' }}>
          <div className="flex-1 pl-1">
            <span className="text-[26px] font-extrabold text-[#D4AF37] tracking-tight">{computedPrice} ₸</span>
          </div>
          <button onClick={handleAdd}
            className="px-7 py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-200 active:scale-[0.96]"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)', color: '#3D0A11',
              boxShadow: '0 4px 16px rgba(212,175,55,0.4), 0 1px 2px rgba(0,0,0,0.1)' }}>
            {t('screen.menu.addToCart')}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

/* ═══════ Loading — cup fills up ═══════ */
const MenuLoading: React.FC = () => <RoyalLoader fullScreen={false} />;

/* ══════════════════════════════════════════════════════════
   MAIN MENU PAGE
   ══════════════════════════════════════════════════════════ */
const Menu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { selectedLocation, isLocationSelected } = useLocationContext();
  const history = useHistory();
  const { drinks, food, loading, error } = useMenu(i18n.language);

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [menuType, setMenuType] = useState<'drinks' | 'food'>('drinks');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PremiumMenuItem | null>(null);

  /* derived data */
  const allCategories = useMemo(() => (menuType === 'drinks' ? drinks.categories : food.categories), [drinks.categories, food.categories, menuType]);
  const allItems = useMemo(() => (menuType === 'drinks' ? drinks.items : food.items), [drinks.items, food.items, menuType]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return allCategories;
    const q = search.toLowerCase();
    return allCategories.filter(cat => allItems.some(it => String(it.categoryId) === cat.key && it.name.toLowerCase().includes(q)));
  }, [allCategories, allItems, search]);

  const getItems = useCallback((key: string) => {
    let items = allItems.filter(it => String(it.categoryId) === key);
    if (search.trim()) { const q = search.toLowerCase(); items = items.filter(it => it.name.toLowerCase().includes(q)); }
    return items;
  }, [allItems, search]);

  const selectedCatData = useMemo(() => (selectedCategory ? allCategories.find(c => c.key === selectedCategory) ?? null : null), [allCategories, selectedCategory]);
  const selectedCatItems = useMemo(() => (selectedCategory ? allItems.filter(it => String(it.categoryId) === selectedCategory) : []), [allItems, selectedCategory]);

  /* ─── Android hardware back: close inner screens one level at a time
     (item detail → category grid → category list) instead of leaving the menu ─── */
  useEffect(() => {
    if (detailItem) return pushBackHandler(() => setDetailItem(null));
    if (selectedCategory) return pushBackHandler(() => setSelectedCategory(null));
  }, [detailItem, selectedCategory]);

  /* ─── Detail page ─── */
  if (detailItem) {
    return <ItemDetail item={detailItem} onBack={() => setDetailItem(null)} />;
  }

  /* ─── Subcategory grid (2-col circular cards) ─── */
  if (selectedCategory && selectedCatData) {
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: '#F4EDE4' }}>
        <div className="relative z-10">
        <div className="sticky top-0 z-30 bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] px-4 pt-safe pb-3 flex items-center gap-3 shadow-lg">
          <button onClick={() => setSelectedCategory(null)} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}><ArrowLeftIcon className="w-5 h-5 text-white" /></button>
          <h1 className="text-lg font-semibold text-white flex-1">{selectedCatData.label}</h1>
        </div>

        <div className="px-4 pt-6 pb-36">
          <div className="grid grid-cols-2 gap-y-8 gap-x-4 justify-items-center">
            {selectedCatItems.map(item => (
              <CircleCard key={item.id} item={item} onOpen={setDetailItem} />
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  /* ─── Main category list ─── */
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F4EDE4' }}>
      <div className="relative z-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17]">
        <div className="px-4 pt-safe pb-2">
          <h1 className="text-2xl font-bold text-white">{t('screen.menu.title')}</h1>
        </div>

        {/* Напитки / Еда */}
        <div className="px-4 pb-2 flex gap-2">
          {(['drinks', 'food'] as const).map(type => (
            <button key={type} onClick={() => { setMenuType(type); setSelectedCategory(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                menuType === type ? 'bg-[#D4AF37] text-black shadow-md' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}>
              {type === 'drinks' ? t('screen.menu.drinks') : t('screen.menu.food')}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activeTab === tab.key
                  ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/15'
                  : 'border-white/20 text-white/60 bg-white/10'
              }`}>
              {t(`screen.menu.tabs.${tab.key}`)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('screen.menu.search')}
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/15 border border-white/20 text-sm text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5">
                <XMarkIcon className="w-4 h-4 text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="px-4 pb-3 flex gap-2">
          {search && (
            <button onClick={() => setSearch('')} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 text-white/80 text-sm font-medium">
              <XMarkIcon className="w-4 h-4" />{t('screen.menu.clearFilter')}
            </button>
          )}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-black shadow-md bg-[#D4AF37]">
            <FunnelIcon className="w-4 h-4" />{t('screen.menu.filters')}
          </button>
        </div>
      </div>

      {/* Location bar */}
      <button onClick={() => history.push('/locations')}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#3D0A11]/5 border-b border-[#3D0A11]/10 w-full text-left transition-colors hover:bg-[#3D0A11]/10">
        <MapPinIcon className={`w-4 h-4 flex-shrink-0 ${isLocationSelected ? 'text-[#D4AF37]' : 'text-[#3D0A11]/40'}`} />
        <span className={`text-xs font-medium truncate flex-1 ${isLocationSelected ? 'text-[#3D0A11]/80' : 'text-[#3D0A11]/40'}`}>
          {isLocationSelected ? selectedLocation?.name : t('screen.menu.selectCoffeeShop')}
        </span>
        <ChevronRightIcon className="w-3.5 h-3.5 text-[#3D0A11]/20 flex-shrink-0" />
      </button>

      {/* Content */}
      <div className="pb-36">
        {loading ? <MenuLoading /> : error ? (
          <div className="p-8 text-center text-[#3D0A11]/40"><p className="text-lg mb-2">{t('screen.menu.loadError')}</p><p className="text-sm">{error}</p></div>
        ) : (
          <>
            {!search && activeTab === 'all' && <div className="mt-4"><PromoBanner /></div>}

            <div className="px-4 mt-4 mb-2">
              <h2 className="text-xl font-bold text-[#D4AF37]">{menuType === 'drinks' ? t('screen.menu.drinks') : t('screen.menu.food')}</h2>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="px-4 py-12 text-center text-[#3D0A11]/40 text-sm">{t('screen.menu.nothingFound')}</div>
            ) : (
              <div className="bg-cream-card mx-4 rounded-3xl overflow-hidden border border-cream-border shadow-royal-sm">
                {filteredCategories.map(cat => {
                  const items = getItems(cat.key);
                  if (items.length === 0 && search) return null;
                  return <CategoryRow key={cat.key} cat={cat} items={items.length > 0 ? items : allItems.filter(i => String(i.categoryId) === cat.key)} onClick={() => setSelectedCategory(cat.key)} />;
                })}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default memo(Menu);