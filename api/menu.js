const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const { action = 'list' } = req.query || {};

    if (action === 'list') {
      if (!db) return ok(res, { items: [] });
      const snap = await db.collection('menuItems').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return ok(res, { items });
    }

    if (action === 'upsert' && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const { id, ...payload } = req.body || {};
      const col = db.collection('menuItems');
      const now = new Date().toISOString();
      if (id) {
        await col.doc(String(id)).set({ ...payload, updatedAt: now }, { merge: true });
        return ok(res, { id });
      }
      const ref = await col.add({ ...payload, active: !!payload.active, createdAt: now });
      return ok(res, { id: ref.id });
    }

    if (action === 'delete' && req.method === 'DELETE') {
      if (!db) return ok(res, { degraded: true });
      const { id } = req.query || {};
      if (!id) return fail(res, 'id required', 400);
      await db.collection('menuItems').doc(String(id)).delete();
      return ok(res, { id });
    }

    return fail(res, 'Invalid action/method', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
