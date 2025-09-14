// api-server/routes/bonus.js
const express = require('express');
const admin = require('firebase-admin');

const db = admin.firestore();
const router = express.Router();

router.all('*', async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query || {};
  try {
    switch (action) {
      case 'settings':
        return await handleBonusSettings(req, res);
      case 'use':
        return await useBonus(req, res);
      case 'user':
        return await getUserBonus(req, res);
      case 'test':
        return await testBonus(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    console.error('Bonus API error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleBonusSettings(req, res) {
  if (req.method === 'GET') {
    try {
      const doc = await db.collection('settings').doc('bonus').get();
      if (!doc.exists) {
        const defaults = { pointsPerRuble: 1, minOrderForBonus: 100, maxBonusPercentage: 50, bonusExpiryDays: 365 };
        await db.collection('settings').doc('bonus').set(defaults);
        return res.status(200).json(defaults);
      }
      return res.status(200).json(doc.data());
    } catch (e) {
      console.error('Get bonus settings error:', e);
      return res.status(500).json({ error: 'Failed to get bonus settings' });
    }
  }
  if (req.method === 'POST') {
    const { pointsPerRuble, minOrderForBonus, maxBonusPercentage, bonusExpiryDays } = req.body || {};
    try {
      const settings = {
        pointsPerRuble: pointsPerRuble || 1,
        minOrderForBonus: minOrderForBonus || 100,
        maxBonusPercentage: maxBonusPercentage || 50,
        bonusExpiryDays: bonusExpiryDays || 365,
        updatedAt: new Date().toISOString(),
      };
      await db.collection('settings').doc('bonus').set(settings);
      return res.status(200).json({ success: true, settings });
    } catch (e) {
      console.error('Update bonus settings error:', e);
      return res.status(500).json({ error: 'Failed to update bonus settings' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function useBonus(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, bonusAmount, orderId } = req.body || {};
  if (!userId || !bonusAmount || !orderId) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const userRef = db.collection('users').doc(String(userId));
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
    const userData = userSnap.data();
    const currentBonus = userData.bonusPoints || 0;
    if (currentBonus < bonusAmount) return res.status(400).json({ error: 'Insufficient bonus points' });
    const newBalance = currentBonus - bonusAmount;
    await userRef.update({ bonusPoints: newBalance, updatedAt: new Date().toISOString() });
    await db.collection('bonusTransactions').add({ userId, orderId, type: 'used', amount: -bonusAmount, balanceAfter: newBalance, createdAt: new Date().toISOString() });
    return res.status(200).json({ success: true, usedAmount: bonusAmount, remainingBonus: newBalance });
  } catch (e) {
    console.error('Use bonus error:', e);
    return res.status(500).json({ error: 'Failed to use bonus' });
  }
}

async function getUserBonus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.query || {};
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  try {
    const userSnap = await db.collection('users').doc(String(userId)).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
    const bonusPoints = userSnap.data().bonusPoints || 0;
    const txSnap = await db.collection('bonusTransactions').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(10).get();
    const transactions = [];
    txSnap.forEach(d => transactions.push({ id: d.id, ...d.data() }));
    return res.status(200).json({ bonusPoints, transactions });
  } catch (e) {
    console.error('Get user bonus error:', e);
    return res.status(500).json({ error: 'Failed to get user bonus' });
  }
}

async function testBonus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const id = 'test-user-' + Date.now();
    await db.collection('users').doc(id).set({ name: 'Test User', email: 'test@example.com', bonusPoints: 100, createdAt: new Date().toISOString() });
    await db.collection('bonusTransactions').add({ userId: id, type: 'earned', amount: 100, balanceAfter: 100, orderId: 'test-order-' + Date.now(), createdAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Test bonus data created', testUserId: id, testBonusPoints: 100 });
  } catch (e) {
    console.error('Test bonus error:', e);
    return res.status(500).json({ error: 'Failed to create test bonus data' });
  }
}

module.exports = router;
