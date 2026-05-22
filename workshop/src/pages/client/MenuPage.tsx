import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/contexts/UserContext';
import { WorkshopLoader } from '@/components/ui';
import { getAllProducts, getCategories, getClientByUid } from '@/services';
import { WorkshopProduct, WorkshopCategory, LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// JS-based breakpoint — avoids CSS media query issues in Capacitor WebView
function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

// ─── Inline editable quantity ───
const QuantityInput: React.FC<{
  value: number;
  onChange: (qty: number) => void;
  min?: number;
}> = ({ value, onChange, min = 0 }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    const num = parseInt(draft, 10);
    if (!isNaN(num) && num >= min) {
      onChange(num);
    } else {
      setDraft(value.toString());
    }
  };

  const startEdit = () => {
    setDraft(value.toString());
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        style={{ width: 48, height: 32, textAlign: 'center', fontWeight: 600, color: '#0f172a', border: '1px solid #d4a574', borderRadius: 8, background: '#fff', outline: 'none', fontSize: 14 }}
        min={min}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      style={{ width: 48, height: 32, textAlign: 'center', fontWeight: 600, color: '#0f172a', borderRadius: 8, background: 'none', border: 'none', cursor: 'text', fontSize: 14 }}
      title="Нажмите чтобы ввести число"
    >
      {value}
    </button>
  );
};

