/**
 * Menu Editor - Admin only
 * 
 * Full CRUD for:
 * - Categories
 * - Menu items (products)
 * - Image upload with WebP conversion
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { getCollectionPath, detectTenantId } from '@/config/tenant';

interface MenuItem {
  id: string;
  name: string;
  nameEs?: string;
  price: number;
  image: string;
  description?: string;
  categoryId: string;
  available: boolean;
  sortOrder?: number;
}

interface Category {
  id: string;
  name: string;
  nameEs?: string;
  icon?: string;
  sortOrder: number;
}

// WebP conversion utility
async function convertToWebP(file: File, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Resize if too large (max 800px for menu images)
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
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert to WebP'));
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Upload image to Firebase Storage (tenant-scoped path)
async function uploadImage(file: File, path: string): Promise<string> {
  const tenantId = detectTenantId();
  // Convert to WebP
  const webpBlob = await convertToWebP(file);
  const webpFile = new File([webpBlob], `${path}.webp`, { type: 'image/webp' });
  
  // Upload to Storage with tenant prefix
  const storagePath = tenantId === 'coffee-kz-prod' 
    ? `menu/${path}.webp` 
    : `tenants/${tenantId}/menu/${path}.webp`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, webpFile);
  
  return getDownloadURL(storageRef);
}

export default function MenuEditorPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEs: '',
    price: '',
    description: '',
    icon: '',
    available: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories (tenant-scoped)
  useEffect(() => {
    const collPath = getCollectionPath('categories');
    const q = query(collection(db, collPath), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cats);
      setActiveCategory(prev => prev || (cats.length > 0 ? cats[0].id : null));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load menu items (tenant-scoped)
  useEffect(() => {
    const collPath = getCollectionPath('menuItems');
    const unsub = onSnapshot(collection(db, collPath), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      setMenuItems(items);
    });
    return () => unsub();
  }, []);

  // Filter items by category
  const filteredItems = menuItems.filter(item => item.categoryId === activeCategory);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Open category modal
  const openCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        nameEs: cat.nameEs || '',
        price: '',
        description: '',
        icon: cat.icon || '',
        available: true,
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', nameEs: '', price: '', description: '', icon: '', available: true });
    }
    setShowCategoryModal(true);
  };

  // Open item modal
  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        nameEs: item.nameEs || '',
        price: item.price.toString(),
        description: item.description || '',
        icon: '',
        available: item.available,
      });
      setImagePreview(item.image || '');
    } else {
      setEditingItem(null);
      setFormData({ name: '', nameEs: '', price: '', description: '', icon: '', available: true });
      setImagePreview('');
    }
    setImageFile(null);
    setShowItemModal(true);
  };

  // Save category
  const saveCategory = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    
    try {
      const data = {
        name: formData.name.trim(),
        nameEs: formData.nameEs.trim() || formData.name.trim(),
        icon: formData.icon.trim(),
        sortOrder: categories.length,
        updatedAt: serverTimestamp(),
      };
      
      const categoriesPath = getCollectionPath('categories');
      if (editingCategory) {
        await updateDoc(doc(db, categoriesPath, editingCategory.id), data);
      } else {
        await addDoc(collection(db, categoriesPath), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      
      setShowCategoryModal(false);
    } catch {
      alert('Error saving category');
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    
    try {
      const categoriesPath = getCollectionPath('categories');
      await deleteDoc(doc(db, categoriesPath, id));
      if (activeCategory === id) {
        setActiveCategory(categories[0]?.id || null);
      }
    } catch {
      alert('Error deleting category');
    }
  };

  // Save menu item
  const saveMenuItem = async () => {
    if (!formData.name.trim() || !formData.price || !activeCategory) return;
    setSaving(true);
    
    try {
      let imageUrl = editingItem?.image || '';
      
      // Upload new image if selected
      if (imageFile) {
        const imagePath = `${Date.now()}-${formData.name.replace(/\s+/g, '-').toLowerCase()}`;
        imageUrl = await uploadImage(imageFile, imagePath);
      }
      
      const data = {
        name: formData.name.trim(),
        nameEs: formData.nameEs.trim() || formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim(),
        image: imageUrl,
        categoryId: activeCategory,
        available: formData.available,
        updatedAt: serverTimestamp(),
      };
      
      const menuItemsPath = getCollectionPath('menuItems');
      if (editingItem) {
        await updateDoc(doc(db, menuItemsPath, editingItem.id), data);
      } else {
        await addDoc(collection(db, menuItemsPath), {
          ...data,
          createdAt: serverTimestamp(),
          sortOrder: filteredItems.length,
        });
      }
      
      setShowItemModal(false);
    } catch {
      alert('Error saving item');
    } finally {
      setSaving(false);
    }
  };

  // Delete menu item
  const deleteMenuItem = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    
    try {
      const menuItemsPath = getCollectionPath('menuItems');
      await deleteDoc(doc(db, menuItemsPath, id));
    } catch {
      alert('Error deleting item');
    }
  };

  // Toggle item availability
  const toggleAvailability = async (item: MenuItem) => {
    try {
      const menuItemsPath = getCollectionPath('menuItems');
      await updateDoc(doc(db, menuItemsPath, item.id), {
        available: !item.available,
      });
    } catch {
      alert('Error updating availability');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Squares2X2Icon className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Editor de Menú</h1>
              <p className="text-red-200 text-sm">Administrar categorías y productos</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Categories Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Categorías</h2>
            <button
              onClick={() => openCategoryModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nueva Categoría
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all
                  ${activeCategory === cat.id 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 shadow'
                  }
                `}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span className="font-medium">{cat.nameEs || cat.name}</span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                    className={`p-1 rounded hover:bg-black/10 ${activeCategory === cat.id ? 'text-white' : 'text-slate-400'}`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                    className={`p-1 rounded hover:bg-black/10 ${activeCategory === cat.id ? 'text-white' : 'text-slate-400'}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Menu Items Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              Productos {activeCategory && `(${filteredItems.length})`}
            </h2>
            {activeCategory && (
              <button
                onClick={() => openItemModal()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Nuevo Producto
              </button>
            )}
          </div>

          {!activeCategory ? (
            <div className="text-center py-12 text-slate-500">
              Selecciona una categoría para ver productos
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No hay productos en esta categoría
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  className={`
                    bg-white rounded-2xl shadow overflow-hidden
                    ${!item.available ? 'opacity-60' : ''}
                  `}
                >
                  <div className="aspect-video bg-slate-100 relative">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-slate-300">
                        🍽️
                      </div>
                    )}
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold">NO DISPONIBLE</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg font-bold">
                      ${item.price}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 mb-1">{item.nameEs || item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                          item.available 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item.available ? '✓ Disponible' : 'Activar'}
                      </button>
                      <button
                        onClick={() => openItemModal(item)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Ej: Hamburguesas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre en Español</label>
                  <input
                    type="text"
                    value={formData.nameEs}
                    onChange={(e) => setFormData(f => ({ ...f, nameEs: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Ej: Hamburguesas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Icono (emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(f => ({ ...f, icon: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="🍔"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCategory}
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowItemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              
              <div className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Imagen</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-white overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <PhotoIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Click para subir imagen</p>
                        <p className="text-xs text-slate-400">Se convertirá a WebP automáticamente</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Ej: Big Mac"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre en Español</label>
                  <input
                    type="text"
                    value={formData.nameEs}
                    onChange={(e) => setFormData(f => ({ ...f, nameEs: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Ej: Big Mac"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none"
                    rows={3}
                    placeholder="Descripción del producto..."
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData(f => ({ ...f, available: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-slate-700">Disponible para venta</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveMenuItem}
                  disabled={saving || !formData.name.trim() || !formData.price}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

