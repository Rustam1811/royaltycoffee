const { withCors } = require('./_lib/cors');
const { getDb, requireAdminRole } = require('./_lib/admin');

const DEFAULT_SETTINGS = {
  baseRate: 0,
  pointsPerRuble: 0,
  percentage: 0,
  multipliers: {},
  categories: {},
  rewards: [],
  levels: [],
};

module.exports = withCors(async (req, res) => {
  try {
    const allowed = await requireAdminRole(req, res);
    if (allowed === false) return undefined;

    const action = typeof req.query?.action === 'string' ? req.query.action : 'settings';

    if (req.method === 'GET' && action === 'settings') {
      const db = await getDb();
      if (!db) {
        return res.status(200).json({
          ok: true,
          settings: DEFAULT_SETTINGS,
          mode: 'degraded',
        });
      }

      // TODO: fetch loyalty settings from Firestore.
      return res.status(200).json({
        ok: true,
        settings: DEFAULT_SETTINGS,
      });
    }

    if (req.method === 'POST' && action === 'settings') {
      // TODO: persist loyalty settings when Firestore is configured.
      return res.status(200).json({ ok: true, saved: true });
    }

    return res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
