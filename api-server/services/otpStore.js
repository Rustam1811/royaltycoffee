// api-server/services/otpStore.js
// Простое хранилище OTP: in-memory в dev, Firestore в prod
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const isDev = process.env.NODE_ENV !== 'production';
const OTP_TTL_SEC = parseInt(process.env.OTP_TTL_SEC || '300', 10);

// In-memory store for dev: Map<e164, { otpHash, expiresAt: number }>
const memory = new Map();

function nowSec() { return Math.floor(Date.now() / 1000); }
function randomCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

/**
 * issueOtp(e164) -> { code, ttlSec }
 */
exports.issueOtp = async function issueOtp(e164) {
  const code = process.env.MOCK_OTP === '1' ? '123456' : randomCode();
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = nowSec() + OTP_TTL_SEC;

  if (isDev) {
    memory.set(e164, { otpHash, expiresAt });
  } else {
    const db = admin.firestore();
    await db.collection('otp').doc(e164).set({ otpHash, expiresAt: Timestamp.fromMillis(expiresAt * 1000) });
  }

  // Always return the code to the server so it can be delivered via SMS/WhatsApp.
  // The API route decides whether to expose it to the client (dev only).
  return { code, ttlSec: OTP_TTL_SEC };
};

/**
 * verifyOtp(e164, code) -> boolean
 */
exports.verifyOtp = async function verifyOtp(e164, code) {
  if (!code) return false;
  let record;
  if (isDev) {
    record = memory.get(e164);
  } else {
    const db = admin.firestore();
    const doc = await db.collection('otp').doc(e164).get();
    record = doc.exists ? doc.data() : null;
    if (record && record.expiresAt && record.expiresAt.seconds) {
      record.expiresAt = record.expiresAt.seconds;
    }
  }
  if (!record) return false;
  if (record.expiresAt < nowSec()) return false;

  const ok = await bcrypt.compare(code, record.otpHash);
  if (!ok) return false;

  // one-time use: delete
  if (isDev) {
    memory.delete(e164);
  } else {
    const db = admin.firestore();
    await db.collection('otp').doc(e164).delete();
  }
  return true;
};
