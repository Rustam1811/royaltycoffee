const { initFirebaseAdmin } = require('../firebaseAdmin');

// Функция для расчета уровня пользователя
const calculateUserLevel = (totalOrders) => {
  if (totalOrders >= 100) return { level: 'VIP', next: null, ordersToNext: 0 };
  if (totalOrders >= 50) return { level: 'Эксперт', next: 'VIP', ordersToNext: 100 - totalOrders };
  if (totalOrders >= 10) return { level: 'Любитель', next: 'Эксперт', ordersToNext: 50 - totalOrders };
  return { level: 'Новичок', next: 'Любитель', ordersToNext: 10 - totalOrders };
};

// Функция для расчета множителя бонусов
const getMultiplier = (level) => {
  const multipliers = {
    'Новичок': 1.0,
    'Любитель': 1.2,
    'Эксперт': 1.5,
    'VIP': 2.0
  };
  return multipliers[level] || 1.0;
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
    const levelInfo = calculateUserLevel(totalOrders);
    const multiplier = getMultiplier(levelInfo.level);

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
      ordersToNextLevel: levelInfo.ordersToNext,
      totalOrders,
      multiplier,
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
