const { initFirebaseAdmin } = require('../firebaseAdmin');

async function handleAchievements(req, res) {
  console.log('🏆 Achievements Handler:', { method: req.method, url: req.url });
  try {
    const { admin, db } = initFirebaseAdmin();
    const { id } = req.query || {};

    if (req.method === 'GET') {
      if (id) {
        const doc = await db.collection('achievements').doc(id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Not found' });
        return res.json({ achievement: { id: doc.id, ...doc.data() } });
      }
      const snap = await db.collection('achievements').orderBy('createdAt','desc').get();
      const achievements = snap.docs.map(d => {
        const data = d.data();
        const ts = f => data[f]?.toDate?.()?.toISOString() || null;
        return { id: d.id, ...data, createdAt: ts('createdAt') };
      });
      return res.json({ achievements });
    }

    if (req.method === 'POST') {
      const { title, description, points = 0, icon, criteria } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      const data = {
        title,
        description: description || '',
        points: Number(points) || 0,
        icon: icon || null,
        criteria: criteria || null,
        createdAt: admin.firestore.Timestamp.now()
      };
      const docRef = await db.collection('achievements').add(data);
      return res.json({ success: true, id: docRef.id, data });
    }

    if (req.method === 'PUT' && id) {
      const update = { ...req.body, updatedAt: admin.firestore.Timestamp.now() };
      delete update.id;
      await db.collection('achievements').doc(id).update(update);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE' && id) {
      await db.collection('achievements').doc(id).delete();
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('❌ Achievements handler error:', e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

module.exports = handleAchievements;
