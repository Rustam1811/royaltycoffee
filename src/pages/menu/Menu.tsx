import React, { useState, useMemo, memo, useCallback } from 'react';
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
  HeartIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import type { PremiumMenuItem, PremiumCategory } from '../../services/menu';

/* ─── Brand palette (бордовые оттенки) ─── */
const C = {
  bg: '#4A1111',       // фон страницы — чуть светлее кружка
  circle: '#3C0A0A',   // кружки с изображениями
  primary: '#5C0E0E',
  gold: '#D4AF37',
} as const;

/* ─── Tabs ─── */
type TabKey = 'all' | 'recommended' | 'favorites' | 'order';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'recommended', label: 'Рекомендуемое' },
  { key: 'favorites', label: 'Избранное' },
  { key: 'order', label: 'Заказать' },
];

/* ═══════ Promo Banner ═══════ */
const PromoBanner: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const slides = [
    { gradient: 'from-[#D4AF37]/30 to-[#5C0E0E]/40', title: 'Новинки сезона', sub: 'Попробуйте наши фирменные напитки' },
    { gradient: 'from-[#5C0E0E]/40 to-[#D4AF37]/20', title: 'Кешбэк до 20%', sub: 'Копите бонусы с каждым заказом' },
    { gradient: 'from-[#D4AF37]/20 to-[#3C0A0A]/50', title: 'Десерты дня', sub: 'Свежая выпечка каждое утро' },
  ];
  return (
    <div className="px-4 mb-5">
      <div className={`relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br ${slides[idx].gradient} border border-white/10 shadow-lg backdrop-blur-sm`}>
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h3 className="text-2xl font-black text-white leading-tight">{slides[idx].title}</h3>
          <p className="text-sm text-white/60 mt-1">{slides[idx].sub}</p>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 20 : 6, backgroundColor: i === idx ? C.gold : 'rgba(255,255,255,0.3)' }} />
        ))}
      </div>
    </div>
  );
};

/* ═══════ Category row (list) — dark theme ═══════ */
const CategoryRow: React.FC<{ cat: PremiumCategory; items: PremiumMenuItem[]; onClick: () => void }> = ({ cat, items, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.08] last:border-b-0 active:bg-white/[0.12] transition-colors">
    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10" style={{ backgroundColor: C.circle }}>
      <img src={items[0]?.image || '/images/placeholder.png'} alt={cat.label} className="w-full h-full object-contain p-1.5" loading="lazy" />
    </div>
    <span className="flex-1 text-left text-base font-semibold text-white leading-tight">{cat.label}</span>
    <ChevronRightIcon className="w-5 h-5 text-white/30 flex-shrink-0" />
  </button>
);

/* ═══════ Circular card (2-col grid) — dark theme ═══════ */
const CircleCard: React.FC<{ item: PremiumMenuItem; onOpen: (item: PremiumMenuItem) => void }> = ({ item, onOpen }) => (
  <button onClick={() => onOpen(item)} className="flex flex-col items-center text-center active:scale-[0.97] transition-transform">
    <div className="w-40 h-40 rounded-full overflow-hidden shadow-xl ring-1 ring-white/10 mb-3" style={{ backgroundColor: C.circle }}>
      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-3" loading="lazy" />
    </div>
    <p className="text-sm font-medium text-white leading-tight line-clamp-2 px-1 max-w-[10rem]">{item.name}</p>
  </button>
);

