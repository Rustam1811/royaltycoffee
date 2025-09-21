// Firebase Admin singleton initializer for API routes
// Ensures FIREBASE_SERVICE_ACCOUNT_BASE64 is present and decodes to a valid service account

const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const GLOBAL_KEY = '__FIREBASE_ADMIN_SINGLETON__';
const rawServiceAccount = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();

if (!rawServiceAccount) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required');
}

function decodeServiceAccount(b64) {
  let jsonStr;
  try {
    jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  } catch (error) {
    const err = new Error(`Failed to base64 decode FIREBASE_SERVICE_ACCOUNT_BASE64: ${error.message}`);
    err.code = 'CONFIG_DECODE_FAILED';
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    const err = new Error(`Failed to parse decoded service account JSON: ${error.message}`);
    err.code = 'CONFIG_PARSE_FAILED';
    throw err;
  }

  if (!parsed.client_email || !parsed.private_key) {
    const err = new Error('Service account JSON must include client_email and private_key');
    err.code = 'CONFIG_INVALID';
    throw err;
  }

  parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n').replace(/\r/g, '');
  if (!parsed.private_key.startsWith('-----BEGIN')) {
    const err = new Error('Service account private_key appears malformed (missing BEGIN header)');
    err.code = 'CONFIG_INVALID_KEY_FORMAT';
    throw err;
  }

  return parsed;
}

function initFirebaseAdminSingleton() {
  if (globalThis[GLOBAL_KEY]) {
    return globalThis[GLOBAL_KEY];
  }

  const serviceAccount = decodeServiceAccount(rawServiceAccount);
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });

  const adminAuth = getAuth(app);
  const adminDb = getFirestore(app);

  const singleton = { app, adminAuth, adminDb };
  globalThis[GLOBAL_KEY] = singleton;
  return singleton;
}

const { adminAuth, adminDb } = initFirebaseAdminSingleton();

module.exports = { adminAuth, adminDb };
