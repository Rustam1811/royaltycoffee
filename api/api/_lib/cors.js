// Simple CORS wrapper for Vercel/Express handlers
// Requires ALLOWED_ORIGINS env (comma separated) and enforces 403 for disallowed origins.

const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || '').trim();

if (!rawAllowedOrigins) {
  throw new Error('ALLOWED_ORIGINS environment variable is required');
}

const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must include at least one origin');
}

function isOriginAllowed(origin) {
  if (!origin) return true; // Non-browser or same-origin requests without Origin header
  return allowedOrigins.includes(origin);
}

function setCorsHeaders(res, origin) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function withCors(handler) {
  return async function corsWrapped(req, res) {
    const origin = req.headers && req.headers.origin ? String(req.headers.origin) : '';

    if (!isOriginAllowed(origin)) {
      res.status(403).json({ ok: false, error: 'CORS: origin not allowed' });
      return;
    }

    setCorsHeaders(res, origin || null);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return handler(req, res);
  };
}

module.exports = { withCors, allowedOrigins };