/* ═══════ Item detail page — dark theme with RoyalLayout ═══════ */
const ItemDetail: React.FC<{ item: PremiumMenuItem; onBack: () => void }> = ({ item, onBack }) => {
  const { dispatch } = useCart();

  const handleAdd = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: { id: String(item.id), name: item.name, price: item.price, quantity: 1, image: item.image },
    });
    onBack();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#3C0A0A]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1"><ArrowLeftIcon className="w-5 h-5 text-white" /></button>
        <h1 className="text-base font-semibold text-white flex-1 truncate">{item.name}</h1>
      </div>

      <div className="flex flex-col items-center pb-36">
        {/* Large circular image */}
        <div className="mt-8 w-64 h-64 rounded-full overflow-hidden shadow-2xl ring-2 ring-white/10" style={{ backgroundColor: C.circle }}>
          <img src={item.image} alt={item.name} className="w-full h-full object-contain p-5" />
        </div>

        {/* Share / Favorite */}
        <div className="flex justify-between w-full px-10 mt-6">
          <button className="p-2 active:scale-90 transition-transform"><ShareIcon className="w-6 h-6 text-white/60" /></button>
          <button className="p-2 active:scale-90 transition-transform"><HeartIcon className="w-6 h-6 text-white/60" /></button>
        </div>

        {/* Name */}
        <h2 className="text-2xl font-bold text-white text-center mt-5 px-6 leading-tight">{item.name}</h2>

        {/* Badges */}
        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3 px-6">
            {item.badges.map(b => (
              <span key={b.label} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/20 text-[#D4AF37]">{b.label}</span>
            ))}
          </div>
        )}

        {/* Nutrition */}
        <p className="text-base text-white/50 text-center mt-4 px-8 leading-relaxed">
          {item.energy ? `${item.energy} ккал` : ''}
          {item.protein ? ` · Б: ${item.protein}г` : ''}
          {item.fat ? ` · Ж: ${item.fat}г` : ''}
          {item.carbs ? ` · У: ${item.carbs}г` : ''}
        </p>

        {/* Sizes */}
        {item.sizes && item.sizes.length > 1 && (
          <div className="flex gap-2 mt-5 px-6">
            {item.sizes.map(s => (
              <div key={s.key} className="px-4 py-2 rounded-xl bg-[#3C0A0A]/50 border border-white/[0.08] text-sm text-white/80 font-medium">
                {s.label} · {s.price} ₸
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar — price + add */}
      <div className="fixed bottom-20 inset-x-0 z-30 bg-[#3C0A0A]/90 backdrop-blur-xl border-t border-white/10 px-5 py-4 flex items-center gap-3">
        <div className="flex-1">
          <span className="text-2xl font-bold text-[#D4AF37]">{item.price} ₸</span>
          {item.sizes && item.sizes.length > 1 && (
            <p className="text-xs text-white/40 mt-0.5">от {Math.min(...item.sizes.map(s => s.price))} ₸</p>
          )}
        </div>
        <button onClick={handleAdd} className="px-8 py-3.5 rounded-2xl text-black font-bold text-base shadow-lg active:scale-95 transition-transform bg-[#D4AF37] hover:bg-[#C9A632]">
          В корзину
        </button>
      </div>
    </div>
  );
};

/* ═══════ Skeleton — dark ═══════ */
const MenuSkeleton: React.FC = () => (
  <div className="px-4 space-y-3 mt-4">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-4 py-3">
        <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 h-5 bg-white/10 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════
   MAIN MENU PAGE
   ══════════════════════════════════════════════════════════ */
const Menu: React.FC = () => {
  const { i18n } = useTranslation();
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

  /* ─── Detail page ─── */
  if (detailItem) {
    return <ItemDetail item={detailItem} onBack={() => setDetailItem(null)} />;
  }

  /* ─── Subcategory grid (2-col circular cards) ─── */
  if (selectedCategory && selectedCatData) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
        <div className="sticky top-0 z-30 bg-[#3C0A0A]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="p-1 -ml-1"><ArrowLeftIcon className="w-5 h-5 text-white" /></button>
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
    );
  }

  /* ─── Main category list ─── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#3C0A0A]/80 backdrop-blur-md border-b border-white/10">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-white">Меню</h1>
        </div>

        {/* Напитки / Еда */}
        <div className="px-4 pb-2 flex gap-2">
          {(['drinks', 'food'] as const).map(t => (
            <button key={t} onClick={() => { setMenuType(t); setSelectedCategory(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                menuType === t ? 'bg-[#D4AF37] text-black shadow-md' : 'bg-[#3C0A0A]/50 text-white/70 hover:bg-[#3C0A0A]/70'
              }`}>
              {t === 'drinks' ? 'Напитки' : 'Еда'}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activeTab === tab.key
                  ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-white/10 text-white/60 bg-[#3C0A0A]/30'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск.."
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#3C0A0A]/50 border border-white/[0.08] text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5">
                <XMarkIcon className="w-4 h-4 text-white/40" />
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="px-4 pb-3 flex gap-2">
          {search && (
            <button onClick={() => setSearch('')} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3C0A0A]/50 text-white/70 text-sm font-medium">
              <XMarkIcon className="w-4 h-4" />Очистить фильтр
            </button>
          )}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-black shadow-md bg-[#D4AF37]">
            <FunnelIcon className="w-4 h-4" />Фильтры
          </button>
        </div>
      </div>

      {/* Location bar */}
      <button onClick={() => history.push('/locations')}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#3C0A0A]/40 backdrop-blur-sm border-b border-white/[0.08] w-full text-left transition-colors hover:bg-[#3C0A0A]/60 active:bg-[#3C0A0A]/70">
        <MapPinIcon className={`w-4 h-4 flex-shrink-0 ${isLocationSelected ? 'text-[#D4AF37]' : 'text-white/40'}`} />
        <span className={`text-xs font-medium truncate flex-1 ${isLocationSelected ? 'text-white/90' : 'text-white/50'}`}>
          {isLocationSelected ? selectedLocation?.name : 'Выберите кофейню'}
        </span>
        <ChevronRightIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
      </button>

      {/* Content */}
      <div className="pb-36">
        {loading ? <MenuSkeleton /> : error ? (
          <div className="p-8 text-center text-white/60"><p className="text-lg mb-2">Ошибка загрузки</p><p className="text-sm">{error}</p></div>
        ) : (
          <>
            {!search && activeTab === 'all' && <div className="mt-4"><PromoBanner /></div>}

            <div className="px-4 mt-4 mb-2">
              <h2 className="text-xl font-bold text-[#D4AF37]/80">{menuType === 'drinks' ? 'Напитки' : 'Еда'}</h2>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="px-4 py-12 text-center text-white/40 text-sm">Ничего не найдено</div>
            ) : (
              <div className="bg-[#3C0A0A]/60 mx-4 rounded-2xl overflow-hidden border border-white/[0.08] backdrop-blur-sm">
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
  );
};

export default memo(Menu);