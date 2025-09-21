// Middleware to verify Firebase ID Token from Authorization: Bearer <token>
// - Uses adminAuth from ./firebaseAdmin
// - On success attaches req.user = { uid, role }
// - On failure responds 401 { ok: false, error: 'Invalid token' }

const { adminAuth } = require('./firebaseAdmin');

function extractBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function verifyAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Invalid token' });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(token, true);
    const role = decoded.role || (decoded.admin ? 'admin' : 'user');
    req.user = { uid: decoded.uid, role };

    if (typeof next === 'function') return next();
    // If used outside of Express-style middleware, just return for chaining
    return;
  } catch (_err) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

module.exports = { verifyAuth };
