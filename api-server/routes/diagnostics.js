// api-server/routes/diagnostics.js
const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = admin.firestore();
    // try a lightweight read
    const col = await db.listCollections();
    const auth = admin.auth();
    const tmpUid = 'diag_' + Math.random().toString(36).slice(2);
    // createCustomToken just to verify permissions
    const token = await auth.createCustomToken(tmpUid);
    res.json({ ok: true, collections: col.map(c => c.id).slice(0, 5), tokenSample: token.slice(0, 20) + '...' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.message ? String(e.message) : 'diag_error' });
  }
});

module.exports = router;
