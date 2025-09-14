const admin = require("firebase-admin");

let isInitialized = false;

function initializeFirebase() {
  console.log("🔥 Firebase initialization started...");
  
  if (isInitialized || admin.apps.length > 0) {
    console.log("✅ Firebase already initialized");
    return admin.firestore();
  }

  const b64 = process.env.FIREBASE_KEY_BASE64;
  console.log("🔑 Environment check:", {
    hasKey: !!b64,
    keyLength: b64 ? b64.length : 0,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (!b64) {
    console.error("❌ FIREBASE_KEY_BASE64 not set");
    throw new Error("FIREBASE_KEY_BASE64 not set");
  }
  
  const serviceAccount = JSON.parse(
    Buffer.from(b64, "base64").toString("utf8")
  );
  
  // Исправляем PEM: заменяем literal "\\n" на реальные переносы строк
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
  });
  
  isInitialized = true;
  return admin.firestore();
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://coffee-addict.vercel.app",
    "https://sunfood-app.vercel.app"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Dev fallback for local tools and previews
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
}

module.exports = { initializeFirebase, setCorsHeaders };
