import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, LocalizedString } from "@/types/types";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  categoryId: string;
  initialData: Product | null;
  onClose(): void;
}

const ProductModal: React.FC<Props> = ({
  categoryId,
  initialData,
  onClose,
}) => {
  const [name, setName] = useState<LocalizedString>({ ru: "", kz: "", en: "" });
  const [desc, setDesc] = useState<LocalizedString>({ ru: "", kz: "", en: "" });
  const [price, setPrice] = useState(initialData?.price || 0);
  const [image, setImage] = useState(initialData?.image || "");
  const [paymentLink, setPaymentLink] = useState(initialData?.paymentLink || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDesc(initialData.description || { ru: "", kz: "", en: "" });
      setPrice(initialData.price);
      setImage(initialData.image || "");
      setPaymentLink(initialData.paymentLink || "");
    }
  }, [initialData]);

  const save = async () => {
    setLoading(true);
    try {
      const prod: Product = {
        id: initialData?.id || Date.now().toString(),
        name,
        description: desc,
        price,
        image,
        paymentLink,
      };
      
      const ref = doc(db, "categories", categoryId);
      
      if (initialData) {
        // Update existing product
        await updateDoc(ref, { products: arrayRemove(initialData) });
        await updateDoc(ref, { products: arrayUnion(prod) });
      } else {
        // Add new product
        await updateDoc(ref, { products: arrayUnion(prod) });
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'ru' as keyof LocalizedString, name: 'Русский', flag: '🇷🇺' },
    { code: 'kz' as keyof LocalizedString, name: 'Қазақша', flag: '🇰🇿' },
    { code: 'en' as keyof LocalizedString, name: 'English', flag: '🇺🇸' }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? "Редактировать напиток" : "Новый напиток"}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-95"
              >
                <XMarkIcon className="w-6 h-6 text-gray-900" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-5 space-y-5">
              {/* Image Preview */}
              {image && (
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl overflow-hidden shadow-sm">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ссылка на изображение
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    value={price || ''}
                    onChange={e => setPrice(Number(e.target.value))}
                    required
                    min="0"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₸</span>
                </div>
              </div>

              {/* Payment Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ссылка для оплаты <span className="text-gray-400 text-xs">(необязательно)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/payment"
                  value={paymentLink}
                  onChange={e => setPaymentLink(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              {/* Name Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Название напитка
                </label>
                <div className="space-y-3">
                  {languages.map(lang => (
                    <div key={lang.code}>
                      <div className="text-xs font-medium text-gray-500 mb-1.5">
                        {lang.flag} {lang.name}
                      </div>
                      <input
                        type="text"
                        placeholder={`Название на ${lang.name.toLowerCase()}`}
                        value={name[lang.code]}
                        onChange={e => setName(prev => ({ ...prev, [lang.code]: e.target.value }))}
                        required={lang.code === 'ru'}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Описание <span className="text-gray-400 text-xs">(необязательно)</span>
                </label>
                <div className="space-y-3">
                  {languages.map(lang => (
                    <div key={lang.code}>
                      <div className="text-xs font-medium text-gray-500 mb-1.5">
                        {lang.flag} {lang.name}
                      </div>
                      <textarea
                        placeholder={`Описание на ${lang.name.toLowerCase()}`}
                        value={desc[lang.code]}
                        onChange={e => setDesc(prev => ({ ...prev, [lang.code]: e.target.value }))}
                        rows={2}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors active:scale-95"
            >
              Отмена
            </button>
            <button
              onClick={save}
              disabled={loading || !name.ru || price <= 0}
              className="flex-1 py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Сохранение...
                </div>
              ) : (
                initialData ? "Сохранить" : "Добавить"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;
