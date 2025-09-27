const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const { action = 'list' } = req.query || {};
    const db = await getDb();

    if (action === 'list') {
      if (!db) return ok(res, { items: [] });
      const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return ok(res, { items });
    }

    return fail(res, 'Invalid action', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
