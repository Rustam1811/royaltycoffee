const { withCors } = require('./_lib/cors');
const admin = require('./_lib/admin');

module.exports = withCors(async (_req, res) => {
  try {
    const details = typeof admin.__debug === 'function' ? admin.__debug() : { dbReady: false, initError: null };
    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      admin: {
        enabled: admin.ADMIN_ON,
        dbReady: Boolean(details.dbReady),
        initError: details.initError || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