// ─── Product detail modal ───
const ProductDetailModal: React.FC<{
  product: WorkshopProduct;
  quantity: number;
  onAddToCart: () => void;
  onDelta: (delta: number) => void;
  onClose: () => void;
}> = ({ product, quantity, onAddToCart, onDelta, onClose }) => {
  const step = product.minOrder || 1;
  const { nutrition } = product;
  const hasNutrition = nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: '100%', flexShrink: 0, background: '#f5f0eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          {product.image ? (
            <img
              src={product.image}
              alt={getLocalizedName(product.name)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: !product.isAvailable ? 'grayscale(1) opacity(0.7)' : 'none' }}
            />
          ) : (
            <div style={{ fontSize: 72, color: '#cbd5e1' }}>🥐</div>
          )}
          {!product.isAvailable && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>
              Нет в наличии
            </div>
          )}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, background: 'rgba(0,0,0,0.45)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <XMarkIcon style={{ width: 20, height: 20, display: 'block' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 32px' }}>
          {/* Name + price */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, margin: 0, flex: 1 }}>
              {getLocalizedName(product.name)}
            </h2>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>{product.price.toLocaleString()} ₸</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>за {product.unit}</div>
            </div>
          </div>

          {product.minOrder && product.minOrder > 1 && (
            <p style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', display: 'inline-block', padding: '3px 10px', borderRadius: 8, marginBottom: 12 }}>
              Мин. заказ: {product.minOrder} {product.unit}
            </p>
          )}

          {product.description && (
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 16, marginTop: 8 }}>{getLocalizedName(product.description)}</p>
          )}

          {/* КБЖУ */}
          {hasNutrition && (
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, margin: '0 0 12px' }}>
                КБЖУ · на {nutrition!.per || 'порцию'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                {nutrition!.calories != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{nutrition!.calories}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>ккал</p>
                  </div>
                )}
                {nutrition!.protein != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', margin: 0 }}>{nutrition!.protein}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>белки</p>
                  </div>
                )}
                {nutrition!.fat != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{nutrition!.fat}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>жиры</p>
                  </div>
                )}
                {nutrition!.carbs != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', margin: 0 }}>{nutrition!.carbs}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>углев.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cart controls */}
          {product.isAvailable && (
            <div style={{ marginTop: 8 }}>
              {quantity > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 16, padding: 8 }}>
                  <button onClick={() => onDelta(-step)} style={{ width: 48, height: 48, borderRadius: 12, background: '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MinusIcon style={{ width: 20, height: 20, display: 'block' }} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{quantity} {product.unit}</span>
                  <button onClick={() => onDelta(step)} style={{ width: 48, height: 48, borderRadius: 12, background: '#92400e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <PlusIcon style={{ width: 20, height: 20, display: 'block' }} />
                  </button>
                </div>
              ) : (
                <button onClick={onAddToCart} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}>
                  Добавить в заказ
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Страница меню цеха для клиента
 * Mobile-first + desktop grid layout
 */
const MenuPage: React.FC = () => {
  const query = useQuery();
  const history = useHistory();
  const { user } = useUser();
  const isMobile = useIsMobile(1024);
  const outletId = query.get('outletId') || '';
  const outletName = decodeURIComponent(query.get('outletName') || 'Точка');
  
  const { items, addItem, updateQuantity, totalItems, totalAmount } = useCart();
  const [products, setProducts] = useState<WorkshopProduct[]>([]);
  const [categories, setCategories] = useState<WorkshopCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isInternalWorkshop, setIsInternalWorkshop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WorkshopProduct | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getAllProducts(),
          getCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);

        // Load client flag for internal workshop visibility
        if (user?.uid) {
          const client = await getClientByUid(user.uid);
          setIsInternalWorkshop(client?.isInternalWorkshop ?? false);
        }
      } catch (error) {
        console.error('Error loading menu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.uid]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
        const matchesSearch = !searchQuery || 
          getLocalizedName(product.name).toLowerCase().includes(searchQuery.toLowerCase());
        // Internal workshop clients see ALL products (including restricted ones)
        // Regular clients only see products without outlet restrictions, or ones explicitly allowed for their outlet
        const matchesOutlet = isInternalWorkshop
          ? true
          : (!product.restrictedToOutletIds?.length || product.restrictedToOutletIds.includes(outletId));
        return matchesCategory && matchesSearch && matchesOutlet;
      })
      .sort((a, b) => {
        // Available products first, unavailable at the bottom
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, outletId, isInternalWorkshop]);

  const getItemQuantity = (productId: string): number => {
    const item = items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  const handleAddProduct = (product: WorkshopProduct) => {
    addItem(product, product.minOrder || 1);
  };

  const handleSetQuantity = (productId: string, qty: number) => {
    updateQuantity(productId, qty);
  };

  const handleDelta = (productId: string, delta: number, minOrder: number) => {
    const currentQty = getItemQuantity(productId);
    const next = currentQty + delta;
    // Если снижаем ниже minOrder — убираем
    if (next < minOrder) {
      updateQuantity(productId, 0);
    } else {
      updateQuantity(productId, next);
    }
  };

  const handleGoToCart = () => {
    history.push(`/client/cart?outletId=${outletId}&outletName=${encodeURIComponent(outletName)}`);
  };

  if (loading) {
    return <WorkshopLoader text="Загрузка меню..." />;
  }

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '40px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 960, margin: '0 auto' }}>
            <button onClick={() => history.goBack()} style={{ padding: 8, marginLeft: -8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
              <ArrowLeftIcon style={{ width: 20, height: 20 }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontWeight: 700, fontSize: 20, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{outletName}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 }}>Выберите продукцию</p>
            </div>
            {totalItems > 0 && (
              <button
                onClick={handleGoToCart}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                <ShoppingCartIcon style={{ width: 20, height: 20 }} />
                <span>{totalAmount.toLocaleString()} ₸</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          {/* Search */}
          <div style={{ padding: '12px 16px 0', maxWidth: 960, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#94a3b8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, background: '#f1f5f9', borderRadius: 12, border: 'none', outline: 'none', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {/* Categories */}
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', maxWidth: 960, margin: '0 auto' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{ padding: '8px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: selectedCategory === 'all' ? '#92400e' : '#f1f5f9', color: selectedCategory === 'all' ? '#fff' : '#475569', flexShrink: 0 }}
            >
              Все
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{ padding: '8px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: selectedCategory === category.id ? '#92400e' : '#f1f5f9', color: selectedCategory === category.id ? '#fff' : '#475569', flexShrink: 0 }}
              >
                {category.icon} {getLocalizedName(category.name)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div style={{ padding: '16px', maxWidth: 960, margin: '0 auto', paddingBottom: 120 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => {
                const quantity = getItemQuantity(product.id);
                const step = product.minOrder || 1;
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden', opacity: product.isAvailable ? 1 : 0.6 }}
                  >
                    <div style={{ display: 'flex' }}>
                      {/* Image */}
                      <button
                        onClick={() => setSelectedProduct(product)}
                        style={{ width: 96, height: 96, flexShrink: 0, background: '#f5f0eb', position: 'relative', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {product.image ? (
                          <img src={product.image} alt={getLocalizedName(product.name)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: !product.isAvailable ? 'grayscale(1)' : 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🥐</div>
                        )}
                        {!product.isAvailable && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: 4 }}>НЕТ</span>
                          </div>
                        )}
                      </button>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: product.isAvailable ? '#0f172a' : '#94a3b8', margin: 0 }}>
                            {getLocalizedName(product.name)}
                          </p>
                          {product.description ? (
                            <button onClick={() => setSelectedProduct(product)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', marginTop: 2 }}>
                              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{getLocalizedName(product.description)}</p>
                              <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>Подробнее →</span>
                            </button>
                          ) : (
                            <button onClick={() => setSelectedProduct(product)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: '#92400e', fontWeight: 500, marginTop: 2 }}>Подробнее →</button>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: product.isAvailable ? '#92400e' : '#94a3b8' }}>{product.price.toLocaleString()} ₸</span>
                            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>/{product.unit}</span>
                            {product.minOrder && product.minOrder > 1 && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>мин.{product.minOrder}</span>}
                          </div>

                          {!product.isAvailable ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '4px 8px', borderRadius: 8 }}>Нет</span>
                          ) : quantity > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button onClick={() => handleDelta(product.id, -step, step)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <MinusIcon style={{ width: 16, height: 16 }} />
                              </button>
                              <QuantityInput value={quantity} onChange={(q) => handleSetQuantity(product.id, q)} min={0} />
                              <button onClick={() => handleDelta(product.id, step, step)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#92400e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                                <PlusIcon style={{ width: 16, height: 16 }} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleAddProduct(product)} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                              Добавить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filteredProducts.map((product, index) => {
              const quantity = getItemQuantity(product.id);
              const step = product.minOrder || 1;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: product.isAvailable ? 1 : 0.6 }}
                >
                  {/* Image */}
                  <button onClick={() => setSelectedProduct(product)} style={{ aspectRatio: '4/3', background: '#f5f0eb', position: 'relative', display: 'block', width: '100%', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}>
                    {product.image ? (
                      <img src={product.image} alt={getLocalizedName(product.name)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: !product.isAvailable ? 'grayscale(1)' : 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: '#cbd5e1' }}>🥐</div>
                    )}
                    {!product.isAvailable && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 8 }}>Нет в наличии</div>
                    )}
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', fontWeight: 700, padding: '3px 10px', borderRadius: 8, fontSize: 13, color: product.isAvailable ? '#92400e' : '#94a3b8' }}>
                      {product.price.toLocaleString()} ₸/{product.unit}
                    </div>
                  </button>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
                    <p style={{ fontWeight: 600, color: product.isAvailable ? '#0f172a' : '#94a3b8', margin: 0, cursor: 'pointer' }} onClick={() => setSelectedProduct(product)}>
                      {getLocalizedName(product.name)}
                    </p>
                    {product.description && (
                      <button onClick={() => setSelectedProduct(product)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1, marginTop: 4 }}>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{getLocalizedName(product.description)}</p>
                        <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>Подробнее →</span>
                      </button>
                    )}
                    {product.minOrder && product.minOrder > 1 && (
                      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Мин. заказ: {product.minOrder} {product.unit}</p>
                    )}

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                      {!product.isAvailable ? (
                        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '8px', borderRadius: 12 }}>Нет в наличии</div>
                      ) : quantity > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <button onClick={() => handleDelta(product.id, -step, step)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <MinusIcon style={{ width: 16, height: 16 }} />
                          </button>
                          <QuantityInput value={quantity} onChange={(q) => handleSetQuantity(product.id, q)} min={0} />
                          <button onClick={() => handleDelta(product.id, step, step)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#92400e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                            <PlusIcon style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleAddProduct(product)} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                          Добавить
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ color: '#94a3b8' }}>Ничего не найдено</p>
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {totalItems > 0 && isMobile && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: '8px 16px', zIndex: 40 }}
          >
            <button
              onClick={handleGoToCart}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 16, boxShadow: '0 4px 20px rgba(61,10,17,0.4)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCartIcon style={{ width: 20, height: 20 }} />
                <span style={{ fontWeight: 600 }}>{totalItems} шт</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{totalAmount.toLocaleString()} ₸ →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product detail modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            quantity={getItemQuantity(selectedProduct.id)}
            onAddToCart={() => { handleAddProduct(selectedProduct); }}
            onDelta={(delta) => { handleDelta(selectedProduct.id, delta, selectedProduct.minOrder || 1); }}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
