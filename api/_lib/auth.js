const admin = require('firebase-admin');

if (!admin.apps.length) {
  const b64 = process.env.FIREBASE_KEY_BASE64;
  try {
    if (b64) {
      const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
  } catch (error) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

async function requireAuth(req, res, role) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No token' });
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    let customClaims = decoded || {};
    try {
      const user = await admin.auth().getUser(decoded.uid);
      customClaims = { ...customClaims, ...(user.customClaims || {}) };
    } catch (_) {
      // ignore secondary lookup errors
    }

    const userRole = customClaims.role || (customClaims.admin ? 'admin' : 'user');
    const isOwner = customClaims.role === 'owner';
    const isAdmin = isOwner || userRole === 'admin' || customClaims.admin === true;

    if (role === 'admin' && !isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }

    return { uid: decoded.uid, role: userRole, isAdmin, isOwner };
  } catch (_) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

module.exports = { requireAuth };
