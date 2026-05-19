import React, { useEffect, useState, useContext } from "react";
import { motion } from "framer-motion";
import {
  listenCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../services/categoryService";
import { DrinkCategoryLocal, Product } from "../src/types/types";
import CategoryModal from "../components/CategoryModal";
import ProductModal from "../components/ProductModal";
import { UserContext } from "../contexts/UserContext";
import CategoryViewer from "../../src/components/CategoryViewer";
import { BottomSheetPremium } from "../../src/features/menu/premium/BottomSheetPremium";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const MenuPage: React.FC = () => {
  useTranslation(); // Keep translation context initialized
  const [cats, setCats] = useState<DrinkCategoryLocal[]>([]);
  const [editCat, setEditCat] = useState<DrinkCategoryLocal | null>(null);
  const [selCat, setSelCat] = useState<DrinkCategoryLocal | null>(null);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [showCatM, setShowCatM] = useState(false);
  const [showProdM, setShowProdM] = useState(false);
  const { user, loading } = useContext(UserContext);
  
  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('M');
  const [activeTab, setActiveTab] = useState<'milk' | 'syrup' | 'topping'>('syrup');
  const [selectedMilk, setSelectedMilk] = useState('regular');
  const [selectedSyrups, setSelectedSyrups] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  const SIZES = [
    { key: 'S', label: 'S', ml: '250 мл', multiplier: 0.9 },
    { key: 'M', label: 'M', ml: '350 мл', multiplier: 1.0 },
    { key: 'L', label: 'L', ml: '450 мл', multiplier: 1.18 },
  ];

  const MILKS = [
    { key: 'regular', name: 'Обычное', price: 0, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop' },
    { key: 'oat', name: 'Овсяное', price: 200, image: 'https://images.unsplash.com/photo-1600623560792-d0b2d4e30b91?w=100&h=100&fit=crop' },
    { key: 'almond', name: 'Миндальное', price: 250, image: 'https://images.unsplash.com/photo-1569478412303-6f566ac41a37?w=100&h=100&fit=crop' },
    { key: 'coconut', name: 'Кокосовое', price: 250, image: 'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=100&h=100&fit=crop' },
  ];

  const SYRUPS = [
    { key: 'vanilla', name: 'Ваниль', price: 200, image: 'https://images.unsplash.com/photo-1587736174440-ddbf2b6a3b4b?w=100&h=100&fit=crop' },
    { key: 'caramel', name: 'Карамель', price: 200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop' },
    { key: 'hazelnut', name: 'Фундук', price: 220, image: 'https://images.unsplash.com/photo-1633436370590-223c9e0d2afd?w=100&h=100&fit=crop' },
  ];

  const TOPPINGS = [
    { key: 'cinnamon', name: 'Корица', price: 0, image: 'https://images.unsplash.com/photo-1596040033229-a0b3b64d1673?w=100&h=100&fit=crop' },
    { key: 'cocoa', name: 'Какао', price: 0, image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=100&h=100&fit=crop' },
    { key: 'choco', name: 'Шоколад', price: 120, image: 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=100&h=100&fit=crop' },
  ];

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSize('M');
    setActiveTab('syrup');
    setSelectedMilk('regular');
    setSelectedSyrups([]);
    setSelectedToppings([]);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  const toggleSyrup = (key: string) => {
    setSelectedSyrups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleTopping = (key: string) => {
    setSelectedToppings(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const basePrice = selectedProduct.price;
    const sizeMultiplier = SIZES.find(s => s.key === size)?.multiplier || 1;
    const milkPrice = MILKS.find(m => m.key === selectedMilk)?.price || 0;
    const syrupsPrice = selectedSyrups.reduce((sum, key) => {
      const syrup = SYRUPS.find(s => s.key === key);
      return sum + (syrup?.price || 0);
    }, 0);
    const toppingsPrice = selectedToppings.reduce((sum, key) => {
      const topping = TOPPINGS.find(t => t.key === key);
      return sum + (topping?.price || 0);
    }, 0);
    
    return Math.round(basePrice * sizeMultiplier + milkPrice + syrupsPrice + toppingsPrice);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!loading && user) {
      unsubscribe = listenCategories(setCats);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loading, user]);

  const onSaveCat = async (
    data: Omit<DrinkCategoryLocal, "id">,
    id?: string
  ) => {
    if (id) await updateCategory(id, data);
    else await addCategory(data);
    setShowCatM(false);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <div className="bg-gradient-to-r from-[#1F2937] to-[#111827] p-4 shadow">
        <h1 className="text-white text-2xl font-bold">Меню (Admin)</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 overflow-y-auto max-h-[calc(100vh-100px)]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Категории</h2>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700"
            onClick={() => {
              setEditCat(null);
              setShowCatM(true);
            }}
          >
            Добавить категорию
          </button>
        </div>

        <div className="space-y-8">
          {cats.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  {c.image && (
                    <img
                      src={c.image}
                      alt={c.title.ru}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <h3 className="text-lg font-semibold">{c.title.ru}</h3>
                </div>
                <div className="space-x-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setEditCat(c);
                      setShowCatM(true);
                    }}
                  >
                    Ред.
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => deleteCategory(c.id)}
                  >
                    Удл.
                  </button>
                  <button
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() => {
                      setSelCat(c);
                      setEditProd(null);
                      setShowProdM(true);
                    }}
                  >
                    + Продукт
                  </button>
                </div>
              </div>

              <CategoryViewer 
                title={c.title.ru} 
                products={c.products}
                onSelectProduct={openProductModal}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {showCatM && (
        <CategoryModal
          initialData={editCat}
          onClose={() => setShowCatM(false)}
          onSave={onSaveCat}
        />
      )}
      {showProdM && selCat && (
        <ProductModal
          categoryId={selCat.id}
          initialData={editProd}
          onClose={() => setShowProdM(false)}
        />
      )}

      <BottomSheetPremium
        open={!!selectedProduct}
        onClose={closeProductModal}
        maxHeight="90vh"
      >
        {selectedProduct && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {/* Close button */}
                <div className="sticky top-0 z-10 px-4 pt-4 flex justify-end bg-white/80 backdrop-blur-sm rounded-t-3xl">
                  <button
                    onClick={closeProductModal}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center transition-all"
                    aria-label="Закрыть"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-900" />
                  </button>
                </div>

                <div className="px-4 pt-0 pb-4 relative">
                  {/* Hero image */}
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name.ru}
                      loading="eager"
                      className="w-[58%] max-w-[240px] drop-shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                    />
                  </div>

                  {/* Product name */}
                  <h2 className="text-[22px] font-semibold tracking-tight text-center leading-tight">
                    {selectedProduct.name.ru}
                  </h2>
                  {selectedProduct.description && (
                    <p className="text-[13px] text-gray-500 text-center mt-2">
                      {selectedProduct.description.ru}
                    </p>
                  )}

                  {/* Tabs: Молоко, Сиропы, Топпинги */}
                  <div className="mt-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-3 gap-3"
                    >
                      <button
                        onClick={() => setActiveTab('milk')}
                        className={`h-14 px-6 rounded-[20px] text-[13px] font-bold transition-all ${
                          activeTab === 'milk'
                            ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-xl'
                            : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        Молоко
                      </button>
                      <button
                        onClick={() => setActiveTab('syrup')}
                        className={`h-14 px-6 rounded-[20px] text-[13px] font-bold transition-all ${
                          activeTab === 'syrup'
                            ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-xl'
                            : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        Сиропы
                      </button>
                      <button
                        onClick={() => setActiveTab('topping')}
                        className={`h-14 px-6 rounded-[20px] text-[13px] font-bold transition-all ${
                          activeTab === 'topping'
                            ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-xl'
                            : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        Топпинги
                      </button>
                    </motion.div>

                    {/* Options display */}
                    <AnimatePresence mode="wait">
                      {activeTab && (
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 flex gap-2.5 overflow-x-auto scrollbar-hide pb-2"
                        >
                          {(activeTab === 'milk' ? MILKS : activeTab === 'syrup' ? SYRUPS : TOPPINGS).map((opt) => {
                            const isActive =
                              activeTab === 'milk'
                                ? selectedMilk === opt.key
                                : activeTab === 'syrup'
                                ? selectedSyrups.includes(opt.key)
                                : selectedToppings.includes(opt.key);

                            return (
                              <button
                                key={opt.key}
                                onClick={() => {
                                  if (activeTab === 'milk') setSelectedMilk(opt.key);
                                  else if (activeTab === 'syrup') toggleSyrup(opt.key);
                                  else toggleTopping(opt.key);
                                }}
                                className="relative flex-shrink-0 w-[110px] h-[140px] rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all"
                              >
                                <div className={`absolute inset-0 ${isActive ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`} />
                                
                                <div className="relative h-full flex flex-col justify-between p-3">
                                  {opt.image && (
                                    <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden bg-white shadow-md">
                                      <img
                                        src={opt.image}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="space-y-1">
                                    <span className={`block text-xs font-bold leading-tight line-clamp-2 ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                      {opt.name}
                                    </span>
                                    {opt.price > 0 && (
                                      <span className={`block text-[10px] font-bold ${isActive ? 'text-white' : 'text-amber-600'}`}>
                                        +{opt.price}₸
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isActive && (
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
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Fixed bottom: Size + Add button */}
        {selectedProduct && (
          <div className="shrink-0 border-t border-gray-100 px-4 py-4 bg-white rounded-b-3xl">
            <div className="flex gap-3 items-center">
              {/* Size selector */}
              <div className="flex-1 flex gap-2 bg-gray-100 rounded-[20px] p-1">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSize(s.key)}
                    className={`flex-1 h-12 rounded-[16px] text-sm font-bold transition-all ${
                      size === s.key
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'bg-transparent text-gray-600'
                    }`}
                  >
                    <div className="text-base font-bold">{s.label}</div>
                    <div className="text-[10px] opacity-70">{s.ml}</div>
                  </button>
                ))}
              </div>

              {/* Add button */}
              <button
                type="button"
                onClick={closeProductModal}
                className="flex-shrink-0 w-32 h-14 rounded-2xl bg-gradient-to-r from-black to-gray-800 text-white font-bold text-lg shadow-xl flex items-center justify-center active:scale-95 transition-transform hover:from-gray-800 hover:to-gray-700"
              >
                + {calculateTotal()} ₸
              </button>
            </div>

            {/* Price breakdown */}
            <div className="mt-2.5 text-[10px] font-medium text-gray-500 px-1 flex flex-wrap gap-x-3 gap-y-0.5 justify-center">
              <span>База: {Math.round(selectedProduct.price * (SIZES.find(s => s.key === size)?.multiplier || 1))}₸</span>
              {(MILKS.find(m => m.key === selectedMilk)?.price || 0) > 0 && (
                <span>Молоко +{MILKS.find(m => m.key === selectedMilk)?.price}₸</span>
              )}
              {selectedSyrups.length > 0 && (
                <span>Сиропы +{selectedSyrups.reduce((sum, key) => sum + (SYRUPS.find(s => s.key === key)?.price || 0), 0)}₸</span>
              )}
              {selectedToppings.length > 0 && (
                <span>Топпинги +{selectedToppings.reduce((sum, key) => sum + (TOPPINGS.find(t => t.key === key)?.price || 0), 0)}₸</span>
              )}
            </div>
          </div>
        )}
      </BottomSheetPremium>
    </div>
  );
};

export default MenuPage;
