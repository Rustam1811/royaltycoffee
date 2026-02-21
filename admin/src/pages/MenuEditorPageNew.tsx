/**
 * MenuEditorPage - Управление меню из menuCategories и menuItems
 * Синхронизировано с клиентом
 */

import React, { useEffect, useState, useContext, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MenuService,
  MenuCategory,
  MenuItem,
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
];

// Available local food images in public/eats/
const LOCAL_FOOD_IMAGES = Array.from({ length: 38 }, (_, i) => `eat-${String(i + 1).padStart(2, '0')}.webp`);

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
  });
  const [sizesEnabled, setSizesEnabled] = useState(
    !!(item?.sizes && item.sizes.length > 0)
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
      const { sizes: formSizes, ...rest } = form;
      const dataToSave: Omit<MenuItem, "id"> = {
        ...rest,
        sizes: sizesEnabled ? formSizes.filter(s => s.price > 0) : [],
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
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">
          {item ? "Редактировать позицию" : "Новая позиция"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
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

  // Фильтрация позиций по категории
  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.categoryId === selectedCategory);

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

  if (loading || authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-orange-500 to-pink-500 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Squares2X2Icon className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Редактор меню</h1>
              <p className="text-sm opacity-80">
                {categories.length} категорий • {items.length} позиций
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditCategory(null);
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              <PlusIcon className="w-5 h-5" />
              Категория
            </button>
            <button
              onClick={() => {
                setEditItem(null);
                setShowItemModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-500 rounded-lg hover:bg-white/90 transition font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Позиция
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Категории - горизонтальный скролл */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Категории</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {/* "All" filter button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                selectedCategory === "all"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-orange-50 border border-gray-200"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              <span className="text-xl">📋</span>
              <span className="font-medium whitespace-nowrap">Все ({items.length})</span>
            </motion.div>
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ scale: 1.02 }}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  selectedCategory === cat.id
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-orange-50 border border-gray-200"
                }`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium whitespace-nowrap">{cat.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat.id ? "bg-white/25" : "bg-gray-100"
                }`}>
                  {items.filter(i => i.categoryId === cat.id).length}
                </span>
                {cat.id !== "all" && (
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCategory(cat);
                        setShowCategoryModal(true);
                      }}
                      className="p-1 rounded-full hover:bg-black/10"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      className="p-1 rounded-full hover:bg-red-500/20 text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Позиции меню */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Позиции меню ({filteredItems.length})
          </h2>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <SparklesIcon className="w-12 h-12 text-orange-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Нет позиций в этой категории</p>
              <button
                onClick={() => {
                  setEditItem(null);
                  setShowItemModal(true);
                }}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Добавить первую
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${
                    !item.isAvailable ? "opacity-60" : ""
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gradient-to-br from-orange-100 to-pink-50">
                    {item.image ? (
                      <img
                        src={resolveImageUrl(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-12 h-12 text-orange-200" />
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {item.isPopular && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                          🔥 Хит
                        </span>
                      )}
                      {item.isNew && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                          ✨ Новинка
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          Недоступно
                        </span>
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
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-orange-500">
                          {item.price} ₸
                        </span>
                        {item.sizes && item.sizes.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {item.sizes.map(s => (
                              <span key={s.key} className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">
                                {s.label} {s.price}₸
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditItem(item);
                            setShowItemModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-white text-gray-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
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
