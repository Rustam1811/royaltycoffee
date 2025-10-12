const admin = require('firebase-admin');

// Инициализация Firebase Admin если еще не инициализирован
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log('✅ Firebase Admin инициализирован (bonus.js)');
  } catch (error) {
    console.error('⚠️ Не удалось инициализировать Firebase Admin:', error.message);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const action = req.query?.action || 'settings';
  
  if (req.method === 'GET' && action === 'settings') {
    try {
      // Пытаемся загрузить настройки из Firestore
      const settingsDoc = await db.collection('bonusSettings').doc('default').get();
      
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        console.log('✅ Загружены настройки бонусов из Firestore');
        return res.status(200).json({
          ok: true,
          settings: settings
        });
      }
      
      // Если настроек нет - возвращаем дефолтные
      console.log('⚠️ Настройки бонусов не найдены, используем дефолтные');
      return res.status(200).json({
        ok: true,
        settings: {
          baseRate: 1,
          pointsPerRuble: 1,
          minOrderForBonus: 200,
          multipliers: {
            weekend: 2,
            morning: 1.5,
            vip: 3
          },
          categories: {
            coffee: { multiplier: 1.2, name: "Кофе" },
            desserts: { multiplier: 1.1, name: "Десерты" },
            breakfast: { multiplier: 1.3, name: "Завтраки" }
          },
          rewards: [
            { id: "coffee_free", points: 100, reward: "Бесплатный кофе", isActive: true },
            { id: "discount_10", points: 500, reward: "Скидка 10%", isActive: true },
            { id: "dessert_free", points: 1000, reward: "Бесплатный десерт", isActive: true }
          ],
          levels: [
            { level: 1, name: "Новичок", minPoints: 0, benefits: "Базовые бонусы" },
            { level: 2, name: "Любитель", minPoints: 500, benefits: "x1.2 бонусы" },
            { level: 3, name: "VIP", minPoints: 2000, benefits: "x2 бонусы + приоритет" }
          ]
        }
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек бонусов:', error);
      return res.status(500).json({ ok: false, error: 'Error loading bonus settings' });
    }
  }
  
  if (req.method === 'POST' && action === 'settings') {
    try {
      const settings = req.body;
      
      console.log('💾 Сохранение настроек бонусной системы:', settings);
      
      // Сохраняем настройки в Firestore
      await db.collection('bonusSettings').doc('default').set(settings, { merge: true });
      
      console.log('✅ Настройки бонусов успешно сохранены');
      return res.status(200).json({ ok: true, saved: true, message: 'Settings saved successfully' });
      
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек бонусов:', error);
      return res.status(500).json({ ok: false, error: 'Error saving bonus settings: ' + error.message });
    }
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action. Use ?action=settings' });
};
