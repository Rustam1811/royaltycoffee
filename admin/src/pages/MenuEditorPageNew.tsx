/**
 * MenuEditorPage - Управление меню из menuCategories и menuItems
 * Синхронизировано с клиентом
 */

import React, { useEffect, useState, useContext, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  MenuService,
  MenuCategory,
  MenuItem,
  MenuModifier,
} from "@/services/menuService";
import { UserContext } from "@/contexts/UserContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  Squares2X2Icon,
  SparklesIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

// ============ WebP conversion utility ============

async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("WebP conversion failed"))),
        "image/webp",
        quality,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

// Available local drink images in public/drinks/
const LOCAL_DRINK_IMAGES = [
  'americano.webp', 'bamble.webp', 'cappuccino.webp', 'caramelatte.webp',
  'chai-tea.webp', 'cocoa.webp', 'flat-white.webp', 'glintveyn-coffee.webp',
  'hot-chocolate.webp', 'ice-americano.webp', 'ice-latte.webp', 'ice-matcha.webp',
  'ice-raf.webp', 'latte.webp', 'lemonade-kiwi-mint.webp', 'lemonade-mango-passion.webp',
  'lemonade-mango-strawberry.webp', 'lemonade-peach-grapefruit.webp',
  'lemonade-raspberry-lychee.webp', 'masala-coffee.webp', 'matcha-latte.webp',
  'milk-duet.webp', 'mokkachino.webp', 'raf-arahis.webp', 'raf-coffee.webp',
  'raf-lavanda.webp', 'raf-medovik.webp', 'raf-melon-cactus.webp', 'raf-pistachio.webp',
  'extra-01.webp', 'extra-02.webp', 'extra-03.webp', 'extra-04.webp',
  'extra-05.webp', 'extra-06.webp', 'extra-07.webp', 'extra-08.webp',
  'extra-09.webp', 'extra-10.webp', 'extra-11.webp', 'extra-12.webp', 'extra-13.webp',
];

// Available local food images in public/eats/
const LOCAL_FOOD_IMAGES = Array.from({ length: 43 }, (_, i) => `eat-${String(i + 1).padStart(2, '0')}.webp`);

// All local images combined for the picker
const ALL_LOCAL_IMAGES = [
  ...LOCAL_DRINK_IMAGES.map(f => ({ folder: 'drinks', file: f })),
  ...LOCAL_FOOD_IMAGES.map(f => ({ folder: 'eats', file: f })),
];

/**
 * Resolve image path for display. Local images like /drinks/xxx.webp
 * need a prefix when admin runs on a different port/base.
 */
function resolveImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  // If it's already an absolute URL (Firebase Storage etc), return as-is
  if (imagePath.startsWith('http')) return imagePath;
  // Local path like /drinks/xxx.webp — in prod it works as-is,
  // in dev admin runs on :5174 but main app static is on :5173
  return imagePath;
}

async function uploadMenuImage(file: File, itemName: string): Promise<string> {
  const webpBlob = await convertToWebP(file);
  const safeName = itemName
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const fileName = `menu/${safeName}-${Date.now()}.webp`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
  return getDownloadURL(storageRef);
}

// ============ Модалка для категории ============

