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
import { Card, CardBody, Button, WorkshopLoader } from '@/components/ui';
import { getAllProducts, getCategories, getClientByUid } from '@/services';
import { WorkshopProduct, WorkshopCategory, LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
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
        className="w-12 h-8 text-center font-semibold text-slate-900 border border-workshop-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-workshop-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-12 h-8 text-center font-semibold text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-text"
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
      className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Image — object-contain so product is never cropped */}
        <div className="relative w-full flex-shrink-0 bg-[#f5f0eb] rounded-t-3xl overflow-hidden flex items-center justify-center" style={{ height: 280 }}>
          {product.image ? (
            <img
              src={product.image}
              alt={getLocalizedName(product.name)}
              className={`w-full h-full object-contain ${!product.isAvailable ? 'grayscale opacity-70' : ''}`}
            />
          ) : (
            <div className="text-7xl text-slate-300">🥐</div>
          )}
          {!product.isAvailable && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-xl shadow">
              Нет в наличии
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/70 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {getLocalizedName(product.name)}
            </h2>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-bold text-workshop-600">
                {product.price.toLocaleString()} ₸
              </span>
              <span className="text-sm text-slate-400">/{product.unit}</span>
            </div>
          </div>

          {product.minOrder && product.minOrder > 1 && (
            <p className="text-xs text-slate-400 mb-3">Мин. заказ: {product.minOrder} {product.unit}</p>
          )}

          {/* Description */}
          {product.description && (
            <div className="mb-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {getLocalizedName(product.description)}
              </p>
            </div>
          )}

          {/* КБЖУ */}
          {hasNutrition && (
            <div className="mb-5 bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                КБЖУ · на {nutrition!.per || 'порцию'}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {nutrition!.calories != null && (
                  <div className="bg-white rounded-xl py-2.5 shadow-sm">
                    <p className="text-lg font-bold text-slate-900">{nutrition!.calories}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ккал</p>
                  </div>
                )}
                {nutrition!.protein != null && (
                  <div className="bg-white rounded-xl py-2.5 shadow-sm">
                    <p className="text-lg font-bold text-blue-600">{nutrition!.protein}г</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">белки</p>
                  </div>
                )}
                {nutrition!.fat != null && (
                  <div className="bg-white rounded-xl py-2.5 shadow-sm">
                    <p className="text-lg font-bold text-amber-500">{nutrition!.fat}г</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">жиры</p>
                  </div>
                )}
                {nutrition!.carbs != null && (
                  <div className="bg-white rounded-xl py-2.5 shadow-sm">
                    <p className="text-lg font-bold text-green-600">{nutrition!.carbs}г</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">углев.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cart controls */}
          {product.isAvailable && (
            <div>
              {quantity > 0 ? (
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2">
                  <button
                    onClick={() => onDelta(-step)}
                    className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center active:bg-slate-300"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-lg text-slate-900">{quantity} {product.unit}</span>
                  <button
                    onClick={() => onDelta(step)}
                    className="w-11 h-11 rounded-xl bg-workshop-500 text-white flex items-center justify-center active:bg-workshop-600"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Button fullWidth size="lg" onClick={onAddToCart}>
                  Добавить в заказ
                </Button>
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20">
        <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button
              onClick={() => history.goBack()}
              className="p-2 -ml-2 rounded-lg active:bg-white/10"
            >
              <ArrowLeftIcon className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-xl text-white truncate">{outletName}</h1>
              <p className="text-white/60 text-sm mt-0.5">Выберите продукцию</p>
            </div>
            {/* Cart summary */}
            {totalItems > 0 && (
              <button
                onClick={handleGoToCart}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-xl active:bg-white/25 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="font-bold">{totalAmount.toLocaleString()} ₸</span>
              </button>
            )}
          </div>
        </div>
        <div className="bg-white border-b border-slate-200">
        {/* Search */}
        <div className="px-4 pt-3 max-w-5xl mx-auto">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl border-0 focus:ring-2 focus:ring-workshop-500 outline-none"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide max-w-5xl mx-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedCategory === 'all' 
                ? 'bg-workshop-500 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Все
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === category.id 
                  ? 'bg-workshop-500 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {category.icon} {getLocalizedName(category.name)}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Products — list on mobile, grid on desktop */}
      {/* pb accounts for: navbar (64px) + cart bar (80px) + safe spacing */}
      <div className="px-4 py-4 max-w-5xl mx-auto pb-44 md:pb-24">
        <div className="space-y-3 md:hidden">
          {/* ── Mobile: compact list ── */}
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
                >
                  <Card className={!product.isAvailable ? 'opacity-60' : ''}>
                    <CardBody className="p-0 overflow-hidden">
                      <div className="flex">
                        {/* Left: tappable image block */}
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="w-24 h-24 flex-shrink-0 bg-[#f5f0eb] relative overflow-hidden focus:outline-none"
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={getLocalizedName(product.name)}
                              className={`w-full h-full object-contain ${!product.isAvailable ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🥐</div>
                          )}
                          {!product.isAvailable && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">НЕТ</span>
                            </div>
                          )}
                        </button>

                        {/* Right: info + controls */}
                        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                          {/* Name + подробнее */}
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 className={`font-semibold text-sm leading-tight ${product.isAvailable ? 'text-slate-900' : 'text-slate-400'}`}>
                                {getLocalizedName(product.name)}
                              </h3>
                            </div>
                            {product.description ? (
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="mt-0.5 text-left"
                              >
                                <p className="text-xs text-slate-500 line-clamp-1">{getLocalizedName(product.description)}</p>
                                <span className="text-xs text-workshop-500 font-medium">Подробнее →</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="mt-0.5 text-xs text-workshop-500 font-medium"
                              >
                                Подробнее →
                              </button>
                            )}
                          </div>

                          {/* Price + controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <span className={`font-bold text-sm ${product.isAvailable ? 'text-workshop-600' : 'text-slate-400'}`}>
                                {product.price.toLocaleString()} ₸
                              </span>
                              <span className="text-xs text-slate-400 ml-1">/{product.unit}</span>
                              {product.minOrder && product.minOrder > 1 && (
                                <span className="text-xs text-slate-400 ml-1">мин.{product.minOrder}</span>
                              )}
                            </div>

                            {!product.isAvailable ? (
                              <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                                Нет
                              </span>
                            ) : quantity > 0 ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelta(product.id, -step, step)}
                                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
                                >
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <QuantityInput
                                  value={quantity}
                                  onChange={(q) => handleSetQuantity(product.id, q)}
                                  min={0}
                                />
                                <button
                                  onClick={() => handleDelta(product.id, step, step)}
                                  className="w-8 h-8 rounded-full bg-workshop-500 text-white flex items-center justify-center active:bg-workshop-600"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => handleAddProduct(product)}>
                                Добавить
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Desktop: grid cards ── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => {
            const quantity = getItemQuantity(product.id);
            const step = product.minOrder || 1;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={`overflow-hidden h-full flex flex-col ${!product.isAvailable ? 'opacity-60' : ''}`}>
                  {/* Image — tappable */}
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="aspect-[4/3] bg-slate-100 relative block w-full overflow-hidden focus:outline-none"
                  >
                    {product.image ? (
                      <img src={product.image} alt={getLocalizedName(product.name)} className={`w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-slate-300">🥐</div>
                    )}
                    {!product.isAvailable && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        Нет в наличии
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 bg-white/90 backdrop-blur-sm font-bold px-3 py-1 rounded-lg text-sm shadow-sm ${product.isAvailable ? 'text-workshop-600' : 'text-slate-400'}`}>
                      {product.price.toLocaleString()} ₸/{product.unit}
                    </div>
                  </button>
                  
                  <CardBody className="flex-1 flex flex-col p-4">
                    <h3
                      className={`font-semibold cursor-pointer hover:text-workshop-600 transition-colors ${product.isAvailable ? 'text-slate-900' : 'text-slate-400'}`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      {getLocalizedName(product.name)}
                    </h3>
                    {product.description && (
                      <button onClick={() => setSelectedProduct(product)} className="text-left mt-1 flex-1">
                        <p className="text-sm text-slate-500 line-clamp-2">{getLocalizedName(product.description)}</p>
                        <span className="text-xs text-workshop-500 font-medium">Подробнее →</span>
                      </button>
                    )}
                    {product.minOrder && product.minOrder > 1 && (
                      <p className="text-xs text-slate-400 mt-1">Мин. заказ: {product.minOrder} {product.unit}</p>
                    )}
                    
                    {/* Controls */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {!product.isAvailable ? (
                        <div className="text-center text-sm font-semibold text-red-500 bg-red-50 py-2 rounded-xl">
                          Нет в наличии
                        </div>
                      ) : quantity > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelta(product.id, -step, step)}
                            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <QuantityInput
                            value={quantity}
                            onChange={(q) => handleSetQuantity(product.id, q)}
                            min={0}
                          />
                          <button
                            onClick={() => handleDelta(product.id, step, step)}
                            className="w-9 h-9 rounded-full bg-workshop-500 text-white flex items-center justify-center hover:bg-workshop-600 transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button fullWidth onClick={() => handleAddProduct(product)}>
                          Добавить
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-slate-500">Ничего не найдено</p>
          </div>
        )}
      </div>

      {/* Mobile: floating cart bar — sits ABOVE bottom navbar */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="md:hidden fixed bottom-[4.5rem] left-0 right-0 px-4 pb-2 pt-2 z-40"
          >
            <button
              onClick={handleGoToCart}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-workshop-500 text-white rounded-2xl shadow-lg shadow-workshop-500/30 active:bg-workshop-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="font-semibold">{totalItems} шт</span>
              </div>
              <span className="font-bold text-lg">{totalAmount.toLocaleString()} ₸ →</span>
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
            onAddToCart={() => {
              handleAddProduct(selectedProduct);
            }}
            onDelta={(delta) => {
              handleDelta(selectedProduct.id, delta, selectedProduct.minOrder || 1);
            }}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
