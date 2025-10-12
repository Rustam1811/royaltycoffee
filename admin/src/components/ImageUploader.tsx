import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { PhotoIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ImageUploaderProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  uploading: boolean;
  progress: number;
  error: string | null;
  onUpload: (file: File) => void;
  className?: string;
}

/**
 * Компактный загрузчик изображений для акций/достижений
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageUrl,
  onImageChange,
  uploading,
  progress,
  error,
  onUpload,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  const handleRemove = () => {
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-slate-900 mb-2">
        Изображение
      </label>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imageUrl ? (
          /* Preview with image */
          <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50">
            <div className="aspect-[16/9] w-full relative">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Заменить
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleRemove}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium shadow-lg flex items-center gap-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Удалить
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload placeholder */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-slate-200 group-hover:bg-slate-300 flex items-center justify-center transition-colors">
              <PhotoIcon className="w-8 h-8 text-slate-500 group-hover:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Нажмите для загрузки
              </p>
              <p className="text-xs text-slate-500 mt-1">
                или перетащите файл сюда
              </p>
              <p className="text-xs text-slate-400 mt-2">
                PNG, JPG, GIF до 5MB
              </p>
            </div>
          </button>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-full max-w-[200px]">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-slate-900 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-700">
              Загрузка {progress}%
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Manual URL input (fallback) */}
      <details className="mt-3">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
          Или введите URL вручную
        </summary>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </details>
    </div>
  );
};
