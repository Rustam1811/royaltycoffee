const { withCors } = require('./_lib/cors');
const { getDb, requireAdminRole } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    const allowed = await requireAdminRole(req, res);
    if (allowed === false) return undefined;

    const action = typeof req.query?.action === 'string' ? req.query.action : 'get';
    if (action !== 'get') {
      return res.status(400).json({ ok: false, error: 'Invalid action' });
    }

    const db = await getDb();
    if (!db) {
      return res.status(200).json({ ok: true, orders: [], admin: true, mode: 'degraded' });
    }

    // TODO: replace placeholder data with Firestore query results.
    return res.status(200).json({ ok: true, orders: [], admin: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
