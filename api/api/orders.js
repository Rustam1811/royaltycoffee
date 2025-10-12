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

/**
 * Получить следующий номер заказа (глобальный счетчик)
 */
async function getNextOrderNumber() {
  const counterRef = db.collection('_system').doc('orderCounter');
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      
      let nextNumber = 1;
      if (doc.exists) {
        nextNumber = (doc.data().lastOrderNumber || 0) + 1;
      }
      
      transaction.set(counterRef, { lastOrderNumber: nextNumber }, { merge: true });
      return nextNumber;
    });
    
    return result;
  } catch (error) {
    console.error('Error getting next order number:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const action = req.query?.action || 'get';
  console.log('Orders API - method:', req.method, 'action:', action);
  
  // GET - получить список заказов (поддержка action=get и action=list)
  if ((action === 'get' || action === 'list') && req.method === 'GET') {
    try {
      const { from, to } = req.query;
      
      console.log('📅 Orders API - Filtering params:', { from, to });
      
      let query = db.collection('orders').orderBy('createdAt', 'desc');
      
      // Применяем фильтрацию по датам, если параметры переданы
      if (from) {
        const fromDate = admin.firestore.Timestamp.fromDate(new Date(from));
        console.log('🔍 Filtering from:', fromDate.toDate());
        query = query.where('createdAt', '>=', fromDate);
      }
      
      if (to) {
        const toDate = admin.firestore.Timestamp.fromDate(new Date(to));
        console.log('🔍 Filtering to:', toDate.toDate());
        query = query.where('createdAt', '<=', toDate);
      }
      
      // Если дат нет, ограничиваем последними 100 заказами
      if (!from && !to) {
        query = query.limit(100);
      }
      
      const ordersSnapshot = await query.get();
      
      const orders = [];
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          // Добавляем amount как алиас для totalPrice (для совместимости)
          amount: data.totalPrice || data.amount || 0,
        });
      });
      
      console.log('📦 Orders API - Found orders:', orders.length);
      
      return res.status(200).json({ 
        ok: true, 
        orders,
        admin: true,
        count: orders.length,
        filtered: !!(from || to)
      });
    } catch (error) {
      console.error('Error getting orders:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
  
  // POST - создать новый заказ
  if (action === 'create' && req.method === 'POST') {
    try {
      const { items, total, userPhone, useBonuses } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ ok: false, error: 'Items are required' });
      }
      
      // Получаем следующий глобальный номер заказа
      const orderNumber = await getNextOrderNumber();
      
      // Ищем пользователя по номеру телефона (если указан)
      let userId = null;
      if (userPhone) {
        const usersSnapshot = await db.collection('users')
          .where('phone', '==', userPhone)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          userId = usersSnapshot.docs[0].id;
        }
      }
      
      // Создаем заказ
      const orderData = {
        orderNumber, // Глобальный номер заказа (например, 1, 2, 3...)
        items,
        total,
        userPhone: userPhone || null,
        userId: userId || null,
        useBonuses: useBonuses || false,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      const orderRef = await db.collection('orders').add(orderData);
      
      return res.status(201).json({
        ok: true,
        orderId: orderRef.id,
        orderNumber,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
  
  // POST - обновить статус заказа
  if (action === 'update' && req.method === 'POST') {
    try {
      const { orderId, status } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ ok: false, error: 'Order ID is required' });
      }
      
      if (!status) {
        return res.status(400).json({ ok: false, error: 'Status is required' });
      }
      
      // Проверяем, существует ли заказ
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // Обновляем статус заказа
      await orderRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return res.status(200).json({
        ok: true,
        orderId,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action. Use ?action=get, ?action=create, or ?action=update' });
};
