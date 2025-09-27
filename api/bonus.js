const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole } = require('./_lib/admin');

function toSettings(raw) {
  const points = typeof raw?.pointsPerRuble === 'number' ? raw.pointsPerRuble
    : (typeof raw?.percentage === 'number' ? raw.percentage : 1);
  const base = typeof raw?.percentage === 'number' ? raw.percentage : points;
  return {
    pointsPerRuble: points,
    percentage: base,
    multipliers: raw?.multipliers || {},
    categories: raw?.categories || {},
    rewards: Array.isArray(raw?.rewards) ? raw.rewards : [],
    levels: Array.isArray(raw?.levels) ? raw.levels : [],
  };
}

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const { action } = req.query || {};

    if (action === 'settings') {
      if (req.method === 'POST') {
        const body = req.body || {};
        if (!db) {
          const merged = toSettings(body);
          return ok(res, { settings: merged });
        }
        const ref = db.collection('settings').doc('bonus');
        const snap = await ref.get();
        const prev = snap.exists ? snap.data() : {};
        const mergedRaw = { ...prev, ...body, updatedAt: new Date().toISOString() };
        await ref.set(mergedRaw, { merge: true });
        const merged = toSettings(mergedRaw);
        return ok(res, { settings: merged });
      }
      // GET
      if (!db) {
        return ok(res, { settings: toSettings({ pointsPerRuble: 1, percentage: 1 }) });
      }
      const ref = db.collection('settings').doc('bonus');
      const snap = await ref.get();
      const raw = snap.exists ? snap.data() : { pointsPerRuble: 1, percentage: 1 };
      return ok(res, { settings: toSettings(raw) });
    }

    if (action === 'user') {
      const { userId } = req.query || {};
      if (!userId) return fail(res, 'Missing userId', 400);
      if (!db) return ok(res, { userId, bonusPoints: 0 });
      const u = await db.collection('users').doc(String(userId)).get();
      const bonusPoints = u.exists ? (u.data().bonusPoints || 0) : 0;
      return ok(res, { userId, bonusPoints });
    }

    if (action === 'use' && req.method === 'POST') {
      const { userId, orderId, pointsToUse } = req.body || {};
      if (!userId || !orderId || !pointsToUse) return fail(res, 'Missing fields', 400);
      if (!db) return ok(res, { success: true });
      const ref = db.collection('users').doc(String(userId));
      const doc = await ref.get();
      const current = doc.exists ? (doc.data().bonusPoints || 0) : 0;
      if (current < pointsToUse) return fail(res, 'Insufficient bonus points', 400);
      await ref.set({ bonusPoints: current - pointsToUse }, { merge: true });
      await db.collection('bonusTransactions').add({ userId, orderId, amount: -pointsToUse, type: 'use', createdAt: new Date().toISOString() });
      return ok(res, { success: true });
    }

    return fail(res, 'Invalid action', 400);
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
