// Role-based access control middleware
// Usage: const { requireRole } = require('./requireRole'); app.use('/admin', verifyAuth, requireRole('admin'), handler)

function requireRole(...allowed) {
  const allowedSet = new Set(allowed.map(String));

  return function roleGuard(req, res, next) {
    const role = req?.user?.role;

    if (role && allowedSet.has(String(role))) {
      if (typeof next === 'function') return next();
      return;
    }

    res.status(403).json({ ok: false, error: 'Forbidden' });
  };
}

module.exports = { requireRole };
