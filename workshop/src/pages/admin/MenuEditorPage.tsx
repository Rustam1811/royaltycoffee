import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  PencilSquareIcon,
  EyeSlashIcon,
  EyeIcon,
  XMarkIcon,
  TagIcon,
  TrashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Card, CardBody, Button, Badge, WorkshopLoader, Input } from '@/components/ui';
import { getAllProducts, getCategories, toggleProductAvailability, addProduct, updateProduct, deleteProduct, addCategory, getAllClients } from '@/services';
import { WorkshopProduct, WorkshopCategory, LocalizedString, WorkshopClient, ProductNutrition } from '@/types';

// ─── WebP conversion utility ───
async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('WebP conversion failed'))),
        'image/webp',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Upload to Firebase Storage under workshop/ prefix
async function uploadWorkshopImage(file: File, name: string): Promise<string> {
  const webpBlob = await convertToWebP(file);
  const fileName = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.webp`;
  const storageRef = ref(storage, `workshop/menu/${fileName}`);
  await uploadBytes(storageRef, new File([webpBlob], fileName, { type: 'image/webp' }));
  return getDownloadURL(storageRef);
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

const emptyLocalized = (): LocalizedString => ({ ru: '', kz: '', en: '' });

// ─── Modal: Создать/Редактировать продукт ───
const PRESET_COLORS = [
  '#ffffff', '#fef3c7', '#fde68a', '#fee2e2', '#fce7f3',
  '#dbeafe', '#d1fae5', '#ede9fe', '#e0f2fe', '#f1f5f9',
];

const ProductModal: React.FC<{
  product?: WorkshopProduct | null;
  categories: WorkshopCategory[];
  allOutlets: { id: string; name: string }[];
  onSave: (data: Omit<WorkshopProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}> = ({ product, categories, allOutlets, onSave, onClose }) => {
  const [name, setName] = useState<LocalizedString>(product?.name || emptyLocalized());
  const [description, setDescription] = useState<LocalizedString>(product?.description || emptyLocalized());
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [unit, setUnit] = useState<'шт' | 'кг' | 'порция'>(product?.unit || 'шт');
  const [categoryId, setCategoryId] = useState(product?.categoryId || (categories[0]?.id || ''));
  const [image, setImage] = useState(product?.image || '');
  const [minOrder, setMinOrder] = useState(product?.minOrder?.toString() || '1');
  const [color, setColor] = useState(product?.color || '');
  const [restrictedToOutletIds, setRestrictedToOutletIds] = useState<string[]>(product?.restrictedToOutletIds || []);
  const [nutrition, setNutrition] = useState<ProductNutrition>(product?.nutrition || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.ru.trim()) { setError('Введите название (RU)'); return; }
    if (!price || Number(price) <= 0) { setError('Укажите цену'); return; }
    if (!categoryId) { setError('Выберите категорию'); return; }
    setSaving(true);
    setError('');
    try {
      let imageUrl = image;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadWorkshopImage(imageFile, name.ru);
        setUploading(false);
      }

      await onSave({
        name,
        description: description.ru ? description : undefined as unknown as LocalizedString,
        price: Number(price),
        unit,
        categoryId,
        image: imageUrl || undefined,
        minOrder: Number(minOrder) || 1,
        isAvailable: product?.isAvailable ?? true,
        color: color || undefined,
        restrictedToOutletIds: restrictedToOutletIds.length > 0 ? restrictedToOutletIds : undefined,
        nutrition: (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs)
          ? { ...nutrition, per: nutrition.per || 'порция' }
          : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
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
            {/* Image upload area */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Изображение</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video bg-[#f5f0eb] rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-workshop-400 transition-all overflow-hidden"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center py-4">
                    <PhotoIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Нажмите для загрузки</p>
                    <p className="text-xs text-slate-400 mt-1">Автоконвертация в WebP</p>
                  </div>
                )}
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); setImage(''); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  Удалить изображение
                </button>
              )}
            </div>

            <Input label="Название (RU) *" value={name.ru} onChange={e => setName({ ...name, ru: e.target.value })} placeholder="Круассан с шоколадом" />
            <Input label="Название (KZ)" value={name.kz} onChange={e => setName({ ...name, kz: e.target.value })} placeholder="" />
            <Input label="Описание (RU)" value={description.ru} onChange={e => setDescription({ ...description, ru: e.target.value })} placeholder="Свежая выпечка" />

            {/* КБЖУ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                КБЖУ
                <span className="text-xs text-slate-400 font-normal ml-1">(необязательно)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Ккал" type="number" placeholder="240"
                  value={nutrition.calories?.toString() || ''}
                  onChange={e => setNutrition(n => ({ ...n, calories: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input label="Белки (г)" type="number" placeholder="8"
                  value={nutrition.protein?.toString() || ''}
                  onChange={e => setNutrition(n => ({ ...n, protein: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input label="Жиры (г)" type="number" placeholder="12"
                  value={nutrition.fat?.toString() || ''}
                  onChange={e => setNutrition(n => ({ ...n, fat: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input label="Углеводы (г)" type="number" placeholder="30"
                  value={nutrition.carbs?.toString() || ''}
                  onChange={e => setNutrition(n => ({ ...n, carbs: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <div className="flex gap-2 mt-2">
                {(['порция', '100г'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setNutrition(n => ({ ...n, per: p }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      (nutrition.per || 'порция') === p
                        ? 'bg-workshop-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    на {p}
                  </button>
                ))}
              </div>
            </div>

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

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Цвет строки в матрице</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c === '#ffffff' ? '' : c)}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${
                      (c === '#ffffff' ? !color : color === c)
                        ? 'border-workshop-500 scale-110'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={color || '#ffffff'}
                  onChange={e => setColor(e.target.value === '#ffffff' ? '' : e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer"
                  title="Свой цвет"
                />
                {color && (
                  <button type="button" onClick={() => setColor('')} className="text-xs text-slate-400 hover:text-red-500">
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            {/* Restricted outlets */}
            {allOutlets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Только для точек{' '}
                  <span className="text-xs text-slate-400 font-normal">(оставьте пустым — доступно всем)</span>
                </label>
                <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                  {allOutlets.map(outlet => (
                    <label key={outlet.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                      <input
                        type="checkbox"
                        checked={restrictedToOutletIds.includes(outlet.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setRestrictedToOutletIds(prev => [...prev, outlet.id]);
                          } else {
                            setRestrictedToOutletIds(prev => prev.filter(id => id !== outlet.id));
                          }
                        }}
                        className="rounded border-slate-300 text-workshop-500 focus:ring-workshop-500"
                      />
                      <span className="text-sm text-slate-700">{outlet.name}</span>
                    </label>
                  ))}
                </div>
                {restrictedToOutletIds.length > 0 && (
                  <p className="text-xs text-workshop-600 mt-1">
                    Выбрано {restrictedToOutletIds.length} точек
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>Отмена</Button>
            <Button type="submit" fullWidth loading={saving || uploading}>
              {uploading ? 'Загрузка фото...' : saving ? 'Сохранение...' : product ? 'Сохранить' : 'Создать'}
            </Button>
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
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
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
  const [allOutlets, setAllOutlets] = useState<{ id: string; name: string }[]>([]);
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
      const [productsData, categoriesData, clientsData] = await Promise.all([
        getAllProducts(),
        getCategories(),
        getAllClients(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      // Flatten all outlets from all clients for restriction picker
      const outlets: { id: string; name: string }[] = [];
      const seen = new Set<string>();
      clientsData.forEach((c: WorkshopClient) => {
        c.outlets?.forEach(o => {
          if (!seen.has(o.id)) {
            seen.add(o.id);
            outlets.push({ id: o.id, name: `${o.name} (${c.companyName})` });
          }
        });
      });
      setAllOutlets(outlets.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
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
    return <WorkshopLoader text="Загрузка меню..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Меню цеха</h1>
            <p className="text-white/60 text-sm mt-0.5">{products.length} позиций · {categories.length} категорий</p>
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
            allOutlets={allOutlets}
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
