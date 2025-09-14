// api-server/routes/auth.js
const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();
const DEBUG = process.env.DEBUG_AUTH === '1';
const dbg = (...args) => { if (DEBUG) console.log('[auth]', ...args); };

// Get admin emails from environment
const getAdminEmails = () => {
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  return adminEmailsStr.split(',').map(email => email.trim()).filter(email => email);
};

function err(res, code, message, status = 400) {
  return res.status(status).json({ error: code, message });
}

// POST /api/auth?action=oauth
router.post('/', async (req, res) => {
  const action = String(req.query.action || '');

  try {
    if (action === 'oauth') {
      const idToken = req.body?.idToken;
      if (!idToken) return err(res, 'BAD_REQUEST', 'idToken required', 400);

      dbg('OAuth login attempt');

      // Verify Firebase ID Token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
        dbg('ID Token verified for user:', decodedToken.uid);
      } catch (verifyErr) {
        console.error('ID Token verification failed:', verifyErr);
        return err(res, 'INVALID_TOKEN', 'Неверный токен аутентификации', 401);
      }

      const { uid, email, name, picture } = decodedToken;
      if (!email) return err(res, 'NO_EMAIL', 'Email обязателен для входа', 400);

      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);

      // Check if user exists
      const userDoc = await userRef.get();
      let userData = userDoc.exists ? userDoc.data() : {};

      // Determine role based on email
      const adminEmails = getAdminEmails();
      const role = adminEmails.includes(email) ? 'admin' : 'user';

      // Update or create user
      const updateData = {
        email,
        name: name || userData.name || 'Пользователь',
        role,
        picture: picture || userData.picture,
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!userDoc.exists) {
        updateData.createdAt = new Date().toISOString();
        dbg('Creating new user:', uid, email, role);
      } else {
        dbg('Updating existing user:', uid, email, role);
      }

      await userRef.set(updateData, { merge: true });

      // Create custom token for client
      const customToken = await admin.auth().createCustomToken(uid);
      dbg('Custom token created for user:', uid);

      return res.json({
        success: true,
        token: customToken,
        user: {
          uid,
          email,
          name: updateData.name,
          role,
          picture: updateData.picture
        }
      });
    }

    return err(res, 'UNKNOWN_ACTION', 'Unknown action', 400);
  } catch (e) {
    console.error('Auth error:', e);
    const msg = e && typeof e === 'object' && e.message ? String(e.message) : 'Internal error';
    return err(res, 'INTERNAL', msg, 500);
  }
});

module.exports = router;
