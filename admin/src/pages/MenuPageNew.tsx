import React, { useEffect, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listenCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "@/services/categoryService";
import { DrinkCategoryLocal, Product } from "@/types/types";
import CategoryModal from "@/components/CategoryModalNew";
import ProductModal from "@/components/ProductModalNew";
import { UserContext } from "@/contexts/UserContext";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  Squares2X2Icon,
  SparklesIcon
} from "@heroicons/react/24/outline";

const MenuPage: React.FC = () => {
  const [cats, setCats] = useState<DrinkCategoryLocal[]>([]);
  const [editCat, setEditCat] = useState<DrinkCategoryLocal | null>(null);
  const [selCat, setSelCat] = useState<DrinkCategoryLocal | null>(null);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [showCatM, setShowCatM] = useState(false);
  const [showProdM, setShowProdM] = useState(false);
  const { user, loading } = useContext(UserContext);

  // Навигация по категориям для мобильных
  const [catIdx, setCatIdx] = useState(0);
  useEffect(() => {
    if (cats.length > 0 && catIdx >= cats.length) setCatIdx(cats.length - 1);
  }, [cats, catIdx]);

  useEffect(() => {
    if (!loading) {
      const unsub = listenCategories(setCats);
      return () => unsub();
    }
  }, [loading]);

  const onSaveCat = async (
    data: Omit<DrinkCategoryLocal, "id">,
    id?: string
  ) => {
    if (id) await updateCategory(id, data);
    else await addCategory(data);
    setShowCatM(false);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center">
      <div className="bg-[var(--color-bg-elevated)]/80 backdrop-blur-lg rounded-[var(--radius-xl)] p-8 shadow-[var(--shadow-lg)] border border-[var(--color-border)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-amber)] border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-[var(--color-text-secondary)] text-center">Загрузка админки...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 -mx-6 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]/80 backdrop-blur-md shadow-card"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-[var(--radius-lg)] flex items-center justify-center">
                <Squares2X2Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-[var(--font-family-heading)]">Меню Админ</h1>
                <p className="text-sm text-white/80">Управление категориями и напитками</p>
              </div>
            </div>
            <motion.button
              onClick={() => {
                setEditCat(null);
                setShowCatM(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-white/90 text-[var(--color-accent-orange)] shadow-card hover:bg-white transition"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <PlusIcon className="w-5 h-5" />
              Новая категория
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {cats.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-[var(--color-accent-orange)]/10 rounded-[var(--radius-xl)] flex items-center justify-center mx-auto mb-6">
              <SparklesIcon className="w-12 h-12 text-[var(--color-accent-orange)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">Создайте первую категорию</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Начните добавлять напитки в ваше меню</p>
            <button
              onClick={() => {
                setEditCat(null);
                setShowCatM(true);
              }}
              className="bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white px-8 py-3 rounded-[var(--radius-lg)] font-semibold hover:scale-105 transition-transform shadow-card"
            >
              Создать категорию
            </button>
          </motion.div>
        ) : (
          <>
            {/* Навигационные кнопки для категорий на мобильных */}
            <div className="flex items-center gap-2 mb-4 md:hidden">
              <button
                className="px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
                disabled={catIdx === 0}
                onClick={() => setCatIdx(idx => Math.max(0, idx - 1))}
              >←</button>
              <span className="font-bold text-lg text-[var(--color-accent-orange)]">{cats[catIdx]?.title?.ru || ''}</span>
              <button
                className="px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
                disabled={catIdx === cats.length - 1}
                onClick={() => setCatIdx(idx => Math.min(cats.length - 1, idx + 1))}
              >→</button>
            </div>
            {/* Сетка категорий */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(window.innerWidth < 768 && cats[catIdx] ? [cats[catIdx]] : cats).map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="bg-[var(--color-bg-elevated)] rounded-2xl shadow-card border border-[var(--color-border)] overflow-hidden hover:shadow-[var(--shadow-xl)] transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Category Header */}
                  <div className="relative h-32 bg-gradient-to-br from-[var(--color-accent-orange)]/20 to-[var(--color-accent-pink)]/10">
                    {category.image && (
                      <img
                        src={category.image}
                        alt={category.title.ru}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => {
                          setEditCat(category);
                          setShowCatM(true);
                        }}
                        className="w-8 h-8 bg-[var(--color-bg-elevated)]/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] transition-colors shadow-card border border-[var(--color-border)]"
                      >
                        <PencilIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="w-8 h-8 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-card"
                      >
                        <TrashIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{category.title.ru}</h3>
                    <p className="text-[var(--color-text-secondary)] mb-4 line-clamp-2">{'Описание отсутствует'}</p>
                    {/* Products Count */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {category.products?.length || 0} напитков
                      </span>
                      <button
                        onClick={() => setSelCat(category)}
                        className="text-[var(--color-accent-orange)] hover:text-[var(--color-accent-pink)] text-sm font-medium flex items-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Просмотр
                      </button>
                    </div>
                    {/* Add Product Button */}
                    <button
                      onClick={() => {
                        setSelCat(category);
                        setEditProd(null);
                        setShowProdM(true);
                      }}
                      className="w-full bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white py-3 rounded-[var(--radius-lg)] font-semibold hover:shadow-[var(--shadow-md)] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Добавить напиток
                    </button>
                  </div>
                  {/* Products Preview */}
                  {category.products && category.products.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-2 gap-3">
                        {category.products.slice(0, 4).map((product) => (
                          <div
                            key={product.id}
                            className="bg-[var(--color-bg-hover)] rounded-2xl p-3 hover:bg-[color-mix(in_oklab,var(--color-bg-hover)_80%,white)] transition-colors cursor-pointer"
                            onClick={() => {
                              setEditProd(product);
                              setSelCat(category);
                              setShowProdM(true);
                            }}
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-accent-orange)]/15 to-[var(--color-accent-pink)]/15 rounded-xl mb-2 flex items-center justify-center overflow-hidden">
                              {product.image ? (
                                <img src={product.image} alt={product.name.ru} className="w-12 h-12 object-cover" />
                              ) : (
                                <span className="text-lg">☕</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{product.name.ru}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{product.price} ₸</p>
                          </div>
                        ))}
                      </div>
                      {category.products.length > 4 && (
                        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-3">
                          +{category.products.length - 4} ещё
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Modals */}
      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
