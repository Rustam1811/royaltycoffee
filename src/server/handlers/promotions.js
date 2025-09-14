const { initFirebaseAdmin } = require('../firebaseAdmin');

async function handlePromotions(req, res) {
  console.log('🎯 Promotions Handler:', { method: req.method, url: req.url });
  try {
    const { admin, db } = initFirebaseAdmin();
    const { id, userId } = req.query || {};

    if (req.method === 'GET') {
      const now = admin.firestore.Timestamp.now();
      let query = db.collection('promotions');
      const snapshot = await query.get();
      let promotions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (userId) {
        // Placeholder: determine loyalty by querying orders count
        let isLoyal = false;
        try {
          const ordersSnap = await db.collection('orders').where('userId','==', userId).limit(10).get();
            isLoyal = ordersSnap.size >= 5; // simplistic threshold
        } catch (err) {
          console.warn('Orders fetch failed for loyalty check:', err.message);
        }
        promotions = promotions.filter(p => p.targetAudience === 'all_users' || (p.targetAudience === 'loyal_customers' && isLoyal));
      }

      promotions = promotions.filter(p => {
        try {
          const starts = p.startDate?.toDate?.() || new Date(p.startDate);
          const ends = p.endDate?.toDate?.() || new Date(p.endDate);
          return (!starts || starts <= new Date()) && (!ends || ends >= new Date());
        } catch { return true; }
      });
      return res.json({ promotions });
    }

    if (req.method === 'POST') {
      const { title, description, discountType, discountValue, startDate, endDate, targetAudience = 'all_users' } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      const data = {
        title,
        description: description || '',
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue) || 0,
        startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : null,
        endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : null,
        targetAudience,
        createdAt: admin.firestore.Timestamp.now()
      };
      const docRef = await db.collection('promotions').add(data);
      return res.json({ success: true, id: docRef.id, data });
    }

    if (req.method === 'PUT' && id) {
      const update = { ...req.body, updatedAt: admin.firestore.Timestamp.now() };
      if (update.startDate) update.startDate = admin.firestore.Timestamp.fromDate(new Date(update.startDate));
      if (update.endDate) update.endDate = admin.firestore.Timestamp.fromDate(new Date(update.endDate));
      delete update.id;
      await db.collection('promotions').doc(id).update(update);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE' && id) {
      await db.collection('promotions').doc(id).delete();
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('❌ Promotions handler error:', e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

module.exports = handlePromotions;
