const { initializeFirebase } = require("../config");
const admin = require("firebase-admin");

async function handleBonusSettings(req, res) {
  try {
    const db = initializeFirebase();

    if (req.method === "GET") {
      // Получение настроек бонусной системы
      const doc = await db.collection("settings").doc("bonus-system").get();

      if (doc.exists) {
        return res.status(200).json(doc.data());
      } else {
        // Настройки по умолчанию
        const defaultSettings = {
          baseRate: 5,
          multipliers: {
            morningBonus: 1.5,
            eveningBonus: 1.2,
            weekendBonus: 2.0,
            vipBonus: 1.5
          },
          categories: {
            'coffee': 1.0,
            'desserts': 1.2,
            'breakfast': 0.8,
            'special': 2.0
          },
          rewards: [
            {
              id: '1',
              name: 'Скидка 200₸',
              description: 'Скидка 200 тенге на любой заказ',
              cost: 100,
              discount: 200,
              type: 'fixed',
              isActive: true
            }
          ],
          levels: [
            {
              name: 'Новичок',
              minOrders: 0,
              bonusMultiplier: 1.0,
              benefits: ['Базовые бонусы']
            },
            {
              name: 'Любитель',
              minOrders: 10,
              bonusMultiplier: 1.2,
              benefits: ['+20% к бонусам', 'Персональные предложения']
            }
          ]
        };

        await db.collection("settings").doc("bonus-system").set(defaultSettings);
        return res.status(200).json(defaultSettings);
      }
    }

    if (req.method === "POST") {
      // Сохранение настроек бонусной системы
      const settings = req.body;

      await db.collection("settings").doc("bonus-system").set({
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({ success: true, message: 'Настройки сохранены' });
    }

    res.status(405).end();
  } catch (e) {
    console.error("🔥 Bonus Settings Error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = handleBonusSettings;
