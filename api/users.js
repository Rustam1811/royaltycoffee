const { withCors } = require('./_lib/cors');
const { requireAdminRole } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    const allowed = await requireAdminRole(req, res);
    if (allowed === false) return undefined;

    return res.status(200).json({ ok: true, users: [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});
