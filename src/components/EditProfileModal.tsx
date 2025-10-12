// src/components/EditProfileModal.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CameraIcon, UserIcon, PhoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../auth/AuthContext';
import { sanitizePhone, validateE164, ensurePlusPrefix } from '../utils/phone';

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
    const sanitized = sanitizePhone(e.target.value);
    setPhone(sanitized);
    setError('');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5MB)');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setAvatar(downloadURL);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Ошибка загрузки аватарки');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    if (!name.trim()) {
      setError('Введите имя');
      return;
    }

    // Validate phone
    const phoneWithPlus = ensurePlusPrefix(phone);
    if (!validateE164(phoneWithPlus)) {
      setError('Введите корректный номер телефона');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      await onSave({
        name: name.trim(),
        phone: phoneWithPlus,
        avatar: avatar || undefined,
      });
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999] pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-md w-full p-6 pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Редактировать профиль
                  </h2>
                  <div className="h-1 w-20 bg-slate-900 rounded-full mt-2"></div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200"
                  disabled={saving}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <UserIcon className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-slate-900 hover:bg-black text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <CameraIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Нажмите на камеру чтобы загрузить фото</p>
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
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Имя
                  </label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ваше имя"
                      className="w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-900 transition-all duration-200 border-slate-200 bg-white hover:border-slate-300"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Номер телефона
                  </label>
                  <div className="relative group">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (___) ___-__-__"
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-900 transition-all duration-200 ${
                        error 
                          ? 'border-red-400 bg-red-50/50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      disabled={saving}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 font-medium"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <motion.button
                    type="submit"
                    disabled={saving || uploading}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.01 }}
                    className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 px-6 rounded-xl shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить'
                    )}
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
