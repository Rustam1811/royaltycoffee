const { initFirebaseAdmin } = require('../firebaseAdmin');

// Функция для расчета уровня пользователя по сумме потраченных ₸
const calculateUserLevel = (totalSpent) => {
  if (totalSpent >= 25000) return { level: 'Платинум', next: null, spentToNext: 0, cashbackPercent: 20 };
  if (totalSpent >= 15000) return { level: 'Золото', next: 'Платинум', spentToNext: 25000 - totalSpent, cashbackPercent: 15 };
  if (totalSpent >= 5000) return { level: 'Серебро', next: 'Золото', spentToNext: 15000 - totalSpent, cashbackPercent: 10 };
  return { level: 'Бронза', next: 'Серебро', spentToNext: 5000 - totalSpent, cashbackPercent: 5 };
};

// Функция для расчета кешбэк-процента
const getCashbackPercent = (level) => {
  const cashback = {
    'Бронза': 5,
    'Серебро': 10,
    'Золото': 15,
    'Платинум': 20
  };
  return cashback[level] || 5;
};

async function handleUserBonus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId обязателен' });
  }

  try {
    const { admin, db } = initFirebaseAdmin();
    console.log('🔥 GET /api/user-bonus - userId:', userId);

    // Получаем документ пользователя
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let userData = {};
    if (userDoc.exists) {
      userData = userDoc.data();
      console.log('🔥 Данные пользователя:', userData);
    } else {
      console.log('🔥 Пользователь не найден в базе, создаем...');
      // Создаем пользователя с начальными данными
      userData = {
        bonusBalance: 0,
        createdAt: new Date(),
        phone: userId
      };
      await userRef.set(userData);
    }

    // Получаем заказы пользователя для подсчета
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('🔥 Найдено заказов:', orders.length);

    // Пересчитаем баланс на основе заказов, если история пустая
    let calculatedBalanceFromOrders = 0;
    orders.forEach(order => {
      if (order.bonusEarned) calculatedBalanceFromOrders += order.bonusEarned;
      if (order.bonusUsed) calculatedBalanceFromOrders -= order.bonusUsed;
    });
    console.log('🔥 Баланс из заказов:', calculatedBalanceFromOrders);

    const totalOrders = orders.length;
    // Подсчитываем общую сумму потраченных денег
    let totalSpent = 0;
    orders.forEach(order => {
      totalSpent += (order.amount || order.totalAmount || 0);
    });
    const levelInfo = calculateUserLevel(totalSpent);
    const cashbackPercent = getCashbackPercent(levelInfo.level);

    // Получаем историю бонусных операций
    console.log('🔥 Ищем историю бонусов для userId:', userId);
    const bonusHistorySnapshot = await db.collection('bonusHistory')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(20)
      .get();

    console.log('🔥 Найдено записей в bonusHistory:', bonusHistorySnapshot.size);

    const history = bonusHistorySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('🔥 Запись истории:', data);
      return {
        id: doc.id,
        ...data
      };
    });

    // Получаем ВСЮ историю для расчета реального баланса
    const allHistorySnapshot = await db.collection('bonusHistory')
      .where('userId', '==', userId)
      .get();

    console.log('🔥 Всего записей в bonusHistory:', allHistorySnapshot.size);

    const allHistory = allHistorySnapshot.docs.map(doc => doc.data());

    // Рассчитываем реальный баланс на основе истории
    const earnedTotal = allHistory
      .filter(item => item.type === 'earned')
      .reduce((sum, item) => sum + item.amount, 0);

    const spentTotal = allHistory
      .filter(item => item.type === 'spent')
      .reduce((sum, item) => sum + item.amount, 0);

    let calculatedBalance = earnedTotal - spentTotal;

    // Если история пустая, используем данные из заказов
    if (allHistory.length === 0 && calculatedBalanceFromOrders > 0) {
      console.log('🔥 История пустая, используем баланс из заказов:', calculatedBalanceFromOrders);
      calculatedBalance = calculatedBalanceFromOrders;
    }

    // Обновляем баланс в документе пользователя если он отличается
    const currentBalance = userData.bonusBalance || 0;
    if (currentBalance !== calculatedBalance) {
      console.log(`🔥 Обновляем баланс: ${currentBalance} -> ${calculatedBalance}`);
      await userRef.update({ bonusBalance: calculatedBalance });
      userData.bonusBalance = calculatedBalance;
    }

    // Вычисляем статистику за месяц
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthHistory = history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });

    const earnedThisMonth = thisMonthHistory
      .filter(item => item.type === 'earned')
      .reduce((sum, item) => sum + item.amount, 0);

    const spentThisMonth = thisMonthHistory
      .filter(item => item.type === 'spent')
      .reduce((sum, item) => sum + item.amount, 0);

    // Подготавливаем данные для ответа
    const bonusData = {
      balance: userData.bonusBalance || 0,
      level: levelInfo.level,
      nextLevel: levelInfo.next,
      ordersToNextLevel: levelInfo.spentToNext, // обратная совместимость
      spentToNextLevel: levelInfo.spentToNext,
      totalOrders,
      totalSpent,
      cashbackPercent,
      multiplier: cashbackPercent / 100, // обратная совместимость
      earnedThisMonth,
      spentThisMonth,
      history: history.map(item => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        description: item.description || `Заказ #${item.orderId || 'Unknown'}`,
        date: item.date
      }))
    };

    console.log('🔥 Возвращаем данные бонусов:', bonusData);
    res.status(200).json(bonusData);

  } catch (error) {
    console.error('Ошибка получения бонусных данных:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
}

module.exports = handleUserBonus;