interface CategoryModalProps {
  category: MenuCategory | null;
  onClose: () => void;
  onSave: (data: Omit<MenuCategory, "id">, id?: string) => Promise<void>;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: category?.name || "",
    nameEn: category?.nameEn || "",
    nameKz: category?.nameKz || "",
    icon: category?.icon || "☕",
    order: category?.order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, category?.id);
      onClose();
    } catch (err) {
      console.error("Error saving category:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">
          {category ? "Редактировать категорию" : "Новая категория"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название (RU) *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название (EN)
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название (KZ)
              </label>
              <input
                type="text"
                value={form.nameKz}
                onChange={(e) => setForm({ ...form, nameKz: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Иконка (эмодзи)
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Порядок
              </label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============ Модалка для позиции меню ============

interface ItemModalProps {
  item: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSave: (data: Omit<MenuItem, "id">, id?: string) => Promise<void>;
}

const DEFAULT_SIZES: { key: string; label: string; volume: number; price: number }[] = [
  { key: "M", label: "M", volume: 350, price: 0 },
  { key: "L", label: "L", volume: 450, price: 0 },
];

// Пресеты модификаторов для быстрого добавления
const MODIFIER_PRESETS: { label: string; icon: string; mod: MenuModifier }[] = [
  { label: 'Молоко', icon: '🥛', mod: { id: 0, title: 'Молоко', type: 'select', options: ['Обычное', 'Овсяное', 'Кокосовое', 'Безлактозное'], default: 'Обычное' } },
  { label: 'Сироп', icon: '🍯', mod: { id: 0, title: 'Сироп', type: 'multi', options: ['Ваниль', 'Карамель', 'Лесной орех', 'Кокос'], default: [] } },
  { label: 'Лёд', icon: '🧊', mod: { id: 0, title: 'Лёд', type: 'select', options: ['Без льда', 'Мало', 'Средне', 'Много'], default: 'Средне' } },
  { label: 'Сахар', icon: '🍬', mod: { id: 0, title: 'Сахар', type: 'toggle', default: false } },
  { label: 'Сладость', icon: '🎚️', mod: { id: 0, title: 'Сладость', type: 'slider', min: 0, max: 3, default: 1 } },
  { label: 'Размер', icon: '📐', mod: { id: 0, title: 'Размер', type: 'select', options: ['0.3', '0.4', '0.5'], default: '0.3' } },
  { label: 'Мята', icon: '🌿', mod: { id: 0, title: 'Мята', type: 'toggle', default: false } },
  { label: 'Маршмеллоу', icon: '☁️', mod: { id: 0, title: 'Маршмеллоу', type: 'toggle', default: false } },
];

const MOD_TYPE_LABELS: Record<string, string> = {
  select: '▾ Выбор одного',
  multi: '☑ Множественный',
  toggle: '⇄ Вкл/Выкл',
  slider: '⟿ Ползунок',
};

const ItemModal: React.FC<ItemModalProps> = ({ item, categories, onClose, onSave }) => {
  const [form, setForm] = useState({
    categoryId: item?.categoryId || categories[0]?.id || "",
    name: item?.name || "",
    nameEn: item?.nameEn || "",
    nameKz: item?.nameKz || "",
    description: item?.description || "",
    descriptionEn: item?.descriptionEn || "",
    descriptionKz: item?.descriptionKz || "",
    price: item?.price || 0,
    image: item?.image || "",
    energy: item?.energy || 0,
    protein: item?.protein || 0,
    fat: item?.fat || 0,
    carbs: item?.carbs || 0,
    isAvailable: item?.isAvailable ?? true,
    isPopular: item?.isPopular ?? false,
    isNew: item?.isNew ?? false,
    weight: item?.weight || "",
    badges: item?.badges || [],
    sizes: (item?.sizes && item.sizes.length > 0)
      ? item.sizes.map(s => ({ ...s }))
      : DEFAULT_SIZES.map(s => ({ ...s })),
    modifiers: (item?.modifiers && item.modifiers.length > 0)
      ? item.modifiers.map(m => ({ ...m, options: m.options ? [...m.options] : undefined }))
      : [] as MenuModifier[],
  });
  const [sizesEnabled, setSizesEnabled] = useState(
    !!(item?.sizes && item.sizes.length > 0)
  );
  const [modifiersEnabled, setModifiersEnabled] = useState(
    !!(item?.modifiers && item.modifiers.length > 0)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadProgress("Конвертация в WebP…");
    try {
      const url = await uploadMenuImage(file, form.name || "item");
      setForm((prev) => ({ ...prev, image: url }));
      setUploadProgress(null);
    } catch {
      setUploadProgress("Ошибка загрузки");
      setTimeout(() => setUploadProgress(null), 2000);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { sizes: formSizes, modifiers: formModifiers, ...rest } = form;

      // Clean modifiers: strip empty titles, strip empty options, re-index IDs
      const cleanedModifiers = modifiersEnabled
        ? formModifiers
            .filter(m => m.title.trim())
            .map((m, i) => ({
              ...m,
              id: i + 1,
              options: (m.type === 'select' || m.type === 'multi')
                ? (m.options || []).filter(o => o.trim())
                : undefined,
              // Reset default to first option if current default is invalid
              default: m.type === 'select'
                ? ((m.options || []).includes(m.default as string) ? m.default : (m.options || [''])[0])
                : m.default,
            }))
            .filter(m => {
              if (m.type === 'select' || m.type === 'multi') return (m.options || []).length > 0;
              return true;
            })
        : [];

      const dataToSave: Omit<MenuItem, "id"> = {
        ...rest,
        sizes: sizesEnabled ? formSizes.filter(s => s.price > 0) : [],
        modifiers: cleanedModifiers,
        badges: [
          ...(rest.isPopular ? ['HIT'] : []),
          ...(rest.isNew ? ['NEW'] : []),
        ],
      };
      await onSave(dataToSave, item?.id);
      onClose();
    } catch (err) {
      console.error("Error saving item:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 shrink-0">
          {item ? "Редактировать позицию" : "Новая позиция"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория *
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              {categories.filter(c => c.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название (RU) *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название (EN)
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название (KZ)
              </label>
              <input
                type="text"
                value={form.nameKz}
                onChange={(e) => setForm({ ...form, nameKz: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (RU)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (EN)
              </label>
              <textarea
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (KZ)
              </label>
              <textarea
                value={form.descriptionKz}
                onChange={(e) => setForm({ ...form, descriptionKz: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена (₸) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ккал
              </label>
              <input
                type="number"
                value={form.energy}
                onChange={(e) => setForm({ ...form, energy: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Белки (г)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Жиры (г)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.fat}
                onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Углеводы (г)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вес (напр. 85г)
              </label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="85г"
              />
            </div>
          </div>

          {/* Размеры M / L */}
          <div className="border rounded-xl p-4 space-y-3 bg-gray-50/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sizesEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSizesEnabled(checked);
                  if (checked && form.sizes.every(s => s.price === 0)) {
                    // Предзаполняем базовой ценой
                    setForm(f => ({
                      ...f,
                      sizes: f.sizes.map(s => ({ ...s, price: s.price || f.price })),
                    }));
                  }
                }}
                className="w-5 h-5 rounded text-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Размеры (M / L)</span>
            </label>

            {sizesEnabled && (
              <div className="space-y-2">
                {form.sizes.map((sz, idx) => (
                  <div key={sz.key} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border text-sm font-bold text-orange-600">
                      {sz.label}
                    </span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={sz.volume}
                        onChange={(e) => {
                          const updated = [...form.sizes];
                          updated[idx] = { ...updated[idx], volume: Number(e.target.value) };
                          setForm(f => ({ ...f, sizes: updated }));
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="мл"
                        min={0}
                      />
                      <span className="text-[10px] text-gray-400">мл</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={sz.price}
                        onChange={(e) => {
                          const updated = [...form.sizes];
                          updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                          setForm(f => ({ ...f, sizes: updated }));
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="₸"
                        min={0}
                      />
                      <span className="text-[10px] text-gray-400">₸</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          sizes: f.sizes.filter((_, i) => i !== idx),
                        }));
                      }}
                      className="text-red-400 hover:text-red-600 text-xs"
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const nextKey = form.sizes.length === 0 ? "M" : form.sizes.length === 1 ? "L" : `S${form.sizes.length + 1}`;
                    setForm(f => ({
                      ...f,
                      sizes: [...f.sizes, { key: nextKey, label: nextKey, volume: 0, price: f.price }],
                    }));
                  }}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  + Добавить размер
                </button>
              </div>
            )}
          </div>

          {/* ══════ Модификаторы (premium editor) ══════ */}
          <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-purple-50/50 to-orange-50/30 border-purple-200/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modifiersEnabled}
                onChange={(e) => setModifiersEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-purple-500"
              />
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                ⚙️ Модификаторы
                {modifiersEnabled && form.modifiers.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                    {form.modifiers.length}
                  </span>
                )}
              </span>
            </label>
            <p className="text-[11px] text-gray-400 -mt-1 ml-7">
              Молоко, сиропы, лёд, сахар — всё, что клиент может настроить
            </p>

            {modifiersEnabled && (
              <div className="space-y-3">
                {/* Быстрые пресеты */}
                {MODIFIER_PRESETS.filter(p => !form.modifiers.some(m => m.title === p.mod.title)).length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Быстрое добавление</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {MODIFIER_PRESETS
                        .filter(p => !form.modifiers.some(m => m.title === p.mod.title))
                        .map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              setForm(f => ({
                                ...f,
                                modifiers: [
                                  ...f.modifiers,
                                  { ...p.mod, id: f.modifiers.length + 1, options: p.mod.options ? [...p.mod.options] : undefined },
                                ],
                              }));
                            }}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition font-medium flex items-center gap-1 shadow-sm"
                          >
                            <span>{p.icon}</span> {p.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Список модификаторов с drag-and-drop */}
                <Reorder.Group
                  axis="y"
                  values={form.modifiers}
                  onReorder={(newOrder) => setForm(f => ({ ...f, modifiers: newOrder }))}
                  className="space-y-2"
                >
                  {form.modifiers.map((mod, idx) => {
                    const hasError = !mod.title.trim() || ((mod.type === 'select' || mod.type === 'multi') && (!mod.options || mod.options.length === 0 || mod.options.every(o => !o.trim())));
                    return (
                      <Reorder.Item
                        key={`mod-${mod.title}-${idx}`}
                        value={mod}
                        className={`bg-white rounded-xl border p-3 space-y-2 relative ${
                          hasError ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'
                        }`}
                      >
                        {/* ── Заголовок: drag handle + name + type + actions ── */}
                        <div className="flex items-center gap-2">
                          <Bars3Icon className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
                          <input
                            type="text"
                            value={mod.title}
                            onChange={(e) => {
                              const updated = [...form.modifiers];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setForm(f => ({ ...f, modifiers: updated }));
                            }}
                            className={`flex-1 px-3 py-1.5 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                              !mod.title.trim() ? 'border-red-300 bg-red-50/50' : ''
                            }`}
                            placeholder="Название модификатора *"
                          />
                          <select
                            value={mod.type}
                            onChange={(e) => {
                              const newType = e.target.value as MenuModifier['type'];
                              const updated = [...form.modifiers];
                              updated[idx] = {
                                ...updated[idx],
                                type: newType,
                                options: (newType === 'select' || newType === 'multi') ? (updated[idx].options?.length ? updated[idx].options : ['']) : undefined,
                                default: newType === 'toggle' ? false : newType === 'slider' ? 0 : newType === 'multi' ? [] : '',
                                min: newType === 'slider' ? 0 : undefined,
                                max: newType === 'slider' ? 3 : undefined,
                              };
                              setForm(f => ({ ...f, modifiers: updated }));
                            }}
                            className="px-2 py-1.5 border rounded-lg text-[11px] bg-purple-50 text-purple-700 font-medium focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            {Object.entries(MOD_TYPE_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const dup = { ...mod, id: form.modifiers.length + 1, title: `${mod.title} (копия)`, options: mod.options ? [...mod.options] : undefined };
                              setForm(f => ({ ...f, modifiers: [...f.modifiers, dup] }));
                            }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition"
                            title="Дублировать"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, modifiers: f.modifiers.filter((_, i) => i !== idx) }));
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                            title="Удалить"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        {/* ── Validation error ── */}
                        {hasError && (
                          <p className="text-[10px] text-red-500 font-medium pl-6">
                            {!mod.title.trim() ? '⚠ Укажите название' : '⚠ Добавьте хотя бы один непустой вариант'}
                          </p>
                        )}

                        {/* ── Опции для select / multi ── */}
                        {(mod.type === 'select' || mod.type === 'multi') && (
                          <div className="space-y-1.5 pl-6 border-l-2 border-purple-200">
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                              {mod.type === 'select' ? '▾ Варианты (один из)' : '☑ Варианты (можно несколько)'}
                            </span>
                            {(mod.options || []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-[10px] flex items-center justify-center font-bold shrink-0">
                                  {optIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...form.modifiers];
                                    const opts = [...(updated[idx].options || [])];
                                    opts[optIdx] = e.target.value;
                                    updated[idx] = { ...updated[idx], options: opts };
                                    setForm(f => ({ ...f, modifiers: updated }));
                                  }}
                                  className={`flex-1 px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                    !opt.trim() ? 'border-red-300 bg-red-50/50' : ''
                                  }`}
                                  placeholder={`Вариант ${optIdx + 1}`}
                                />
                                {/* Default setter for select */}
                                {mod.type === 'select' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...form.modifiers];
                                      updated[idx] = { ...updated[idx], default: opt };
                                      setForm(f => ({ ...f, modifiers: updated }));
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition whitespace-nowrap ${
                                      mod.default === opt
                                        ? 'bg-purple-500 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600'
                                    }`}
                                  >
                                    {mod.default === opt ? '★ default' : 'default'}
                                  </button>
                                )}
                                {/* Default setter for multi */}
                                {mod.type === 'multi' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...form.modifiers];
                                      const curDefaults = Array.isArray(updated[idx].default) ? [...(updated[idx].default as string[])] : [];
                                      if (curDefaults.includes(opt)) {
                                        updated[idx] = { ...updated[idx], default: curDefaults.filter(d => d !== opt) };
                                      } else {
                                        updated[idx] = { ...updated[idx], default: [...curDefaults, opt] };
                                      }
                                      setForm(f => ({ ...f, modifiers: updated }));
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition whitespace-nowrap ${
                                      Array.isArray(mod.default) && (mod.default as string[]).includes(opt)
                                        ? 'bg-purple-500 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600'
                                    }`}
                                  >
                                    {Array.isArray(mod.default) && (mod.default as string[]).includes(opt) ? '✓ выбран' : 'default'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...form.modifiers];
                                    const opts = [...(updated[idx].options || [])];
                                    opts.splice(optIdx, 1);
                                    updated[idx] = { ...updated[idx], options: opts };
                                    setForm(f => ({ ...f, modifiers: updated }));
                                  }}
                                  className="text-red-400 hover:text-red-600 text-xs shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.modifiers];
                                const opts = [...(updated[idx].options || []), ''];
                                updated[idx] = { ...updated[idx], options: opts };
                                setForm(f => ({ ...f, modifiers: updated }));
                              }}
                              className="text-[11px] text-purple-600 hover:text-purple-800 font-medium"
                            >
                              + Добавить вариант
                            </button>
                          </div>
                        )}

                        {/* ── Toggle default ── */}
                        {mod.type === 'toggle' && (
                          <div className="flex items-center gap-3 pl-6">
                            <span className="text-xs text-gray-500">По умолчанию:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.modifiers];
                                updated[idx] = { ...updated[idx], default: !mod.default };
                                setForm(f => ({ ...f, modifiers: updated }));
                              }}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                mod.default ? 'bg-purple-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                                mod.default ? 'translate-x-[22px]' : 'translate-x-0.5'
                              }`} />
                            </button>
                            <span className={`text-xs font-medium ${mod.default ? 'text-purple-600' : 'text-gray-400'}`}>
                              {mod.default ? 'Включено' : 'Выключено'}
                            </span>
                          </div>
                        )}

                        {/* ── Slider min/max/default ── */}
                        {mod.type === 'slider' && (
                          <div className="pl-6 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-medium">Min:</span>
                                <input
                                  type="number"
                                  value={mod.min ?? 0}
                                  onChange={(e) => {
                                    const updated = [...form.modifiers];
                                    updated[idx] = { ...updated[idx], min: Number(e.target.value) };
                                    setForm(f => ({ ...f, modifiers: updated }));
                                  }}
                                  className="w-14 px-2 py-1 border rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-medium">Max:</span>
                                <input
                                  type="number"
                                  value={mod.max ?? 3}
                                  onChange={(e) => {
                                    const updated = [...form.modifiers];
                                    updated[idx] = { ...updated[idx], max: Number(e.target.value) };
                                    setForm(f => ({ ...f, modifiers: updated }));
                                  }}
                                  className="w-14 px-2 py-1 border rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-medium">Default:</span>
                                <input
                                  type="number"
                                  value={typeof mod.default === 'number' ? mod.default : 0}
                                  onChange={(e) => {
                                    const updated = [...form.modifiers];
                                    updated[idx] = { ...updated[idx], default: Number(e.target.value) };
                                    setForm(f => ({ ...f, modifiers: updated }));
                                  }}
                                  className="w-14 px-2 py-1 border rounded-lg text-xs text-center focus:ring-2 focus:ring-purple-500"
                                  min={mod.min ?? 0}
                                  max={mod.max ?? 10}
                                />
                              </div>
                            </div>
                            {/* Visual preview */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">Превью:</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${((typeof mod.default === 'number' ? mod.default : 0) / (mod.max || 3)) * 100}%` }} />
                              </div>
                              <span className="text-xs text-purple-600 font-bold w-6 text-center">{typeof mod.default === 'number' ? mod.default : 0}</span>
                            </div>
                          </div>
                        )}

                        {/* ── Client preview ── */}
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                          <span className="text-[9px] uppercase tracking-wider text-gray-300 font-semibold">Как видит клиент</span>
                          <div className="mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-900/5">
                            <span className="text-xs">
                              {mod.type === 'select' && '▾'}
                              {mod.type === 'multi' && '☑'}
                              {mod.type === 'toggle' && '⇄'}
                              {mod.type === 'slider' && '⟿'}
                            </span>
                            <span className="text-xs text-gray-600 font-medium">{mod.title || '???'}</span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {mod.type === 'select' && `${(mod.options || []).filter(o => o.trim()).length} вариантов`}
                              {mod.type === 'multi' && `${(mod.options || []).filter(o => o.trim()).length} опций`}
                              {mod.type === 'toggle' && (mod.default ? 'вкл' : 'выкл')}
                              {mod.type === 'slider' && `${mod.min ?? 0}–${mod.max ?? 3}`}
                            </span>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {/* Кнопка "добавить пустой" */}
                <button
                  type="button"
                  onClick={() => {
                    setForm(f => ({
                      ...f,
                      modifiers: [
                        ...f.modifiers,
                        { id: f.modifiers.length + 1, title: '', type: 'select', options: [''], default: '' },
                      ],
                    }));
                  }}
                  className="w-full text-xs text-purple-600 hover:text-purple-800 font-medium py-2.5 border border-dashed border-purple-300 rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  Добавить модификатор вручную
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Изображение
            </label>

            {/* Current image preview */}
            {form.image && (
              <div className="mb-3 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <img
                  src={resolveImageUrl(form.image)}
                  alt="Preview"
                  className="w-16 h-16 rounded-lg object-cover bg-white"
                  onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-green-700 font-medium block truncate">✓ {form.image.split('/').pop()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image: "" }))}
                  className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Toggle: pick from existing or upload */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className={`flex-1 text-xs px-3 py-2 rounded-lg border transition font-medium ${
                  showImagePicker
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                }`}
              >
                📂 Выбрать из галереи
              </button>
              <button
                type="button"
                onClick={() => setShowImagePicker(false)}
                className={`flex-1 text-xs px-3 py-2 rounded-lg border transition font-medium ${
                  !showImagePicker
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                }`}
              >
                ⬆️ Загрузить новую
              </button>
            </div>

            {showImagePicker ? (
              /* Local image gallery with tabs */
              <div className="border rounded-xl p-2 bg-gray-50">
                {/* Filter tabs */}
                <div className="flex gap-1 mb-2">
                  {[
                    { key: 'all', label: 'Все', count: ALL_LOCAL_IMAGES.length },
                    { key: 'drinks', label: '☕ Напитки', count: LOCAL_DRINK_IMAGES.length },
                    { key: 'eats', label: '🥐 Еда', count: LOCAL_FOOD_IMAGES.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setGalleryFilter(tab.key)}
                      className={`text-[10px] px-2 py-1 rounded-md font-medium transition ${
                        galleryFilter === tab.key
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {ALL_LOCAL_IMAGES
                    .filter((img) => galleryFilter === 'all' || img.folder === galleryFilter)
                    .map((img) => {
                      const path = `/${img.folder}/${img.file}`;
                      const isSelected = form.image === path;
                      return (
                        <button
                          key={path}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, image: path }))}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                            isSelected
                              ? "border-orange-500 ring-2 ring-orange-300 scale-105"
                              : "border-transparent hover:border-orange-300"
                          }`}
                        >
                          <img
                            src={resolveImageUrl(path)}
                            alt={img.file}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                              <span className="text-white text-lg font-bold drop-shadow">✓</span>
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">
                            {img.file.replace('.webp', '')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Drop zone for upload */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all min-h-[120px] ${
                  dragOver
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-orange-600 font-medium">{uploadProgress || "Загрузка…"}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Перетащите или нажмите для загрузки
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Любой формат → авто-конвертация в WebP → Firebase Storage
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="w-5 h-5 rounded text-orange-500"
              />
              <span className="text-sm">Доступно</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                className="w-5 h-5 rounded text-orange-500"
              />
              <span className="text-sm">🔥 Популярное</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                className="w-5 h-5 rounded text-orange-500"
              />
              <span className="text-sm">✨ Новинка</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============ Основная страница ============

const MenuEditorPage: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Модалки
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState<MenuCategory | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  
  const { user, loading: authLoading } = useContext(UserContext);

  useEffect(() => {
    if (authLoading) return;
    
    const unsubCats = MenuService.listenCategories(setCategories);
    const unsubItems = MenuService.listenItems(setItems);
    setLoading(false);
    
    return () => {
      unsubCats();
      unsubItems();
    };
  }, [authLoading]);

  // Поиск
  const searchLower = search.trim().toLowerCase();
  const filteredItems = searchLower
    ? items.filter(item => item.name.toLowerCase().includes(searchLower) || item.description?.toLowerCase().includes(searchLower))
    : items;

  // Группировка по категориям
  const getItemsForCat = (catId: string) => filteredItems.filter(item => item.categoryId === catId);
  const uncategorized = filteredItems.filter(item => !categories.some(c => c.id === item.categoryId));

  const toggleCollapse = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Хендлеры
  const handleSaveCategory = async (data: Omit<MenuCategory, "id">, id?: string) => {
    if (id) {
      await MenuService.updateCategory(id, data);
    } else {
      await MenuService.addCategory(data);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Удалить категорию? Все позиции в ней останутся без категории.")) return;
    await MenuService.deleteCategory(id);
  };

  const handleSaveItem = async (data: Omit<MenuItem, "id">, id?: string) => {
    if (id) {
      await MenuService.updateItem(id, data);
    } else {
      await MenuService.addItem(data);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Удалить эту позицию?")) return;
    await MenuService.deleteItem(id);
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    await MenuService.toggleAvailability(id, !current);
  };

  // Статистика
  const totalAvailable = items.filter(i => i.isAvailable).length;
  const totalWithMods = items.filter(i => i.modifiers && i.modifiers.length > 0).length;

  if (loading || authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  /* ── Render item card ── */
  const renderItemCard = (item: MenuItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${
        !item.isAvailable ? "opacity-60 grayscale-[30%]" : ""
      }`}
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-orange-100 to-pink-50">
        {item.image ? (
          <img
            src={resolveImageUrl(item.image)}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-orange-200" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {item.isPopular && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-medium">🔥 Хит</span>
          )}
          {item.isNew && (
            <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium">✨ Новинка</span>
          )}
          {!item.isAvailable && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">Стоп</span>
          )}
        </div>
        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow"
          >
            {item.isAvailable ? (
              <EyeIcon className="w-4 h-4 text-green-600" />
            ) : (
              <EyeSlashIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-gray-800 text-sm mb-0.5 line-clamp-1">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="text-base font-bold text-orange-500">{item.price} ₸</span>
            {item.sizes && item.sizes.length > 0 && (
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {item.sizes.map(s => (
                  <span key={s.key} className="text-[9px] px-1 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">
                    {s.label} {s.price}₸
                  </span>
                ))}
              </div>
            )}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {item.modifiers.slice(0, 3).map(m => (
                  <span key={m.id} className="text-[9px] px-1 py-0.5 bg-purple-50 text-purple-600 rounded font-medium">
                    {m.type === 'select' ? '▾' : m.type === 'multi' ? '☑' : m.type === 'toggle' ? '⇄' : '⟿'} {m.title}
                  </span>
                ))}
                {item.modifiers.length > 3 && (
                  <span className="text-[9px] px-1 py-0.5 bg-purple-50 text-purple-500 rounded font-medium">
                    +{item.modifiers.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={() => { setEditItem(item); setShowItemModal(true); }}
              className="p-2 rounded-lg hover:bg-orange-50 text-gray-500 hover:text-orange-600 transition"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ── Render table row ── */
  const renderItemRow = (item: MenuItem) => (
    <div
      key={item.id}
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-orange-50/30 transition ${
        !item.isAvailable ? "opacity-50" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-50 shrink-0">
        {item.image ? (
          <img src={resolveImageUrl(item.image)} alt="" className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-5 h-5 text-orange-200" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
          {item.isPopular && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">🔥</span>}
          {item.isNew && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-medium">✨</span>}
          {!item.isAvailable && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">стоп</span>}
        </div>
        {item.description && <p className="text-[11px] text-gray-400 truncate">{item.description}</p>}
      </div>
      <span className="text-sm font-bold text-orange-500 shrink-0">{item.price} ₸</span>
      {item.modifiers && item.modifiers.length > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded font-medium shrink-0">
          ⚙ {item.modifiers.length}
        </span>
      )}
      <div className="flex gap-0.5 shrink-0">
        <button onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          {item.isAvailable ? <EyeIcon className="w-3.5 h-3.5 text-green-600" /> : <EyeSlashIcon className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        <button onClick={() => { setEditItem(item); setShowItemModal(true); }}
          className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-500 transition">
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => handleDeleteItem(item.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 transition">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  /* ── Category section ── */
  const renderCategorySection = (cat: MenuCategory, catItems: MenuItem[]) => {
    if (catItems.length === 0 && searchLower) return null;
    const isCollapsed = collapsedCats.has(cat.id);
    const available = catItems.filter(i => i.isAvailable).length;

    return (
      <div key={cat.id} className="mb-6">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-3 group">
          <button
            onClick={() => toggleCollapse(cat.id)}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            <span className="text-2xl">{cat.icon}</span>
            <div className="text-left min-w-0">
              <h3 className="text-base font-bold text-gray-800 truncate">{cat.name}</h3>
              <p className="text-[11px] text-gray-400">
                {catItems.length} позиций • {available} доступно
              </p>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => { setEditCategory(cat); setShowCategoryModal(true); }}
              className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition"
              title="Редактировать категорию"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
              title="Удалить категорию"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditItem(null); setShowItemModal(true); }}
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition"
              title="Добавить в категорию"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {catItems.length === 0 ? (
                <div className="text-center py-8 bg-white/50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Пусто — добавьте первую позицию</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {catItems.map(renderItemCard)}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {catItems.map(renderItemRow)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Squares2X2Icon className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Редактор меню</h1>
                <p className="text-sm opacity-80">
                  {categories.length} категорий • {items.length} позиций • {totalAvailable} активных
                  {totalWithMods > 0 && ` • ${totalWithMods} с модификаторами`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditCategory(null); setShowCategoryModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Категория
              </button>
              <button
                onClick={() => { setEditItem(null); setShowItemModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-500 rounded-lg hover:bg-white/90 transition font-medium text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Позиция
              </button>
            </div>
          </div>

          {/* Search + view toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по названию..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/20 border border-white/20 text-sm text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/30 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm transition ${viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white'}`}
                title="Карточки"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm transition ${viewMode === 'table' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white'}`}
                title="Список"
              >
                <Bars3Icon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Search results count */}
        {searchLower && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Найдено <b className="text-orange-500">{filteredItems.length}</b> из {items.length} позиций
            </span>
            <button onClick={() => setSearch('')} className="text-xs text-orange-500 hover:text-orange-700 font-medium">
              Сбросить
            </button>
          </div>
        )}

        {/* Category sections */}
        {categories.map(cat => renderCategorySection(cat, getItemsForCat(cat.id)))}

        {/* Uncategorized items */}
        {uncategorized.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-base font-bold text-gray-800">Без категории</h3>
                <p className="text-[11px] text-gray-400">{uncategorized.length} позиций</p>
              </div>
            </div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {uncategorized.map(renderItemCard)}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {uncategorized.map(renderItemRow)}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <SparklesIcon className="w-16 h-16 text-orange-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Меню пока пустое</h3>
            <p className="text-gray-400 mb-6 text-sm">Начните с создания категорий, затем добавьте позиции</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setEditCategory(null); setShowCategoryModal(true); }}
                className="px-6 py-2.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition font-medium"
              >
                Создать категорию
              </button>
              <button
                onClick={() => { setEditItem(null); setShowItemModal(true); }}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                Добавить позицию
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCategoryModal && (
          <CategoryModal
            category={editCategory}
            onClose={() => {
              setShowCategoryModal(false);
              setEditCategory(null);
            }}
            onSave={handleSaveCategory}
          />
        )}
        {showItemModal && (
          <ItemModal
            item={editItem}
            categories={categories}
            onClose={() => {
              setShowItemModal(false);
              setEditItem(null);
            }}
            onSave={handleSaveItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuEditorPage;
