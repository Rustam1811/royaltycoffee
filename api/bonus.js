// Объединенный API для бонусов: bonus-settings + use-bonus + user-bonus + test-bонус
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import { applyCors } from './_lib/cors.js';

// Инициализация Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

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
  } catch (error) {
    console.error('Bonus API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleBonusSettings(req, res) {
  if (req.method === 'GET') {
    try {
      const settingsDoc = await db.collection('settings').doc('bonus').get();
      if (!settingsDoc.exists) {
        const defaultSettings = { pointsPerRuble: 1, minOrderForBonus: 100, maxBonusPercentage: 50, bonusExpiryDays: 365 };
        await db.collection('settings').doc('bonus').set(defaultSettings);
        return res.status(200).json(defaultSettings);
      }
      return res.status(200).json(settingsDoc.data());
    } catch (error) {
      console.error('Get bonus settings error:', error);
      return res.status(500).json({ error: 'Failed to get bonus settings' });
    }
  }
  
  if (req.method === 'POST') {
    // Обновление настроек
    const { pointsPerRuble, minOrderForBonus, maxBonusPercentage, bonusExpiryDays } = req.body || {};
    try {
      await db.collection('settings').doc('bonus').set({ pointsPerRuble, minOrderForBonus, maxBonusPercentage, bonusExpiryDays }, { merge: true });
      return res.status(200).json({ success: true, message: 'Bonus settings updated' });
    } catch (error) {
      console.error('Update bonus settings error:', error);
      return res.status(500).json({ error: 'Failed to update bonus settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function useBonus(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, orderId, pointsToUse } = req.body || {};
  if (!userId || !orderId || !pointsToUse) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const points = (userDoc.data()?.bonusPoints || 0) - pointsToUse;
    if (points < 0) return res.status(400).json({ error: 'Insufficient bonus points' });
    await userRef.set({ bonusPoints: points }, { merge: true });
    await db.collection('bonusTransactions').add({ userId, orderId, points: -pointsToUse, type: 'use', date: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Bonus points used successfully' });
  } catch (error) {
    console.error('Use bonus error:', error);
    return res.status(500).json({ error: 'Failed to use bonus points' });
  }
}

async function getUserBonus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const userDoc = await db.collection('users').doc(String(userId)).get();
    const bonusPoints = userDoc.exists ? (userDoc.data()?.bonusPoints || 0) : 0;
    return res.status(200).json({ userId, bonusPoints });
  } catch (error) {
    console.error('Get user bonus error:', error);
    return res.status(500).json({ error: 'Failed to get user bonus' });
  }
}

async function testBonus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    return res.status(200).json({ success: true, message: 'Bonus API is working' });
  } catch (error) {
    console.error('Test bonus error:', error);
    return res.status(500).json({ error: 'Failed to test bonus API' });
  }
}
