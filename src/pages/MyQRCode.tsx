import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
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

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name || userData.displayName || 'Клиент');
          setUserPhone(userData.phone || '');
        }

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

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4EDE4]">
        <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EDE4] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => history.goBack()}
          className="p-2 -ml-2 rounded-xl hover:bg-[#3D0A11]/5 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-[#3D0A11]" />
        </button>
        <h1 className="text-lg font-bold text-[#3D0A11]">Мой QR-код</h1>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 pt-4 pb-32">
        {/* QR Code — first */}
        <p className="text-[#3D0A11]/50 text-sm mb-4">Покажите бариста для начисления бонусов</p>
        <div className="p-5 rounded-2xl bg-white shadow-lg mb-6">
          <QRCodeCanvas
            value={`loyalty:uid=${encodeURIComponent(userId)}&v=1`}
            size={220}
            includeMargin={false}
          />
        </div>

        {/* Compact info card — below QR */}
        <div className="w-full p-4 rounded-2xl bg-white shadow-md mb-6">
          <div className="flex items-center gap-3">
            <AchievementBadge ordersCount={ordersCount} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-[#3D0A11] truncate">{userName}</div>
              {userPhone && (
                <div className="text-xs text-[#3D0A11]/50">{userPhone}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-[#3D0A11]/50 uppercase tracking-wide">Бонусы</div>
              <div className="text-lg font-bold text-[#D4AF37]">{bonusBalance.toLocaleString()} ₸</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full space-y-3 mb-6">
          <div className="p-4 rounded-2xl bg-white shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold text-sm">
                1
              </div>
              <div>
                <div className="font-medium text-[#3D0A11] mb-0.5">Покажите QR-код</div>
                <div className="text-sm text-[#3D0A11]/50">
                  Попросите бариста отсканировать ваш код
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold text-sm">
                2
              </div>
              <div>
                <div className="font-medium text-[#3D0A11] mb-0.5">Используйте бонусы</div>
                <div className="text-sm text-[#3D0A11]/50">
                  Оплатите часть заказа накопленными баллами
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold text-sm">
                3
              </div>
              <div>
                <div className="font-medium text-[#3D0A11] mb-0.5">Накапливайте баллы</div>
                <div className="text-sm text-[#3D0A11]/50">
                  Получайте бонусы с каждой покупки
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="w-full p-4 rounded-2xl bg-[#D4AF37]/10">
          <div className="text-sm text-[#3D0A11]/70">
            <strong>Совет:</strong> Увеличьте яркость экрана для лучшего сканирования QR-кода
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQRCodePage;
