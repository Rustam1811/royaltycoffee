let _db = null;
let _initError = null;

const ADMIN_ON = process.env.ADMIN_AUTH_ENABLED === 'true';

function hasCreds() {
  const hasPK = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  const hasServiceJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
  const hasServiceB64 = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  return hasPK || hasServiceJson || hasServiceB64;
}

function loadServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const json = JSON.parse(raw);
      if (json.private_key) json.private_key = String(json.private_key).replace(/\\n/g, '\n');
      return json;
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (json.private_key) json.private_key = String(json.private_key).replace(/\\n/g, '\n');
      return json;
    }
  } catch (_) {}
  return null;
}

async function ensureAdminReady() {
  if (_db) return _db;
  if (!hasCreds()) return null; // degraded mode

  try {
    const { initializeApp, cert, getApps } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    if (!getApps().length) {
      const svc = loadServiceAccount();
      if (svc) {
        initializeApp({ credential: cert(svc) });
      } else {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          }),
        });
      }
    }
    _db = getFirestore();
    _initError = null;
    return _db;
  } catch (_e) {
    // degraded mode on any init error
    _db = null;
    try { _initError = String(_e && (_e.message || _e)); } catch { _initError = 'unknown'; }
    return null;
  }
}

async function getDb() {
  return await ensureAdminReady();
}

async function requireAdminRole(req) {
  if (!ADMIN_ON) return; // no-op when auth is disabled

  // Try to use response from req if attached by wrapper
  const res = req && req.res ? req.res : null;

  // If no creds, we cannot verify; treat as unauthorized
  if (!hasCreds()) {
    if (res && !res.writableEnded) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    }
    return;
  }

  // Ensure app is initialized
  await ensureAdminReady();
  try {
    const { getApps } = require('firebase-admin/app');
    if (!getApps().length) throw new Error('no-app');
  } catch (_) {
    if (res && !res.writableEnded) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    }
    return;
  }
  try {
    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
    const token = authHeader && String(authHeader).startsWith('Bearer ')
      ? String(authHeader).slice(7).trim()
      : null;
    if (!token) {
      if (res && !res.writableEnded) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }
      return;
    }

    const { getAuth } = require('firebase-admin/auth');
    const decoded = await getAuth().verifyIdToken(token);
    const role = decoded && decoded.role;
    if (role !== 'admin') {
      if (res && !res.writableEnded) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Forbidden' }));
      }
      return;
    }
    // authorized
    return;
  } catch (_e) {
    if (res && !res.writableEnded) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    }
    return;
  }
}

module.exports = { getDb, requireAdminRole, hasCreds, ADMIN_ON };

module.exports.__debug = function() {
  return { dbReady: !!_db, initError: _initError };
};
