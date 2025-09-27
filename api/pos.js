const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const a = req.query?.action || 'createOrder';

    if ((a === 'createOrder' || a === 'create') && req.method === 'POST') {
      if (!db) return ok(res, { orderId: null, degraded: true });
      const { items = [], userId = null, total = 0 } = req.body || {};
      const now = new Date().toISOString();
      const ref = await db.collection('orders').add({ items, userId, total: Number(total), status: 'new', createdAt: now, updatedAt: now });
      return ok(res, { orderId: ref.id });
    }

    if (a === 'pay' && req.method === 'POST') {
      if (!db) return ok(res, { degraded: true });
      const { orderId, method = 'card' } = req.body || {};
      if (!orderId) return fail(res, 'orderId required', 400);
      await db.collection('orders').doc(String(orderId)).set({ status: 'paid', paidMethod: method, updatedAt: new Date().toISOString() }, { merge: true });
      return ok(res, { orderId });
    }

    return fail(res, 'Invalid action/method', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
