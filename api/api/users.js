const admin = require('firebase-admin');

// Инициализация Firebase Admin (если еще не инициализирован)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.log('Firebase admin already initialized or error:', error.message);
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

  const action = req.query?.action || 'list';
  console.log('Users API - method:', req.method, 'action:', action);

  // GET - получить список пользователей
  if ((action === 'list' || action === 'get') && req.method === 'GET') {
    try {
      const usersSnapshot = await db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      
      const users = [];
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          ...data,
          isCloseFriend: data.isCloseFriend || false, // явно добавляем поле
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          lastOrderAt: data.lastOrderAt?.toDate?.()?.toISOString() || data.lastOrderAt
        });
      });
      
      console.log(`✅ Загружено ${users.length} пользователей`);
      
      return res.status(200).json({ 
        ok: true, 
        users
      });
    } catch (error) {
      console.error('Error getting users:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Неизвестный action
  return res.status(400).json({ 
    ok: false, 
    error: `Unknown action: ${action}` 
  });
};
