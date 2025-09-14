// Объединенный API для промо: promo-codes + promotions + achievements
  import { initializeApp, getApps } from 'firebase-admin/app';
  import { getFirestore } from 'firebase-admin/firestore';
  import { credential } from 'firebase-admin';
  import { applyCors } from './_lib/cors.js';

  // Инициализация Firebase Admin с fallback на BASE64 ключ
  if (!getApps().length) {
    const b64 = process.env.FIREBASE_KEY_BASE64;
    if (b64) {
      try {
        const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        initializeApp({
          credential: credential.cert(serviceAccount)
        });
      } catch (e) {
        console.error('Failed to init Firebase Admin from FIREBASE_KEY_BASE64:', e);
        initializeApp({
          credential: credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      }
    } else {
      initializeApp({
        credential: credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
    }
  }

  const db = getFirestore();

  export default async function handler(req, res) {
    if (applyCors(req, res)) return;

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
    } catch (error) {
      console.error('Promo API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async function handlePromoCodes(req, res) {
    if (req.method === 'GET') {
      try {
        // Упрощаем запрос, чтобы избежать ошибок индекса в Firestore в dev
        const snap = await db.collection('promoCodes').get();
        const now = new Date();
        const promoCodes = [];
        snap.forEach(doc => {
          const data = doc.data();
          // normalize expiresAt (could be Timestamp or string/date)
          const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt || 0);
          if ((data.isActive ?? true) && expiresAt > now) {
            promoCodes.push({ id: doc.id, ...data });
          }
        });
        return res.status(200).json({ promoCodes });
      } catch (error) {
        console.error('Get promo codes error:', error);
        return res.status(500).json({ error: 'Failed to get promo codes' });
      }
    }

    if (req.method === 'POST') {
      const { code, discount, type, minOrderAmount, maxUses, expiresAt } = req.body || {};

      if (!code || !discount || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        const existingPromo = await db.collection('promoCodes')
          .where('code', '==', code.toUpperCase())
          .get();

        if (!existingPromo.empty) {
          return res.status(409).json({ error: 'Promo code already exists' });
        }

        const promoData = {
          code: code.toUpperCase(),
          discount,
          type,
          minOrderAmount: minOrderAmount || 0,
          maxUses: maxUses || null,
          currentUses: 0,
          isActive: true,
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date().toISOString()
        };

        const promoRef = await db.collection('promoCodes').add(promoData);

        return res.status(201).json({
          success: true,
          promoId: promoRef.id,
          promo: { id: promoRef.id, ...promoData }
        });
      } catch (error) {
        console.error('Create promo code error:', error);
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
        const normalizeDate = (v) => v?.toDate?.() || (v ? new Date(v) : null);
        promotions.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          image: data.image || '',
          discountType: data.discountType || (typeof data.discount === 'number' ? 'fixed' : 'percentage'),
          discountValue: data.discountValue ?? (typeof data.discount === 'number' ? data.discount : 0),
          startDate: (normalizeDate(data.startDate) || new Date()).toISOString(),
          endDate: (normalizeDate(data.endDate) || new Date(Date.now() + 7*24*60*60*1000)).toISOString(),
          category: data.category || 'all',
          minOrderAmount: data.minOrderAmount ?? 0,
          targetAudience: data.targetAudience || 'all_users',
          isActive: data.isActive ?? true,
          usageCount: data.usageCount ?? 0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      promotions.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      return res.status(200).json({ promotions });
    } catch (e) {
      console.error('Get promotions error:', e);
      return res.status(500).json({ error: 'Failed to get promotions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title, description, image = '', discountType = 'percentage', discountValue = 0,
        startDate, endDate, category = 'all', minOrderAmount = 0, targetAudience = 'all_users', isActive = true,
        discount, conditions,
      } = req.body || {};

      if (!title || !description) {
        return res.status(400).json({ error: 'Missing required fields: title, description' });
      }

      const toDate = (v, fallback) => v ? new Date(v) : fallback;

      const docData = {
        title, description, image, discountType,
        discountValue: discountValue ?? (typeof discount === 'number' ? discount : 0),
        startDate: toDate(startDate, new Date()),
        endDate: toDate(endDate, new Date(Date.now() + 7*24*60*60*1000)),
        category, minOrderAmount, targetAudience, isActive,
        usageCount: 0, createdAt: new Date().toISOString(),
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

// achievements handler kept from previous file
async function handleAchievements(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const coll = db.collection('userAchievements');
    const snap = await coll.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const userAchievements = [];
    snap.forEach(doc => userAchievements.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ userAchievements });
  } catch (e) {
    console.error('Get achievements error:', e);
    return res.status(500).json({ error: 'Failed to get achievements' });
  }
}
