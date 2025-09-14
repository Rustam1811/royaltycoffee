// server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// ───────────────────────────────────────────────────────────
// Firebase Admin init (JSON файл ИЛИ BASE64 из .env)
// ───────────────────────────────────────────────────────────
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    let serviceAccount = null;
    let initSource = 'unknown';

    // 1) сначала — из BASE64 в .env (FIREBASE_KEY_BASE64)
    if (process.env.FIREBASE_KEY_BASE64) {
      console.log('🔑 Using FIREBASE_KEY_BASE64 from .env');
      const decoded = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
      }
      initSource = 'FIREBASE_KEY_BASE64';
    }

    // 2) иначе — из отдельных переменных (PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      console.log('🔑 Using FIREBASE_* variables from .env');
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\r\n/g, '\n'),
      };
      initSource = 'FIREBASE_SPLIT_VARS';
    }

    // 3) иначе — пробуем firebase-service-account.json рядом с server.js
    if (!serviceAccount) {
      const jsonPath = path.resolve(__dirname, 'firebase-service-account.json');
      if (fs.existsSync(jsonPath)) {
        console.log('🔑 Using firebase-service-account.json');
        serviceAccount = require(jsonPath);
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
        }
        initSource = 'SERVICE_ACCOUNT_JSON';
      }
    }

    if (!serviceAccount) {
      throw new Error('No Firebase Admin credentials found. Provide FIREBASE_KEY_BASE64 or FIREBASE_* envs, or firebase-service-account.json');
    }

    const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
      databaseURL: process.env.FIREBASE_DB_URL || undefined,
    });
    process.env.ADMIN_INIT_SOURCE = initSource;
    process.env.ADMIN_PROJECT_ID = projectId || '';
    process.env.ADMIN_CLIENT_EMAIL = serviceAccount.client_email || '';

    // Propagate FIREBASE_* envs for legacy modules (e.g. ../../api/orders.js) that may load a separate firebase-admin instance
    if (!process.env.FIREBASE_PROJECT_ID) {
      process.env.FIREBASE_PROJECT_ID = projectId || serviceAccount.project_id || '';
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      process.env.FIREBASE_CLIENT_EMAIL = serviceAccount.client_email || '';
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      const pk = serviceAccount.private_key && typeof serviceAccount.private_key === 'string'
        ? serviceAccount.private_key.replace(/\r?\n/g, '\n')
        : '';
      process.env.FIREBASE_PRIVATE_KEY = pk;
    }
    console.log('✅ Firebase Admin initialized', `(source: ${initSource}, projectId: ${projectId})`);
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// ───────────────────────────────────────────────────────────
// Express
// ───────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 3001;

const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];
app.use(cors({ origin: corsOrigin, credentials: true }));

// Add COOP headers for Firebase Auth popups
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

app.use(express.json({ limit: '2mb' }));

// логирование
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ───────────────────────────────────────────────────────────
// Маршруты
// ───────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// Остальные (оставляем плейсхолдеры под существующие)
const safeMount = (mountPath, fileRelPath) => {
  const abs = path.resolve(__dirname, fileRelPath);
  if (fs.existsSync(abs)) {
    app.use(mountPath, require(abs));
    console.log(`🔗 Mounted ${mountPath} → ${fileRelPath}`);
  } else {
    console.warn(`⚠️  Route file not found: ${fileRelPath} (skipped)`);
  }
};

safeMount('/api/orders', './routes/orders.js');
safeMount('/api/orders-unified', './routes/orders-unified.js');
safeMount('/api/bonus', './routes/bonus.js');
safeMount('/api/promo', './routes/promo.js');
safeMount('/api/stories', './routes/stories.js');
safeMount('/api/users', './routes/users.js');
// safeMount('/api/promotions', './routes/promotions.js');
// diagnostics
safeMount('/api/diagnostics', './routes/diagnostics.js');

// health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), adminInitSource: process.env.ADMIN_INIT_SOURCE, projectId: process.env.ADMIN_PROJECT_ID, clientEmail: process.env.ADMIN_CLIENT_EMAIL });
});

// 404 для API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Глобальный обработчик ошибок (всегда JSON)
app.use((err, _req, res, _next) => {
  console.error('🔴 Unhandled error:', err);
  if (res.headersSent) return; 
  const msg = err && typeof err === 'object' && err.message ? String(err.message) : 'Internal error';
  res.status(500).json({ error: 'INTERNAL', message: msg });
});

// старт
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log('   /api/health');
  console.log('   /api/auth?action=login|sendOtp|verifyOtp|setPassword|ensureUser');
});
