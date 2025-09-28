const { send } = require('./json');

let _db = null;
let _initError = null;

const ADMIN_ON = process.env.ADMIN_AUTH_ENABLED === 'true';

function hasCreds() {
  const hasPk = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  const hasServiceJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
  const hasServiceB64 = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  return hasPk || hasServiceJson || hasServiceB64;
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
  } catch (_) {
    return null;
  }
  return null;
}

async function ensureAdminReady() {
  if (_db) return _db;
  if (!hasCreds()) return null;

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
  } catch (error) {
    _db = null;
    try {
      _initError = String(error && (error.message || error));
    } catch (_) {
      _initError = 'unknown';
    }
    return null;
  }
}

async function getDb() {
  return ensureAdminReady();
}

async function requireAdminRole(req, res) {
  if (!ADMIN_ON) return true;

  const response = res || (req && (req.res || req.response)) || null;
  if (req && response && !req.res) req.res = response;

  if (!hasCreds()) {
    send(response, 401, { ok: false, error: 'Unauthorized' });
    return false;
  }

  await ensureAdminReady();
  try {
    const { getApps } = require('firebase-admin/app');
    if (!getApps().length) {
      send(response, 401, { ok: false, error: 'Unauthorized' });
      return false;
    }
  } catch (error) {
    send(response, 401, { ok: false, error: String(error && (error.message || error)) });
    return false;
  }

  const authHeader = req && (req.headers?.authorization || req.headers?.Authorization);
  const token = authHeader && String(authHeader).startsWith('Bearer ')
    ? String(authHeader).slice(7).trim()
    : null;
  if (!token) {
    send(response, 401, { ok: false, error: 'Unauthorized' });
    return false;
  }

  try {
    const { getAuth } = require('firebase-admin/auth');
    const decoded = await getAuth().verifyIdToken(token);
    const role = decoded && (decoded.role || (decoded.admin ? 'admin' : null));
    if (role !== 'admin') {
      send(response, 403, { ok: false, error: 'Forbidden' });
      return false;
    }
    return true;
  } catch (error) {
    send(response, 401, { ok: false, error: String(error && (error.message || error)) });
    return false;
  }
}

module.exports = { getDb, requireAdminRole, hasCreds, ADMIN_ON };

module.exports.__debug = function () {
  return { dbReady: !!_db, initError: _initError };
};
