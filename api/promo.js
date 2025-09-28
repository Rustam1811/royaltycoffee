const { withCors } = require('./_lib/cors');
const { getDb, requireAdminRole } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    const allowed = await requireAdminRole(req, res);
    if (allowed === false) return undefined;

    const action = typeof req.query?.action === 'string' ? req.query.action : '';
    const db = await getDb();

    if (req.method === 'GET' && action === 'achievements') {
      if (!db) {
        return res.status(200).json({ ok: true, achievements: [], mode: 'degraded' });
      }
      return res.status(200).json({ ok: true, achievements: [] });
    }

    if (req.method === 'GET' && action === 'promotions') {
      if (!db) {
        return res.status(200).json({ ok: true, promotions: [], mode: 'degraded' });
      }
      return res.status(200).json({ ok: true, promotions: [] });
    }

    return res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
