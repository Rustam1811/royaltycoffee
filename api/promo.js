const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const a = req.query?.action || 'promotions';
    const map = { promotions: 'promotions', achievements: 'achievements' };

    if (a in map && req.method === 'GET') {
      const userId = req.query?.userId || null;
      const key = a === 'promotions' ? 'promotions' : 'achievements';
      if (!db) return ok(res, { [key]: [], userId });
      const col = map[a];
      const snap = await db.collection(col).orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return ok(res, { [key]: items, userId });
    }

    if ((a === 'promotions-upsert' || a === 'achievements-upsert') && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const col = a.startsWith('promotions') ? 'promotions' : 'achievements';
      const { id, ...payload } = req.body || {};
      const now = new Date().toISOString();
      if (id) { await db.collection(col).doc(String(id)).set({ ...payload, updatedAt: now }, { merge: true }); return ok(res, { id }); }
      const ref = await db.collection(col).add({ ...payload, active: !!payload.active, createdAt: now });
      return ok(res, { id: ref.id });
    }

    if ((a === 'promotions-delete' || a === 'achievements-delete') && req.method === 'DELETE') {
      if (!db) return ok(res, { degraded: true });
      const col = a.startsWith('promotions') ? 'promotions' : 'achievements';
      const { id } = req.query || {};
      if (!id) return fail(res, 'id required', 400);
      await db.collection(col).doc(String(id)).delete();
      return ok(res, { id });
    }

    return fail(res, 'Invalid action/method', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
