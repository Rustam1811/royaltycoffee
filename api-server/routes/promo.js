// Unified Promo API (promo codes + promotions + achievements) CJS version for api-server
// This replaces the previous async dynamic import wrapper that broke Express mounting.

const express = require('express');
const admin = require('firebase-admin');

// Firebase Admin already initialized in server.js. We just reuse the instance.
const db = admin.firestore();

const router = express.Router();

// Single entrypoint: /api/promo?action=promotions|codes|achievements (+ id for PUT/DELETE where relevant)
router.all('*', async (req, res) => {
  // Basic headers (CORS handled globally, but we keep method headers for parity)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {
      case 'codes':
        return await handlePromoCodes(req, res);
      case 'promotions':
        return await handlePromotions(req, res);
      case 'achievements':
        return await handleAchievements(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('Promo API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function handlePromoCodes(req, res) {
  if (req.method === 'GET') {
    try {
      const snap = await db.collection('promoCodes').get();
      const now = new Date();
      const promoCodes = [];
      snap.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : null);
        // Only active & not expired (if expiresAt exists)
        if ((data.isActive ?? true) && (!expiresAt || expiresAt > now)) {
          promoCodes.push({ id: doc.id, ...data });
        }
      });
      return res.status(200).json({ promoCodes });
    } catch (e) {
      console.error('Get promo codes error:', e);
      return res.status(500).json({ error: 'Failed to get promo codes' });
    }
  }

  if (req.method === 'POST') {
    const { code, discount, type, minOrderAmount, maxUses, expiresAt } = req.body || {};
    if (!code || !discount || !type) return res.status(400).json({ error: 'Missing required fields' });

    try {
      const existing = await db.collection('promoCodes').where('code', '==', String(code).toUpperCase()).get();
      if (!existing.empty) return res.status(409).json({ error: 'Promo code already exists' });

      const promoData = {
        code: String(code).toUpperCase(),
        discount,
        type, // 'percentage' | 'fixed'
        minOrderAmount: minOrderAmount || 0,
        maxUses: maxUses || null,
        currentUses: 0,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date().toISOString(),
      };

      const ref = await db.collection('promoCodes').add(promoData);
      return res.status(201).json({ success: true, promoId: ref.id, promo: { id: ref.id, ...promoData } });
    } catch (e) {
      console.error('Create promo code error:', e);
      return res.status(500).json({ error: 'Failed to create promo code' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handlePromotions(req, res) {
  const coll = db.collection('promotions');

  if (req.method === 'GET') {
    try {
      const snap = await coll.get();
      const promotions = [];
      snap.forEach(doc => {
        const data = doc.data();
        const normalizeDate = v => v?.toDate?.() || (v ? new Date(v) : null);
        promotions.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          image: data.image || '',
          discountType: data.discountType || (typeof data.discount === 'number' ? 'fixed' : 'percentage'),
          discountValue: data.discountValue ?? (typeof data.discount === 'number' ? data.discount : 0),
          startDate: (normalizeDate(data.startDate) || new Date()).toISOString(),
          endDate: (normalizeDate(data.endDate) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
          category: data.category || 'all',
          minOrderAmount: data.minOrderAmount ?? 0,
          targetAudience: data.targetAudience || 'all_users',
          isActive: data.isActive ?? true,
          usageCount: data.usageCount ?? 0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      promotions.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
      return res.status(200).json({ promotions });
    } catch (e) {
      console.error('Get promotions error:', e);
      return res.status(500).json({ error: 'Failed to get promotions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        image = '',
        discountType = 'percentage',
        discountValue = 0,
        startDate,
        endDate,
        category = 'all',
        minOrderAmount = 0,
        targetAudience = 'all_users',
        isActive = true,
        discount, // legacy support
        conditions, // legacy support
      } = req.body || {};

      if (!title || !description) return res.status(400).json({ error: 'Missing required fields: title, description' });

      const toDate = (v, fallback) => (v ? new Date(v) : fallback);
      const docData = {
        title,
        description,
        image,
        discountType,
        discountValue: discountValue ?? (typeof discount === 'number' ? discount : 0),
        startDate: toDate(startDate, new Date()),
        endDate: toDate(endDate, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        category,
        minOrderAmount,
        targetAudience,
        isActive,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        ...(typeof discount === 'number' ? { discount } : {}),
        ...(conditions ? { conditions } : {}),
      };

      const ref = await coll.add(docData);
      return res.status(201).json({ success: true, promotionId: ref.id, promotion: { id: ref.id, ...docData } });
    } catch (e) {
      console.error('Create promotion error:', e);
      return res.status(500).json({ error: 'Failed to create promotion' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Promotion ID is required' });

      const { title, description, image, discountType, discountValue, startDate, endDate, category, minOrderAmount, targetAudience, isActive, discount, conditions } = req.body || {};

      const patch = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(category !== undefined && { category }),
        ...(minOrderAmount !== undefined && { minOrderAmount }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date().toISOString(),
        ...(discount !== undefined && { discount }),
        ...(conditions !== undefined && { conditions }),
      };

      await coll.doc(String(id)).update(patch);
      return res.status(200).json({ success: true, message: 'Promotion updated successfully' });
    } catch (e) {
      console.error('Update promotion error:', e);
      return res.status(500).json({ error: 'Failed to update promotion' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Promotion ID is required' });
      await coll.doc(String(id)).delete();
      return res.status(200).json({ success: true, message: 'Promotion deleted successfully' });
    } catch (e) {
      console.error('Delete promotion error:', e);
      return res.status(500).json({ error: 'Failed to delete promotion' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAchievements(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query || {};
    if (!userId) {
      try {
        const snap = await db.collection('achievements').get();
        const achievements = [];
        snap.forEach(doc => achievements.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ achievements });
      } catch (e) {
        console.error('Get achievements error:', e);
        return res.status(500).json({ error: 'Failed to get achievements' });
      }
    } else {
      try {
        const snap = await db.collection('userAchievements').where('userId', '==', userId).get();
        const userAchievements = [];
        snap.forEach(doc => userAchievements.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ userAchievements });
      } catch (e) {
        console.error('Get user achievements error:', e);
        return res.status(500).json({ error: 'Failed to get user achievements' });
      }
    }
  }

  if (req.method === 'POST') {
    const { name, description, condition, reward, icon } = req.body || {};
    if (!name || !description || !condition) return res.status(400).json({ error: 'Missing required fields' });
    try {
      const data = {
        name,
        description,
        condition,
        reward: reward || 0,
        icon: icon || '🏆',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const ref = await db.collection('achievements').add(data);
      return res.status(201).json({ success: true, achievementId: ref.id, achievement: { id: ref.id, ...data } });
    } catch (e) {
      console.error('Create achievement error:', e);
      return res.status(500).json({ error: 'Failed to create achievement' });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'Achievement ID is required' });
    const { name, description, condition, reward, icon, isActive } = req.body || {};
    try {
      const patch = {
        ...(name && { name }),
        ...(description && { description }),
        ...(condition && { condition }),
        ...(reward !== undefined && { reward }),
        ...(icon && { icon }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('achievements').doc(String(id)).update(patch);
      return res.status(200).json({ success: true, message: 'Achievement updated successfully' });
    } catch (e) {
      console.error('Update achievement error:', e);
      return res.status(500).json({ error: 'Failed to update achievement' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'Achievement ID is required' });
    try {
      await db.collection('achievements').doc(String(id)).delete();
      return res.status(200).json({ success: true, message: 'Achievement deleted successfully' });
    } catch (e) {
      console.error('Delete achievement error:', e);
      return res.status(500).json({ error: 'Failed to delete achievement' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

module.exports = router;
