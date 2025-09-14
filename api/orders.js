// Объединенный API для заказов в формате Vercel serverless
import { applyCors } from './_lib/cors.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const b64 = process.env.FIREBASE_KEY_BASE64;
  if (b64) {
    const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { action } = req.query;

  try {
    switch (action) {
      case 'get':
        return await getOrders(req, res);
      case 'place':
        return await placeOrder(req, res);
      case 'simple':
        return await placeSimpleOrder(req, res);
      case 'test':
        return await testOrders(req, res);
      case 'update':
        return await updateOrderStatus(req, res);
      default:
        return await getOrders(req, res);
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOrders(req, res) {
  try {
    const { userId, admin: isAdmin } = req.query;

    if (isAdmin) {
      let snap;
      try {
        snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
      } catch (e) {
        console.warn('orders.get fallback orderBy(createdAt):', e && e.message ? e.message : e);
        snap = await db.collection('orders').limit(100).get();
      }

      const toTs = (v) => {
        if (!v) return 0;
        if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
        if (typeof v === 'number') return v;
        if (typeof v === 'object') {
          if ('seconds' in v && typeof v.seconds === 'number') return v.seconds * 1000;
          if ('_seconds' in v && typeof v._seconds === 'number') return v._seconds * 1000;
        }
        return 0;
      };

      let orders = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d.userId,
          items: d.items || [],
          amount: d.amount || d.totalAmount || 0,
          status: d.status || 'pending',
          customerInfo: d.customerInfo || {},
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        };
      });

      try { orders.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt)); } catch {}

      return res.status(200).json({ orders });
    } else if (userId) {
      // Try with orderBy first, then fallback without it to avoid composite index requirement
      try {
        const snap = await db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get();
        const orders = snap.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, items: d.items || [], amount: d.amount || d.totalAmount || 0, status: d.status || 'pending', createdAt: d.createdAt };
        });
        return res.status(200).json(orders);
      } catch (e) {
        console.warn('orders.get(user) fallback without orderBy(createdAt):', e && e.message ? e.message : e);
        const snap = await db.collection('orders').where('userId', '==', userId).limit(50).get();
        const toTs = (v) => {
          if (!v) return 0;
          if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
          if (typeof v === 'number') return v;
          if (typeof v === 'object') {
            if ('seconds' in v && typeof v.seconds === 'number') return v.seconds * 1000;
            if ('_seconds' in v && typeof v._seconds === 'number') return v._seconds * 1000;
          }
          return 0;
        };
        const orders = snap.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, items: d.items || [], amount: d.amount || d.totalAmount || 0, status: d.status || 'pending', createdAt: d.createdAt };
        }).sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));
        return res.status(200).json(orders);
      }
    } else {
      return res.status(400).json({ error: 'userId or admin=true required' });
    }
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Failed to get orders' });
  }
}

async function placeOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body && Object.keys(req.body).length) ? req.body : await readJson(req);
  const { userId, items, customerInfo, paymentMethod } = body || {};
  const amt = Number(body?.totalAmount ?? body?.amount);
  if (!Array.isArray(items) || items.length === 0 || !amt) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const orderData = {
      userId: userId || null,
      items,
      totalAmount: amt,
      amount: amt,
      customerInfo: customerInfo || {},
      paymentMethod: paymentMethod || 'cash',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const orderRef = await db.collection('orders').add(orderData);
    return res.status(201).json({ success: true, orderId: orderRef.id, order: { id: orderRef.id, ...orderData } });
  } catch (error) {
    console.error('Place order error:', error);
    return res.status(500).json({ error: 'Failed to place order' });
  }
}

async function placeSimpleOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body && Object.keys(req.body).length) ? req.body : await readJson(req);
  const { name, phone, items, totalAmount } = body || {};
  if (!name || !phone || !items || items.length === 0 || !totalAmount) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const orderData = { customerInfo: { name, phone }, items, totalAmount, amount: totalAmount, status: 'pending', type: 'simple', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const orderRef = await db.collection('orders').add(orderData);
    return res.status(201).json({ success: true, orderId: orderRef.id, message: 'Order placed successfully' });
  } catch (error) {
    console.error('Simple order error:', error);
    return res.status(500).json({ error: 'Failed to place simple order' });
  }
}

async function updateOrderStatus(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body && Object.keys(req.body).length) ? req.body : await readJson(req);
  const { orderId, status } = body || {};
  if (!orderId || !status) return res.status(400).json({ error: 'Missing orderId or status' });
  try {
    await db.collection('orders').doc(orderId).update({ status, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
}

async function testOrders(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const testOrder = { customerInfo: { name: 'Test User', phone: '+1234567890' }, items: [{ id: '1', name: 'Test Coffee', price: 5.99, quantity: 2 }], totalAmount: 11.98, amount: 11.98, status: 'test', type: 'test', createdAt: new Date().toISOString() };
    const orderRef = await db.collection('orders').add(testOrder);
    return res.status(200).json({ success: true, message: 'Test order created successfully', orderId: orderRef.id, testOrder: { id: orderRef.id, ...testOrder } });
  } catch (error) {
    console.error('Test orders error:', error);
    return res.status(500).json({ error: 'Failed to create test order' });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
