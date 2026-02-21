const { initFirebaseAdmin } = require('../firebaseAdmin');
const testOrders = require('../data/test-orders');

async function handleOrders(req, res) {
  try {
    const { admin, db } = initFirebaseAdmin();

    if (req.method === "GET") {
      const { userId, admin: isAdmin } = req.query;

      if (isAdmin) {
        // Админ панель - получаем все заказы
        const snap = await db
          .collection("orders")
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();

        const orders = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            userId: d.userId,
            items: d.items,
            amount: d.amount,
            bonusUsed: d.bonusUsed || 0,
            status: d.status || 'pending',
            date: d.createdAt?.toDate().toISOString(),
            createdAt: d.createdAt?.toDate()
          };
        });

        // Добавляем тестовые заказы для демо
        const allOrders = [...orders, ...testOrders.map(order => ({
          ...order,
          amount: order.totalAmount,
          date: order.createdAt.toISOString()
        }))];

        return res.status(200).json({ orders: allOrders });
      } else {
        // Пользователь - только его заказы
        if (!userId) return res.status(400).json({ error: "userId required" });
        const snap = await db
          .collection("orders")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();

        const orders = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            items: d.items,
            amount: d.amount,
            bonusEarned: d.bonusEarned,
            status: d.status || 'pending',
            date: d.createdAt?.toDate().toISOString()
          };
        });
        return res.status(200).json(orders);
      }
    }

    if (req.method === "POST") {
      const { userId, items, amount, bonusUsed = 0 } = req.body;
      console.log('🔥 POST /api/orders - Получен заказ:', { userId, items, amount, bonusUsed });

      if (!userId || !Array.isArray(items) || typeof amount !== "number") {
        console.log('🔥 Ошибка валидации данных');
        return res.status(400).json({ error: "Invalid body" });
      }

      // Получаем настройки бонусной системы и данные пользователя
      const bonusSettingsDoc = await db.collection('settings').doc('bonusSettings').get();
      let bonusSettings = {
        basePercentage: 5,
        levelCashback: {
          'Бронза': 5,
          'Серебро': 10,
          'Золото': 15,
          'Платинум': 20
        }
      };

      if (bonusSettingsDoc.exists) {
        const settings = bonusSettingsDoc.data();
        bonusSettings = { ...bonusSettings, ...settings };
      }

      // Получаем уровень пользователя
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      let userData = { bonusBalance: 0, totalOrders: 0 };
      if (userDoc.exists) {
        userData = { ...userData, ...userDoc.data() };
      }

      // Подсчитываем количество заказов и общую сумму для определения уровня
      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .get();
      const totalOrders = ordersSnapshot.size + 1; // +1 для текущего заказа
      let totalSpent = amount; // текущий заказ
      ordersSnapshot.docs.forEach(d => {
        const o = d.data();
        totalSpent += (o.amount || o.totalAmount || 0);
      });

      // Определяем уровень по сумме потраченных ₸
      let level = 'Бронза';
      if (totalSpent >= 25000) level = 'Платинум';
      else if (totalSpent >= 15000) level = 'Золото';
      else if (totalSpent >= 5000) level = 'Серебро';

      const cashbackPercent = bonusSettings.levelCashback[level] || 5;
      const bonusEarned = Math.floor(amount * (cashbackPercent / 100));

      console.log('🔥 Расчет бонусов:', { level, cashbackPercent, amount, bonusEarned });

      // Начинаем транзакцию
      await db.runTransaction(async (transaction) => {
        // 1) Создаём заказ
        const orderRef = db.collection("orders").doc();
        transaction.set(orderRef, {
          userId,
          items,
          amount,
          bonusUsed,
          bonusEarned,
          status: 'pending',
          createdAt: admin.firestore.Timestamp.now(),
        });

        // 2) Обновляем баланс пользователя
        const newBalance = (userData.bonusBalance || 0) + bonusEarned - bonusUsed;
        transaction.set(userRef, {
          bonusBalance: newBalance,
          totalOrders: totalOrders,
          level: level,
          lastOrderAt: admin.firestore.Timestamp.now()
        }, { merge: true });

        // 3) Записываем в историю бонусов - заработано
        if (bonusEarned > 0) {
          const earnedHistoryRef = db.collection('bonusHistory').doc();
          transaction.set(earnedHistoryRef, {
            userId: userId,
            type: 'earned',
            amount: bonusEarned,
            description: `Заказ #${orderRef.id.slice(-6)}`,
            date: new Date().toISOString(),
            orderId: orderRef.id,
            multiplier: multiplier,
            level: level
          });
        }

        // 4) Записываем в историю бонусов - потрачено
        if (bonusUsed > 0) {
          const spentHistoryRef = db.collection('bonusHistory').doc();
          transaction.set(spentHistoryRef, {
            userId: userId,
            type: 'spent',
            amount: bonusUsed,
            description: `Оплата заказа #${orderRef.id.slice(-6)}`,
            date: new Date().toISOString(),
            orderId: orderRef.id
          });
        }
      });

      console.log('🔥 Заказ успешно обработан, возвращаем результат');

      return res.status(200).json({
        success: true,
        bonusEarned,
        multiplier,
        level,
        message: `Заказ оформлен! Начислено ${bonusEarned} бонусов (x${multiplier})`
      });
    }

    if (req.method === "PUT") {
      // Обновление статуса заказа (для админки)
      const { orderId, status } = req.body;

      if (!orderId || !status) {
        return res.status(400).json({ error: 'orderId and status required' });
      }

      const validStatuses = ['pending', 'accepted', 'ready', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Получаем текущий заказ
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderData = orderDoc.data();
      console.log('🔥 Обновление статуса заказа:', orderId, 'с', orderData.status, 'на', status);

      // Если заказ переводится в completed и ранее не был completed
      if (status === 'completed' && orderData.status !== 'completed') {
        console.log('🔥 Заказ завершен, начисляем бонусы');

        // Получаем настройки бонусов
        const bonusSettingsSnap = await db.collection('bonusSettings').doc('main').get();
        const bonusSettings = bonusSettingsSnap.exists ? bonusSettingsSnap.data() : { basePercentage: 5 };

        // Получаем данные пользователя для расчета уровня
        const userRef = db.collection('users').doc(orderData.userId);
        const userDoc = await userRef.get();
        let userData = userDoc.exists ? userDoc.data() : { bonusBalance: 0 };

        // Получаем заказы пользователя и подсчитываем общую сумму для определения уровня
        const userOrdersSnap = await db.collection('orders')
          .where('userId', '==', orderData.userId)
          .get();

        let totalSpentByUser = 0;
        userOrdersSnap.docs.forEach(d => {
          const o = d.data();
          totalSpentByUser += (o.amount || o.totalAmount || 0);
        });

        // Определяем уровень по сумме потраченных ₸ и кешбэк
        let level = 'Бронза';
        let cashbackPercent = 5;

        if (totalSpentByUser >= 25000) {
          level = 'Платинум';
          cashbackPercent = 20;
        } else if (totalSpentByUser >= 15000) {
          level = 'Золото';
          cashbackPercent = 15;
        } else if (totalSpentByUser >= 5000) {
          level = 'Серебро';
          cashbackPercent = 10;
        }

        // Рассчитываем бонусы (если еще не были рассчитаны)
        let bonusEarned = orderData.bonusEarned || 0;

        if (bonusEarned === 0) {
          bonusEarned = Math.floor(orderData.amount * (cashbackPercent / 100));
          console.log('🔥 Расчет новых бонусов:', { level, cashbackPercent, amount: orderData.amount, bonusEarned });
        } else {
          console.log('🔥 Бонусы уже рассчитаны:', bonusEarned);
        }

        // Обновляем баланс пользователя
        const newBalance = (userData.bonusBalance || 0) + bonusEarned;
        await userRef.update({ bonusBalance: newBalance });

        // Добавляем запись в историю бонусов
        if (bonusEarned > 0) {
          const earnedHistoryRef = db.collection('bonusHistory').doc();
          await earnedHistoryRef.set({
            userId: orderData.userId,
            type: 'earned',
            amount: bonusEarned,
            description: `Заказ #${orderId} завершен`,
            orderId: orderId,
            date: new Date().toISOString()
          });
        }

        // Обновляем заказ с начисленными бонусами
        await orderRef.update({
          status,
          bonusEarned,
          updatedAt: admin.firestore.Timestamp.now()
        });

        console.log('🔥 Бонусы начислены:', bonusEarned, 'новый баланс:', newBalance);

        return res.status(200).json({
          success: true,
          message: `Order completed! Earned ${bonusEarned} bonus points`,
          orderId,
          status,
          bonusEarned,
          newBalance
        });
      } else {
        // Обычное обновление статуса
        await orderRef.update({
          status,
          updatedAt: admin.firestore.Timestamp.now()
        });

        return res.status(200).json({
          success: true,
          message: 'Order status updated',
          orderId,
          status
        });
      }
    }

    res.status(405).end();
  } catch (e) {
    console.error("🔥 Orders Error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = handleOrders;
