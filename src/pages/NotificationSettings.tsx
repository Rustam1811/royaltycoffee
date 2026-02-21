/**
 * Notification Settings Page
 * Страница настроек push-уведомлений
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc, getDoc, getFirestore } from 'firebase/firestore';

interface NotificationPreferences {
  orders: boolean;
  bonuses: boolean;
  promotions: boolean;
  achievements: boolean;
}

const NotificationSettings: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orders: true,
    bonuses: true,
    promotions: true,
    achievements: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    const loadPrefs = async () => {
      if (!user?.uid) return;
      
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.notificationPreferences) {
            setPreferences(data.notificationPreferences);
          }
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [user]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не поддерживает уведомления');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // Получаем FCM токен
        const messaging = getMessaging();
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });

        // Сохраняем токен в Firestore
        if (token && user?.uid) {
          const db = getFirestore();
          await updateDoc(doc(db, 'users', user.uid), {
            fcmToken: token,
            fcmTokenUpdatedAt: new Date()
          });
        }
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const savePreferences = async (prefs: NotificationPreferences) => {
    if (!user?.uid) return;
    
    setSaving(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: prefs
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const preferenceItems = [
    {
      key: 'orders' as const,
      title: 'Статус заказов',
      description: 'Уведомления о готовности и доставке заказов'
    },
    {
      key: 'bonuses' as const,
      title: 'Бонусы',
      description: 'Начисление и списание бонусных баллов'
    },
    {
      key: 'promotions' as const,
      title: 'Акции и скидки',
      description: 'Специальные предложения и промокоды'
    },
    {
      key: 'achievements' as const,
      title: 'Достижения',
      description: 'Новые достижения и награды'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => history.goBack()}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Уведомления
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Permission Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl shadow-lg ${
            permissionStatus === 'granted'
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
              : permissionStatus === 'denied'
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
              : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
          }`}
        >
          <div className="flex items-start gap-4">
            {permissionStatus === 'granted' ? (
              <BellIcon className="w-8 h-8" />
            ) : (
              <BellSlashIcon className="w-8 h-8" />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">
                {permissionStatus === 'granted'
                  ? 'Уведомления включены'
                  : permissionStatus === 'denied'
                  ? 'Уведомления отключены'
                  : 'Уведомления не настроены'}
              </h2>
              <p className="text-sm opacity-90">
                {permissionStatus === 'granted'
                  ? 'Вы будете получать push-уведомления о заказах и акциях'
                  : permissionStatus === 'denied'
                  ? 'Разрешите уведомления в настройках браузера'
                  : 'Разрешите уведомления, чтобы быть в курсе акций и бонусов'}
              </p>
            </div>
          </div>

          {permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
            <button
              onClick={requestPermission}
              className="w-full mt-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
            >
              Включить уведомления
            </button>
          )}
        </motion.div>

        {/* Preferences */}
        {permissionStatus === 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Типы уведомлений
              </h3>
            </div>

            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="h-6 w-10 bg-slate-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {preferenceItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => togglePreference(item.key)}
                    disabled={saving}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div 
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        preferences[item.key]
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    >
                      <motion.div
                        layout
                        className={`w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center ${
                          preferences[item.key] ? 'ml-auto' : ''
                        }`}
                      >
                        {preferences[item.key] && (
                          <CheckIcon className="w-3 h-3 text-emerald-500" />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4"
        >
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 Push-уведомления работают даже когда приложение закрыто. 
            Вы всегда будете в курсе важных событий!
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationSettings;
