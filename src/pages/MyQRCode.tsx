import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { QrCodeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { RoyalLayout } from '../components/RoyalLayout';
import { AchievementBadge } from '../components/AchievementBadge';

const MyQRCodePage: React.FC = () => {
  const history = useHistory();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [ordersCount, setOrdersCount] = useState<number>(0);
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
          setOrdersCount(bonusData.ordersCount || 0);
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
      <RoyalLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-lg">Загрузка...</div>
        </div>
      </RoyalLayout>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <RoyalLayout>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => history.goBack()}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6 text-[#D4AF37]" />
            <h1 className="text-xl font-bold text-white">Мой QR-код</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 pb-28">
        {/* Info Card */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30">
          <div className="text-center space-y-2">
            {/* Значок достижения */}
            <div className="flex justify-center mb-4">
              <AchievementBadge ordersCount={ordersCount} size="lg" />
            </div>
            
            <div className="text-2xl font-bold text-white">{userName}</div>
            {userPhone && (
              <div className="text-sm text-[#D4AF37]">{userPhone}</div>
            )}
            <div className="pt-4 pb-2">
              <div className="text-sm text-white/60 uppercase tracking-wide">
                Баланс бонусов
              </div>
              <div className="text-4xl font-bold text-[#D4AF37] mt-1">
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
              <QRCodeCanvas 
                value={`loyalty:uid=${encodeURIComponent(userId)}&v=1`} 
                size={280}
                includeMargin={true}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 space-y-3">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                1
              </div>
              <div>
                <div className="font-medium text-white mb-1">Покажите QR-код</div>
                <div className="text-sm text-white/60">
                  Попросите бариста отсканировать ваш код
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                2
              </div>
              <div>
                <div className="font-medium text-white mb-1">Используйте бонусы</div>
                <div className="text-sm text-white/60">
                  Оплатите часть заказа накопленными баллами
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                3
              </div>
              <div>
                <div className="font-medium text-white mb-1">Накапливайте баллы</div>
                <div className="text-sm text-white/60">
                  Получайте бонусы с каждой покупки
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
          <div className="text-sm text-[#D4AF37]">
            <strong>Совет:</strong> Увеличьте яркость экрана для лучшего сканирования QR-кода
          </div>
        </div>
      </div>
    </RoyalLayout>
  );
};

export default MyQRCodePage;
