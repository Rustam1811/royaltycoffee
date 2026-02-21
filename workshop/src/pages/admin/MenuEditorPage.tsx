import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  PencilSquareIcon,
  EyeSlashIcon,
  EyeIcon,
  XMarkIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, Button, Badge, PageLoader, Input } from '@/components/ui';
import { getAllProducts, getCategories, toggleProductAvailability, addProduct, updateProduct, deleteProduct, addCategory } from '@/services';
import { WorkshopProduct, WorkshopCategory, LocalizedString } from '@/types';

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

const emptyLocalized = (): LocalizedString => ({ ru: '', kz: '', en: '' });

// ─── Modal: Создать/Редактировать продукт ───
const ProductModal: React.FC<{
  product?: WorkshopProduct | null;
  categories: WorkshopCategory[];
  onSave: (data: Omit<WorkshopProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}> = ({ product, categories, onSave, onClose }) => {
  const [name, setName] = useState<LocalizedString>(product?.name || emptyLocalized());
  const [description, setDescription] = useState<LocalizedString>(product?.description || emptyLocalized());
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [unit, setUnit] = useState<'шт' | 'кг' | 'порция'>(product?.unit || 'шт');
  const [categoryId, setCategoryId] = useState(product?.categoryId || (categories[0]?.id || ''));
  const [image, setImage] = useState(product?.image || '');
  const [minOrder, setMinOrder] = useState(product?.minOrder?.toString() || '1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.ru.trim()) { setError('Введите название (RU)'); return; }
    if (!price || Number(price) <= 0) { setError('Укажите цену'); return; }
    if (!categoryId) { setError('Выберите категорию'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name,
        description: description.ru ? description : undefined as unknown as LocalizedString,
        price: Number(price),
        unit,
        categoryId,
        image: image || undefined,
        minOrder: Number(minOrder) || 1,
        isAvailable: product?.isAvailable ?? true,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {product ? 'Редактировать продукт' : 'Новый продукт'}
            </h2>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

          <div className="space-y-4">
            <Input label="Название (RU) *" value={name.ru} onChange={e => setName({ ...name, ru: e.target.value })} placeholder="Круассан с шоколадом" />
            <Input label="Название (KZ)" value={name.kz} onChange={e => setName({ ...name, kz: e.target.value })} placeholder="" />
            <Input label="Описание (RU)" value={description.ru} onChange={e => setDescription({ ...description, ru: e.target.value })} placeholder="Свежая выпечка" />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Цена (₸) *" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="500" min="0" />
              <Input label="Мин. заказ" type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="1" min="1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Единица</label>
              <div className="flex gap-2">
                {(['шт', 'кг', 'порция'] as const).map(u => (
                  <button key={u} type="button" onClick={() => setUnit(u)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${unit === u ? 'bg-workshop-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >{u}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Категория *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-workshop-500">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{getLocalizedName(c.name)}</option>
                ))}
              </select>
            </div>

            <Input label="URL изображения" value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>Отмена</Button>
            <Button type="submit" fullWidth loading={saving}>{product ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Modal: Создать категорию ───
const CategoryModal: React.FC<{
  onSave: (data: Omit<WorkshopCategory, 'id'>) => Promise<void>;
  onClose: () => void;
  existingCount: number;
}> = ({ onSave, onClose, existingCount }) => {
  const [name, setName] = useState<LocalizedString>(emptyLocalized());
  const [icon, setIcon] = useState('📦');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.ru.trim()) { setError('Введите название'); return; }
    setSaving(true);
    try {
      await onSave({ name, icon, sortOrder: existingCount + 1, isActive: true });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Новая категория</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
          <div className="space-y-4">
            <Input label="Название (RU) *" value={name.ru} onChange={e => setName({ ...name, ru: e.target.value })} placeholder="Выпечка" />
            <Input label="Название (KZ)" value={name.kz} onChange={e => setName({ ...name, kz: e.target.value })} />
            <Input label="Иконка (emoji)" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🥐" />
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>Отмена</Button>
            <Button type="submit" fullWidth loading={saving}>Создать</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/**
 * Редактор меню цеха для админа
 */
const MenuEditorPage: React.FC = () => {
  const [products, setProducts] = useState<WorkshopProduct[]>([]);
  const [categories, setCategories] = useState<WorkshopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<WorkshopProduct | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (product: WorkshopProduct) => {
    try {
      await toggleProductAvailability(product.id, !product.isAvailable);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p));
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleSaveProduct = async (data: Omit<WorkshopProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...data } : p));
    } else {
      const id = await addProduct(data);
      setProducts(prev => [...prev, { ...data, id, createdAt: new Date(), updatedAt: new Date() } as WorkshopProduct]);
    }
  };

  const handleDeleteProduct = async (product: WorkshopProduct) => {
    if (!confirm(`Удалить «${getLocalizedName(product.name)}»?`)) return;
    try {
      await deleteProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleSaveCategory = async (data: Omit<WorkshopCategory, 'id'>) => {
    const id = await addCategory(data);
    setCategories(prev => [...prev, { ...data, id }]);
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categoryId === selectedCategory);

  if (loading) {
    return <PageLoader text="Загрузка меню..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-workshop-500 to-workshop-600 text-white px-5 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Меню цеха</h1>
            <p className="text-workshop-100 mt-1">{products.length} позиций · {categories.length} категорий</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAddCategory(true)}>
              <TagIcon className="w-4 h-4 mr-1" />
              Категория
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditingProduct(null); setShowAddProduct(true); }}>
              <PlusIcon className="w-4 h-4 mr-1" />
              Продукт
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 py-4 bg-white border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${selectedCategory === 'all' 
              ? 'bg-workshop-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Все ({products.length})
        </button>
        {categories.map(category => {
          const count = products.filter(p => p.categoryId === category.id).length;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === category.id 
                  ? 'bg-workshop-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {category.icon} {getLocalizedName(category.name)} ({count})
            </button>
          );
        })}
      </div>

      {/* Products List */}
      <div className="px-4 py-4 space-y-3">
        {filteredProducts.length === 0 && (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-slate-500 mb-4">
                {categories.length === 0
                  ? 'Сначала создайте категорию, затем добавьте продукты'
                  : 'Нет продуктов. Нажмите «Продукт» чтобы добавить'}
              </p>
              {categories.length === 0 && (
                <Button size="sm" onClick={() => setShowAddCategory(true)}>
                  <TagIcon className="w-4 h-4 mr-1" /> Создать категорию
                </Button>
              )}
            </CardBody>
          </Card>
        )}

        {filteredProducts.map((product, index) => (
          <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
            <Card className={!product.isAvailable ? 'opacity-60' : ''}>
              <CardBody className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={getLocalizedName(product.name)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🥐</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{getLocalizedName(product.name)}</h3>
                      {!product.isAvailable && <Badge variant="danger" size="sm" className="mt-1">Скрыто</Badge>}
                    </div>
                    <span className="font-bold text-workshop-600">{product.price.toLocaleString()} ₸</span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{getLocalizedName(product.description)}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleToggleAvailability(product)}
                      className={`p-2 rounded-lg ${product.isAvailable ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                      title={product.isAvailable ? 'Скрыть' : 'Показать'}>
                      {product.isAvailable ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                      className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100" title="Редактировать">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteProduct(product)}
                      className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100" title="Удалить">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddProduct && (
          <ProductModal
            product={editingProduct}
            categories={categories}
            onSave={handleSaveProduct}
            onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
          />
        )}
        {showAddCategory && (
          <CategoryModal
            onSave={handleSaveCategory}
            onClose={() => setShowAddCategory(false)}
            existingCount={categories.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuEditorPage;
