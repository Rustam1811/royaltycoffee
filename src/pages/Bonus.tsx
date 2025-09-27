// src/pages/Bonus.tsx
import React, { useEffect, useState } from 'react';
import { FaCoins, FaMedal, FaGift, FaChartLine, FaLock } from 'react-icons/fa';
import { api } from '../lib/api';

interface Order {
  id: string;
  date: string;
  amount: number;
  bonusEarned: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: JSX.Element;
  secret?: boolean;
}

const Bonus: React.FC = () => {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [spendAmount, setSpendAmount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // получаем userPhone
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    const u = JSON.parse(stored);
    setUserPhone(u.phone || u.uid || null);
  }, []);

  // запрос баланса, истории, достижений
  useEffect(() => {
    if (!userPhone) return;
    setLoading(true);

    (async () => {
      try {
        // баланс через GET /bonus
        const bonusData = await api.get(`bonus?action=user&userId=${userPhone}`);
        const { bonusPoints } = bonusData;
        setBonusPoints(bonusPoints);
        setSpendAmount(bonusPoints > 0 ? 1 : 0);

        // последние 5 заказов
        const raw = await api.get(`orders?action=get&userId=${userPhone}`);
        const ords: Order[] = (raw as unknown[]).map((o: unknown) => {
          const order = o as Record<string, unknown>;
          return {
            id: String(order.id || ''),
            date: String(order.date || ''),
            amount: Number(order.amount || 0),
            bonusEarned: Number(order.bonusEarned || 0),
          };
        });
        setOrders(ords);

        // формируем достижения
        const ach: Achievement[] = [
          { id:'first_order', name:'Первый заказ', description:'Совершите первый заказ', unlocked: ords.length>=1, icon:<FaMedal className="text-4xl"/>},
          { id:'five_orders',  name:'5 заказов',     description:'Совершите 5 заказов',    unlocked: ords.length>=5, icon:<FaGift className="text-4xl"/>},
          { id:'thousand_points', name:'1000 баллов', description:'Наберите 1000 бонусных баллов', unlocked: bonusPoints>=1000, icon:<FaChartLine className="text-4xl"/>},
          { id:'secret_big_spender',    name:'Секрет: Большой чек', description:'≥ 5000₸', unlocked: ords.some(o=>o.amount>=5000), icon:<FaLock className="text-4xl"/>, secret:true},
          { id:'secret_night_order',    name:'Секрет: Ночной гость', description:'00–05',    unlocked: ords.some(o=>{const h=new Date(o.date).getHours();return h>=0&&h<5;}), icon:<FaLock className="text-4xl"/>, secret:true},
        ];
        setAchievements(ach);
      } catch (err) {
        console.error('Ошибка загрузки бонусов/заказов:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userPhone]);

  const handleSpend = async () => {
    if (!userPhone) return;
    if (spendAmount < 1 || spendAmount > bonusPoints) {
      return alert(`Введите сумму от 1 до ${bonusPoints}`);
    }
    try {
      // списание через POST /placeOrder
      const data = await api.post('placeOrder', {
        userId: userPhone,
        items: [],
        amount: 0,
        bonusToUse: spendAmount,
      });
      setBonusPoints(data.newBonus);
      setSpendAmount(data.newBonus > 0 ? 1 : 0);
      alert(`Успешно списано ${spendAmount} бонусов!`);
    } catch (err) {
      console.error('Ошибка списания бонусов:', err);
      alert(err.message);
    }
  };

  if (!userPhone) {
    return (
      <div className="p-6 bg-white rounded-xl shadow text-center">
        <p className="font-semibold">Войдите, чтобы посмотреть бонусы ☕</p>
      </div>
    );
  }

  return (
    <div className="max-h-[90vh] overflow-auto p-4 bg-white">
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Баланс и списание */}
          <div className="p-8 bg-gray-50 rounded-2xl shadow text-center">
            <FaCoins className="text-[180px] opacity-10 mx-auto" />
            <h2 className="text-2xl mb-2">Ваши бонусы</h2>
            <div className="text-5xl font-bold mb-4">{bonusPoints} 💎</div>
            <div className="flex justify-center items-center gap-2">
              <input
                type="number"
                min={1}
                max={bonusPoints}
                value={spendAmount}
                onChange={e => setSpendAmount(Math.max(1, Math.min(bonusPoints, +e.target.value)))}
                className="w-24 p-2 border rounded"
              />
              <button
                onClick={handleSpend}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                🎁 Списать
              </button>
            </div>
          </div>

          {/* Прогресс */}
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="mb-4">📈 Прогресс к 1000 бонусам</h3>
            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black text-right pr-2 text-white font-semibold"
                style={{ width: `${Math.min(bonusPoints,1000)/10}%` }}
              >
                {bonusPoints} / 1000
              </div>
            </div>
          </div>

          {/* Достижения */}
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="mb-4">🏆 Достижения</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {achievements.map(a => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl shadow flex flex-col items-center ${
                    a.unlocked
                      ? 'bg-green-50'
                      : a.secret
                        ? 'bg-gray-100 opacity-60'
                        : 'bg-gray-100'
                  }`}
                >
                  {a.icon}
                  <p className="mt-2 font-semibold text-center">
                    {a.unlocked || !a.secret ? a.name : '???'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* История заказов */}
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="mb-4">🧾 Последние 5 заказов</h3>
            {orders.length === 0 ? (
              <p>Нет заказов</p>
            ) : (
              <div className="max-h-64 overflow-auto space-y-3">
                {orders.map(o => (
                  <div
                    key={o.id}
                    className="flex justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium">#{o.id.slice(0,6)}</div>
                      <div className="text-sm text-gray-500">{o.date}</div>
                    </div>
                    <div className="text-right">
                      <div>💸 {o.amount}₸</div>
                      <div>💎 +{o.bonusEarned}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Bonus;
