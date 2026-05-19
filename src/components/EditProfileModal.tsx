// src/components/EditProfileModal.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CameraIcon, UserIcon, PhoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../auth/AuthContext';
import { sanitizePhone, validateE164, ensurePlusPrefix } from '../utils/phone';

// WebP conversion — same pattern as MenuEditor (max 400px for avatars)
async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    img.onload = () => {
      const maxSize = 400;
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

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; avatar?: string }) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+7');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(sanitizePhone(e.target.value));
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError('Пожалуйста, выберите изображение'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Файл слишком большой (макс. 10MB)'); return; }

    setUploading(true);
    setError('');
    try {
      const webpBlob = await convertToWebP(file);
      const fileName = `${Date.now()}_avatar.webp`;
      const storageRef = ref(storage, `avatars/${user.uid}/${fileName}`);
      await uploadBytes(storageRef, new File([webpBlob], fileName, { type: 'image/webp' }));
      setAvatar(await getDownloadURL(storageRef));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Ошибка загрузки аватарки');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Введите имя'); return; }
    const phoneWithPlus = ensurePlusPrefix(phone);
    if (!validateE164(phoneWithPlus)) { setError('Введите корректный номер телефона'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), phone: phoneWithPlus, avatar: avatar || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
          />

          {/* Bottom sheet — slides up, matches app dark style */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl overflow-hidden md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[440px]"
            style={{ background: 'linear-gradient(160deg, #3D0A11 0%, #4D0E16 55%, #5A0D17 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-3" style={{ paddingBottom: 'calc(80px + max(env(safe-area-inset-bottom, 0px), 16px))' }}>
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Редактировать профиль</h2>
                  <div className="h-0.5 w-16 bg-[#D4AF37] rounded-full mt-1.5" />
                </div>
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[#D4AF37]/50 shadow-xl">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/10">
                        <UserIcon className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-[#D4AF37] hover:bg-[#C9A632] text-black p-2 rounded-xl shadow-lg transition-colors disabled:opacity-50"
                  >
                    {uploading
                      ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      : <CameraIcon className="w-4 h-4" />
                    }
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-2">Нажмите на камеру чтобы загрузить фото</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Имя</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      placeholder="Ваше имя"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:bg-white/15 transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Телефон</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (___) ___-__-__"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-white placeholder:text-white/30 focus:outline-none transition-all ${
                        error
                          ? 'bg-red-500/20 border-red-400/60 focus:border-red-400'
                          : 'bg-white/10 border-white/15 focus:border-[#D4AF37]/60 focus:bg-white/15'
                      }`}
                      disabled={saving}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 font-medium"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <motion.button
                    type="submit"
                    disabled={saving || uploading}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 bg-[#D4AF37] hover:bg-[#C9A632] text-black font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <><ArrowPathIcon className="w-4 h-4 animate-spin" />Сохранение...</>
                    ) : 'Сохранить'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
