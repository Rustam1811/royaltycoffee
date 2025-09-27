const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const a = req.query?.action || 'get';

    if (a === 'get' && req.method === 'GET') {
      if (!db) return ok(res, { items: [] });
      const snap = await db.collection('stories').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return ok(res, { items });
    }

    if (a === 'create' && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const body = req.body || {};
      const now = new Date().toISOString();
      const ref = await db.collection('stories').add({ ...body, createdAt: now, updatedAt: now });
      return ok(res, { id: ref.id });
    }

    if (a === 'update' && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const { id, ...patch } = req.body || {};
      if (!id) return fail(res, 'id required', 400);
      await db.collection('stories').doc(String(id)).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
      return ok(res, { id });
    }

    if (a === 'delete' && req.method === 'DELETE') {
      if (!db) return ok(res, { degraded: true });
      const { id } = req.query || {};
      if (!id) return fail(res, 'id required', 400);
      await db.collection('stories').doc(String(id)).delete();
      return ok(res, { id });
    }

    if (a === 'clone' && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const { id } = req.body || {};
      if (!id) return fail(res, 'id required', 400);
      const src = await db.collection('stories').doc(String(id)).get();
      if (!src.exists) return fail(res, 'not found', 404);
      const o = src.data();
      const now = new Date().toISOString();
      const ref = await db.collection('stories').add({ ...o, title: `${o.title || 'Story'} (Copy)`, createdAt: now, updatedAt: now });
      return ok(res, { id: ref.id });
    }

    return fail(res, 'Invalid action/method', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
