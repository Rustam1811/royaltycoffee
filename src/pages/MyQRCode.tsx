import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import QRCode from '../components/QRCode';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { QrCodeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const MyQRCodePage: React.FC = () => {
  const history = useHistory();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          history.push('/login');
          return;
        }

        setUserId(user.uid);

        // Загружаем данные пользователя
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name || userData.displayName || 'Клиент');
          setUserPhone(userData.phone || '');
        }

        // Загружаем бонусы
        const bonusDoc = await getDoc(doc(db, 'bonuses', user.uid));
        if (bonusDoc.exists()) {
          const bonusData = bonusDoc.data();
          setBonusBalance(bonusData.balance || 0);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [history]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => history.goBack()}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Мой QR-код</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8">
        {/* Info Card */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-400/30">
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-white">{userName}</div>
            {userPhone && (
              <div className="text-sm text-emerald-300">{userPhone}</div>
            )}
            <div className="pt-4 pb-2">
              <div className="text-sm text-emerald-200/80 uppercase tracking-wide">
                Баланс бонусов
              </div>
              <div className="text-4xl font-bold text-emerald-400 mt-1">
                {bonusBalance.toLocaleString()} ₸
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-white mb-2">
              Покажите этот QR-код бариста
            </h2>
            <p className="text-sm text-slate-400">
              Для оплаты бонусами или накопления баллов
            </p>
          </div>

          {/* QR Code with enhanced styling */}
          <div className="flex justify-center">
            <div className="p-8 rounded-3xl bg-white shadow-2xl">
              <QRCode value={userId} size={280} />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                1
              </div>
              <div>
                <div className="font-medium text-white mb-1">Покажите QR-код</div>
                <div className="text-sm text-slate-400">
                  Попросите бариста отсканировать ваш код
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                2
              </div>
              <div>
                <div className="font-medium text-white mb-1">Используйте бонусы</div>
                <div className="text-sm text-slate-400">
                  Оплатите часть заказа накопленными баллами
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                3
              </div>
              <div>
                <div className="font-medium text-white mb-1">Накапливайте баллы</div>
                <div className="text-sm text-slate-400">
                  Получайте бонусы с каждой покупки
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 rounded-2xl bg-blue-500/10 border border-blue-400/30">
          <div className="text-sm text-blue-200">
            <strong>Совет:</strong> Увеличьте яркость экрана для лучшего сканирования QR-кода
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQRCodePage;
