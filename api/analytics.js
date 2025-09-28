const { withCors } = require('./_lib/cors');
const { getDb, requireAdminRole } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    const allowed = await requireAdminRole(req, res);
    if (allowed === false) return undefined;

    const range = typeof req.query?.range === 'string' ? req.query.range : '7d';
    const db = await getDb();

    if (!db) {
      return res.status(200).json({
        ok: true,
        range,
        summary: { orders: 0, revenue: 0 },
        mode: 'degraded',
      });
    }

    // TODO: replace with real analytics aggregation once Firestore is wired up.
    return res.status(200).json({
      ok: true,
      range,
      summary: { orders: 0, revenue: 0 },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
