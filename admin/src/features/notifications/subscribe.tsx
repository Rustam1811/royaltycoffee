import React, { useState } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { enableNotifications, playNotificationSound } from './api';

interface NotificationSubscribeProps {
  userId: string;
  onClose: () => void;
  onEnabled: () => void;
}

export function NotificationSubscribe({ userId, onClose, onEnabled }: NotificationSubscribeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await enableNotifications(userId, {
        subscribePromotions: true,
        subscribeStories: true
      });

      if (result.success) {
        playNotificationSound();
        onEnabled();
        setTimeout(onClose, 500);
      } else {
        setError(result.error || 'Не удалось включить уведомления');
      }
    } catch {
      setError('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <BellIcon className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            Включите уведомления
          </h2>
          <p className="text-center text-white/90 text-sm">
            Получайте уведомления о новых заказах со звуком
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Новые заказы
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Звуковое уведомление при появлении нового заказа
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Позже
            </button>
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isLoading ? 'Подключение...' : 'Включить'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
            Вы можете отключить в любой момент в настройках
          </p>
        </div>
      </div>
    </div>
  );
}
