// Centralized Firebase Admin initialization
// Ensures single initialization in dev with Vite hot reload

let adminInstance = null;
let db = null;
let storageBucket = null;

function initFirebaseAdmin() {
  if (adminInstance && db) return { admin: adminInstance, db, storageBucket };

  try {
    const admin = require('firebase-admin');

    // Already initialized
    if (admin.apps.length) {
      adminInstance = admin;
      db = admin.firestore();
      storageBucket = admin.storage().bucket();
      return { admin: adminInstance, db, storageBucket };
    }

    // Load env (works when called from Vite server)
    try { require('dotenv').config(); } catch (_) {}

    const rawB64 = process.env.FIREBASE_KEY_BASE64;
    if (!rawB64) throw new Error('FIREBASE_KEY_BASE64 not set');

    let decoded;
    try {
      decoded = Buffer.from(rawB64, 'base64').toString('utf-8');
    } catch (e) {
      throw new Error('Failed to base64 decode FIREBASE_KEY_BASE64: ' + e.message);
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(decoded);
    } catch (e) {
      throw new Error('Failed to parse decoded FIREBASE_KEY_BASE64 JSON: ' + e.message);
    }

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Service account JSON missing private_key or client_email');
    }

    // Normalize private key newlines & remove CR
    serviceAccount.private_key = serviceAccount.private_key
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '');

    if (!serviceAccount.private_key.startsWith('-----BEGIN')) {
      throw new Error('Private key does not start with -----BEGIN');
    }

    const bucketFromEnv = process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
    const projectId = serviceAccount.project_id;
    let bucketCandidate = bucketFromEnv;

    // Normalize provided bucket - Admin SDK requires .appspot.com domain
    if (bucketCandidate) {
      if (bucketCandidate.endsWith('.firebasestorage.app')) {
        // Extract project ID from firebasestorage.app domain
        const extractedProject = bucketCandidate.split('.')[0];
        bucketCandidate = `${extractedProject}.appspot.com`;
      } else if (!bucketCandidate.includes('.')) {
        // Just project id passed
        bucketCandidate = `${bucketCandidate}.appspot.com`;
      } else if (bucketCandidate.endsWith('.appspot.com')) {
        // Already correct format
        bucketCandidate = bucketCandidate;
      }
    } else {
      bucketCandidate = `${projectId}.appspot.com`;
    }

    console.log('ℹ️ Firebase Admin bucket resolution:', {
      envBucket: bucketFromEnv || 'none',
      projectId,
      finalBucket: bucketCandidate
    });

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketCandidate
    });

    adminInstance = admin;
    db = admin.firestore();
    storageBucket = admin.storage().bucket();

    console.log('✅ Firebase Admin initialized (bucket:', storageBucket.name + ')');
    return { admin: adminInstance, db, storageBucket };
  } catch (error) {
    console.error('❌ Firebase Admin init error:', error.message);
    throw error;
  }
}

module.exports = { initFirebaseAdmin };
