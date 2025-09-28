const { withCors } = require('./_lib/cors');

module.exports = withCors(async (_req, res) => {
  try {
    return res.status(200).json({ ok: true, menu: [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
