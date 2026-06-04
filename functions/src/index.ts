import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { Request, Response } from 'express';
import cors from "cors";
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const corsHandler = cors({ origin: true });

// Инициализация Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: 'royal-coffee-b1ce9.firebasestorage.app',
  });
}
const db = admin.firestore();

/**
 * Recursively convert Firestore Timestamps to ISO strings in plain objects
 */
function sanitizeFirestoreData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof admin.firestore.Timestamp) return obj.toDate().toISOString();
  if (typeof obj === 'object' && obj !== null && typeof (obj as { toDate?: () => Date }).toDate === 'function') {
    return (obj as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeFirestoreData);
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = sanitizeFirestoreData(val);
    }
    return result;
  }
  return obj;
}

/**
 * Получение бонусов пользователя
 */
export const userBonus = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId } = req.query;
      if (!userId) {
        res.status(400).json({ error: "userId обязателен" });
        return;
      }

      // Получаем последний бонус пользователя
      const bonusSnapshot = await db
        .collection("bonusHistory")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(1)
        .get();

      let currentBonus = 0;
      if (!bonusSnapshot.empty) {
        const latestBonus = bonusSnapshot.docs[0].data() as any;
        currentBonus = latestBonus.bonus || 0;
      }

      res.json({ bonus: currentBonus, userId });
      return;
    } catch (error) {
      console.error("Ошибка получения бонусов:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
  });
});

/**
 * Начисление бонусов за заказ
 */
export const earnBonus = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Только POST запросы" });
        return;
      }
      const { userId, orderAmount, orderId } = req.body || {};
      if (!userId || !orderAmount || !orderId) {
        res.status(400).json({ error: "userId, orderAmount и orderId обязательны" });
        return;
      }
      const settingsDoc = await db.collection("settings").doc("bonus").get();
      let bonusPercentage = 5;
      if (settingsDoc.exists) {
        const settings = settingsDoc.data() as any;
        bonusPercentage = settings?.percentage || 5;
      }
      const earnedBonus = Math.floor(orderAmount * bonusPercentage / 100);
      const bonusSnapshot = await db
        .collection("bonusHistory")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(1)
        .get();
      let currentBonus = 0;
      if (!bonusSnapshot.empty) {
        const latestBonus = bonusSnapshot.docs[0].data() as any;
        currentBonus = latestBonus.bonus || 0;
      }
      const newBonus = currentBonus + earnedBonus;
      await db.collection("bonusHistory").add({
        userId,
        type: "earned",
        amount: earnedBonus,
        bonus: newBonus,
        orderId,
        orderAmount,
        date: admin.firestore.Timestamp.now(),
        description: `Начислено за заказ №${orderId}`
      });
      await db.collection("orders").doc(orderId).update({ bonusEarned: earnedBonus });
      res.json({ success: true, earnedBonus, totalBonus: newBonus, percentage: bonusPercentage });
      return;
    } catch (error) {
      console.error("Ошибка начисления бонусов:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
  });
});

/**
 * Списание бонусов при оплате
 */
export const useBonus = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Только POST запросы" });
        return;
      }
      const { userId, usedBonus, orderId } = req.body || {};
      if (!userId || !usedBonus || !orderId) {
        res.status(400).json({ error: "userId, usedBonus и orderId обязательны" });
        return;
      }
      const bonusSnapshot = await db
        .collection("bonusHistory")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(1)
        .get();
      let currentBonus = 0;
      if (!bonusSnapshot.empty) {
        const latestBonus = bonusSnapshot.docs[0].data() as any;
        currentBonus = latestBonus.bonus || 0;
      }
      if (currentBonus < usedBonus) {
        res.status(400).json({ error: "Недостаточно бонусов", available: currentBonus, requested: usedBonus });
        return;
      }
      const newBonus = currentBonus - usedBonus;
      await db.collection("bonusHistory").add({
        userId,
        type: "used",
        amount: usedBonus,
        bonus: newBonus,
        orderId,
        date: admin.firestore.Timestamp.now(),
        description: `Списано за заказ №${orderId}`
      });
      await db.collection("orders").doc(orderId).update({ bonusUsed: usedBonus });
      res.json({ success: true, usedBonus, remainingBonus: newBonus });
      return;
    } catch (error) {
      console.error("Ошибка списания бонусов:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
  });
});


// Old 1st Gen 'orders' function removed - use /api/orders in app function

/**
 * Настройки бонусной системы
 */
export const bonusSettings = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method === "GET") {
        const settingsDoc = await db.collection("settings").doc("bonus").get();
        
        if (settingsDoc.exists) {
          res.json(settingsDoc.data());
        } else {
          // Настройки по умолчанию
          const defaultSettings = {
            percentage: 5,
            maxBonus: 1000,
            minOrderAmount: 100
          };
          res.json(defaultSettings);
        }
      }

      if (req.method === "POST") {
        const { percentage, maxBonus, minOrderAmount } = req.body;
        
        await db.collection("settings").doc("bonus").set({
          percentage: percentage || 5,
          maxBonus: maxBonus || 1000,
          minOrderAmount: minOrderAmount || 100,
          updatedAt: admin.firestore.Timestamp.now()
        });

        res.json({ success: true });
      }

    } catch (error) {
      console.error("Ошибка в bonusSettings:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
});

/**
 * Stories CRUD + view endpoints (prod)
 * - GET    /stories                 -> list
 * - POST   /stories                 -> create
 * - PUT    /stories/:id             -> update
 * - DELETE /stories/:id             -> delete
 * - POST   /stories/:id/view        -> record view
 */
export const stories = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const method = req.method.toUpperCase();
      const subPath = req.path || "/"; // "/" or "/:id" or "/:id/view"
      const parts = subPath.split("/").filter(Boolean); // [id] or [id,'view']

      if (method === "GET" && parts.length === 0) {
        const snap = await db.collection("stories").orderBy("createdAt", "desc").get();
        const items = snap.docs.map(doc => {
          const d = doc.data() as any;
            const createdAtIso = d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
            const publishAtIso = d.publishAt?.toDate?.()?.toISOString() || createdAtIso;
            const expiresAtIso = d.expiresAt?.toDate?.()?.toISOString() || new Date(new Date(publishAtIso).getTime() + 24 * 60 * 60 * 1000).toISOString();
            return { id: doc.id, ...d, createdAt: createdAtIso, publishAt: publishAtIso, expiresAt: expiresAtIso };
        });
        res.status(200).json(items); return;
      }
      if (method === "POST" && parts.length === 0) {
        const { title, contentType, mediaUrl, textContent, background, duration = 5, link, linkText, publishAt } = req.body || {};
        const publishDate = publishAt ? new Date(publishAt) : new Date();
        const expiresDate = new Date(publishDate.getTime() + 24 * 60 * 60 * 1000);
        const data = { title, contentType: contentType || 'text', mediaUrl: mediaUrl || null, textContent: textContent || null, background: background || { type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }, duration: Number(duration) || 5, link: link || null, linkText: linkText || null, publishAt: admin.firestore.Timestamp.fromDate(publishDate), expiresAt: admin.firestore.Timestamp.fromDate(expiresDate), isActive: true, views: 0, likes: 0, createdAt: admin.firestore.Timestamp.now() };
        const ref = await db.collection("stories").add(data);
        res.status(200).json({ success: true, id: ref.id, data }); return;
      }
      if (parts.length >= 1) {
        const id = parts[0];
        if (method === "POST" && parts[1] === "view") {
          const { userId = null, sessionId = null } = req.body || {};
          await db.collection("storyViews").add({ storyId: id, userId, sessionId, viewedAt: admin.firestore.Timestamp.now() });
          await db.collection("stories").doc(id).update({ views: admin.firestore.FieldValue.increment(1) });
          res.status(200).json({ success: true }); return;
        }
        if (method === "PUT" && parts.length === 1) {
          const body = { ...(req.body || {}) } as any;
          if (body.publishAt) {
            const publishDate = new Date(body.publishAt);
            body.publishAt = admin.firestore.Timestamp.fromDate(publishDate);
            if (!body.expiresAt) body.expiresAt = admin.firestore.Timestamp.fromDate(new Date(publishDate.getTime() + 24 * 60 * 60 * 1000));
          }
          if (body.expiresAt && typeof body.expiresAt === 'string') body.expiresAt = admin.firestore.Timestamp.fromDate(new Date(body.expiresAt));
          body.updatedAt = admin.firestore.Timestamp.now();
          await db.collection("stories").doc(id).update(body);
          res.status(200).json({ success: true }); return;
        }
        if (method === "DELETE" && parts.length === 1) {
          await db.collection("stories").doc(id).delete();
          const viewsSnap = await db.collection("storyViews").where("storyId", "==", id).get();
          const batch = db.batch();
          viewsSnap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          res.status(200).json({ success: true }); return;
        }
      }
      res.status(405).json({ error: 'Method or path not allowed' }); return;
    } catch (e: any) {
      console.error('stories function error:', e);
      res.status(500).json({ error: 'server error', details: e?.message }); return;
    }
  });
});

// Promotions, Achievements, Promo Codes unified handler (no CORS, single domain)
export const promotions = functions.https.onRequest(async (req, res) => {
  try {
    const action = String(req.query.action || '').toLowerCase();
    switch (action) {
      case 'promotions':
        return await handlePromotions(req as Request, res as Response);
      case 'achievements':
        return await handleAchievements(req as Request, res as Response);
      case 'codes':
        return await handlePromoCodes(req as Request, res as Response);
      default:
        res.status(400).json({ error: 'Invalid action' }); return;
    }
  } catch (e: any) {
    console.error('promotions handler error:', e);
    res.status(500).json({ error: 'server error', details: e?.message }); return;
  }
});

function toDate(v: any): Date {
  if ((v as any)?.toDate) return (v as any).toDate();
  if (typeof v === 'string') return new Date(v);
  if (v instanceof Date) return v;
  return new Date(0);
}

async function handlePromoCodes(req: Request, res: Response) {
  const db = admin.firestore();
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const snap = await db.collection('promoCodes').get();
    const now = new Date();
    const promoCodes: any[] = [];
    snap.forEach(doc => {
      const data = doc.data() as any;
      const expiresAt = toDate(data.expiresAt);
      const isActive = data.isActive !== false;
      if (isActive && expiresAt > now) promoCodes.push({ id: doc.id, ...data });
    });
    res.status(200).json({ promoCodes }); return;
  } catch (e: any) {
    console.error('Get promo codes error:', e);
    res.status(500).json({ error: 'Failed to get promo codes' }); return;
  }
}

async function handlePromotions(req: Request, res: Response) {
  const db = admin.firestore();
  if (req.method === 'GET') {
    try {
      const snap = await db.collection('promotions').get();
      const now = new Date();
      const promotions: any[] = [];
      snap.forEach(doc => {
        const data = doc.data() as any;
        const startDate = toDate(data.startDate);
        const endDate = toDate(data.endDate);
        const isActive = data.isActive !== false;
        if (isActive && now >= startDate && now <= endDate) promotions.push({ id: doc.id, ...data });
      });
      promotions.sort((a, b) => toDate(b.endDate).getTime() - toDate(a.endDate).getTime());
      res.status(200).json({ promotions }); return;
    } catch (e: any) {
      console.error('Get promotions error:', e);
      res.status(500).json({ error: 'Failed to get promotions' }); return;
    }
  }
  if (req.method === 'POST') {
    const { title, description, discount, startDate, endDate, conditions } = req.body || {};
    if (!title || !description || discount == null) { res.status(400).json({ error: 'Missing required fields' }); return; }
    try {
      const dbData: any = {
        title,
        description,
        discount,
        startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : admin.firestore.Timestamp.now(),
        endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7*24*60*60*1000)),
        conditions: conditions || {},
        isActive: true,
        createdAt: admin.firestore.Timestamp.now()
      };
      const ref = await db.collection('promotions').add(dbData);
      res.status(201).json({ success: true, promotionId: ref.id, promotion: { id: ref.id, ...dbData } }); return;
    } catch (e: any) {
      console.error('Create promotion error:', e);
      res.status(500).json({ error: 'Failed to create promotion' }); return;
    }
  }
  if (req.method === 'PUT') {
    const id = String(req.query.id || '');
    if (!id) { res.status(400).json({ error: 'Promotion ID is required' }); return; }
    try {
      const body = req.body || {};
      const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
      if (body.title != null) updateData.title = body.title;
      if (body.description != null) updateData.description = body.description;
      if (body.discount != null) updateData.discount = body.discount;
      if (body.startDate) updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(body.startDate));
      if (body.endDate) updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(body.endDate));
      if (body.conditions != null) updateData.conditions = body.conditions;
      if (body.isActive != null) updateData.isActive = body.isActive;
      await db.collection('promotions').doc(id).update(updateData);
      res.status(200).json({ success: true, message: 'Promotion updated successfully' }); return;
    } catch (e: any) {
      console.error('Update promotion error:', e);
      res.status(500).json({ error: 'Failed to update promotion' }); return;
    }
  }
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) { res.status(400).json({ error: 'Promotion ID is required' }); return; }
    try {
      await db.collection('promotions').doc(id).delete();
      res.status(200).json({ success: true, message: 'Promotion deleted successfully' }); return;
    } catch (e: any) {
      console.error('Delete promotion error:', e);
      res.status(500).json({ error: 'Failed to delete promotion' }); return;
    }
  }
  res.status(405).json({ error: 'Method not allowed' }); return;
}

async function handleAchievements(req: Request, res: Response) {
  const db = admin.firestore();
  if (req.method === 'GET') {
    const userId = String(req.query.userId || '');
    try {
      if (!userId) {
        const snap = await db.collection('achievements').get();
        const achievements: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        res.status(200).json({ achievements }); return;
      } else {
        const snap = await db.collection('userAchievements').where('userId', '==', userId).get();
        const userAchievements: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        res.status(200).json({ userAchievements }); return;
      }
    } catch (e: any) {
      console.error('Get achievements error:', e);
      res.status(500).json({ error: 'Failed to get achievements' }); return;
    }
  }
  if (req.method === 'POST') {
    const { name, description, condition, reward, icon } = req.body || {};
    if (!name || !description || !condition) { res.status(400).json({ error: 'Missing required fields' }); return; }
    try {
      const data = { name, description, condition, reward: reward || 0, icon: icon || '🏆', isActive: true, createdAt: admin.firestore.Timestamp.now() };
      const ref = await db.collection('achievements').add(data);
      res.status(201).json({ success: true, achievementId: ref.id, achievement: { id: ref.id, ...data } }); return;
    } catch (e: any) {
      console.error('Create achievement error:', e);
      res.status(500).json({ error: 'Failed to create achievement' }); return;
    }
  }
  if (req.method === 'PUT') {
    const id = String(req.query.id || '');
    if (!id) { res.status(400).json({ error: 'Achievement ID is required' }); return; }
    try {
      const body = req.body || {};
      const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
      if (body.name != null) updateData.name = body.name;
      if (body.description != null) updateData.description = body.description;
      if (body.condition != null) updateData.condition = body.condition;
      if (body.reward != null) updateData.reward = body.reward;
      if (body.icon != null) updateData.icon = body.icon;
      if (body.isActive != null) updateData.isActive = body.isActive;
      await db.collection('achievements').doc(id).update(updateData);
      res.status(200).json({ success: true, message: 'Achievement updated successfully' }); return;
    } catch (e: any) {
      console.error('Update achievement error:', e);
      res.status(500).json({ error: 'Failed to update achievement' }); return;
    }
  }
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) { res.status(400).json({ error: 'Achievement ID is required' }); return; }
    try {
      await db.collection('achievements').doc(id).delete();
      res.status(200).json({ success: true, message: 'Achievement deleted successfully' }); return;
    } catch (e: any) {
      console.error('Delete achievement error:', e);
      res.status(500).json({ error: 'Failed to delete achievement' }); return;
    }
  }
  res.status(405).json({ error: 'Method not allowed' }); return;
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────
function toE164(input?: string): string {
  if (!input) return '';
  const digits = String(input).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

function isAdminPhone(phone: string): boolean {
  const list = (process.env.ADMIN_PHONES || '')
    .split(',')
    .map(s => toE164((s || '').trim()))
    .filter(Boolean);
  return list.includes(toE164(phone));
}

const OTP_TTL_SEC = parseInt(process.env.OTP_TTL_SEC || '300', 10);
function nowSec() { return Math.floor(Date.now() / 1000); }
function randomCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

async function issueOtp(e164: string) {
  const code = process.env.MOCK_OTP === '1' ? '123456' : randomCode();
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = nowSec() + OTP_TTL_SEC;
  await db.collection('otp').doc(e164).set({ otpHash, expiresAt }, { merge: true });
  return { code: process.env.MOCK_OTP === '1' ? code : undefined };
}

async function verifyOtp(e164: string, code: string) {
  const doc = await db.collection('otp').doc(e164).get();
  if (!doc.exists) return false;
  const d = doc.data() as any;
  if (!d || !d.otpHash || !d.expiresAt) return false;
  if (d.expiresAt < nowSec()) return false;
  const ok = await bcrypt.compare(code, d.otpHash);
  if (!ok) return false;
  await db.collection('otp').doc(e164).delete();
  return true;
}

// ───────────────────────────────────────────────────────────
// Express app for /api/* on Functions
// ───────────────────────────────────────────────────────────
const httpApp = express();
httpApp.use(cors({ origin: true }));
httpApp.use(express.json());

// Health check endpoints
httpApp.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

httpApp.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, status: 'ok', ts: Date.now() });
});

function sendErr(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({ error: code, message });
}

httpApp.post('/api/auth', async (req: Request, res: Response) => {
  const action = String(req.query.action || '');
  try {
    if (action === 'login') {
      const phone = toE164((req.body?.phone || req.body?.phoneOrEmail) as string);
      const password = String(req.body?.password || '');
      if (!phone || !password) return sendErr(res, 'BAD_REQUEST', 'phone and password required', 400);

      const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
      if (snap.empty) return sendErr(res, 'USER_NOT_FOUND', 'Пользователь не найден', 404);

      const doc = snap.docs[0];
      const data = doc.data() as any;
      if (!data.passwordHash) return sendErr(res, 'PASSWORD_NOT_SET', 'Пароль не установлен', 409);

      const ok = await bcrypt.compare(password, data.passwordHash);
      if (!ok) return sendErr(res, 'INVALID_PASSWORD', 'Неверный пароль', 401);

      const role = isAdminPhone(phone) ? 'admin' : 'user';
      if (data.role !== role) await db.collection('users').doc(doc.id).set({ role }, { merge: true });

      const token = await admin.auth().createCustomToken(doc.id);
      return res.json({ success: true, token, user: { uid: doc.id, phone, name: data.name || 'Пользователь', role } });
    }

    if (action === 'sendOtp') {
      const phone = toE164(req.body?.phone as string);
      if (!phone) return sendErr(res, 'BAD_REQUEST', 'phone required', 400);

      const { code } = await issueOtp(phone);
      // В продакшне код не возвращаем — достаточно success
      return res.json({ success: true, devCode: process.env.MOCK_OTP === '1' ? code : undefined });
    }

    if (action === 'verifyOtp') {
      const phone = toE164(req.body?.phone as string);
      const code = String(req.body?.code || '');
      if (!phone || !code) return sendErr(res, 'BAD_REQUEST', 'phone and code required', 400);
      const ok = await verifyOtp(phone, code);
      if (!ok) return sendErr(res, 'INVALID_CODE', 'Неверный код', 400);
      return res.json({ success: true });
    }

    if (action === 'setPassword') {
      const phone = toE164(req.body?.phone as string);
      const code = String(req.body?.code || '');
      const newPassword = String(req.body?.newPassword || '');
      const name = String(req.body?.name || 'Гость');
      if (!phone || !code || !newPassword) return sendErr(res, 'BAD_REQUEST', 'phone, code, newPassword required', 400);

      const ok = await verifyOtp(phone, code);
      if (!ok) return sendErr(res, 'INVALID_CODE', 'Неверный код', 400);

      let uid: string;
      const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
      if (snap.empty) {
        const fakeEmail = `${phone.replace('+','')}@local.user`;
        const userRecord = await admin.auth().createUser({ email: fakeEmail, displayName: name });
        uid = userRecord.uid;
      } else {
        uid = snap.docs[0].id;
      }

      const role = isAdminPhone(phone) ? 'admin' : 'user';
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.collection('users').doc(uid).set({ phone, name, role, passwordHash, updatedAt: new Date().toISOString() }, { merge: true });

      const token = await admin.auth().createCustomToken(uid);
      return res.json({ success: true, token, user: { uid, phone, name, role } });
    }

    return sendErr(res, 'UNKNOWN_ACTION', 'Unknown action', 400);
  } catch (e) {
    console.error('Auth(app) error:', e);
    return sendErr(res, 'INTERNAL', 'Internal error', 500);
  }
});

// DEBUG endpoint для проверки что код обновлен
httpApp.get('/api/debug-version', async (req: Request, res: Response) => {
  return res.json({ 
    version: 'v2.0-real-firestore-data',
    timestamp: new Date().toISOString(),
    message: 'Code updated successfully'
  });
});

// Locations API endpoint
httpApp.all('/api/locations', async (req: Request, res: Response) => {
  try {
    const { action, id } = req.query;
    const MAX_LOCATIONS = 10;

    switch (action) {
      case 'list': {
        const snapshot = await db.collection('locations').get();
        const locations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));
        return res.json({ success: true, data: locations });
      }

      case 'get': {
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        const doc = await db.collection('locations').doc(String(id)).get();
        if (!doc.exists) return res.status(404).json({ success: false, error: 'Location not found' });
        return res.json({
          success: true,
          data: {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data()?.createdAt?.toDate() || new Date(),
            updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
          }
        });
      }

      case 'create': {
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
        
        const snapshot = await db.collection('locations').get();
        if (snapshot.size >= MAX_LOCATIONS) {
          return res.status(400).json({ success: false, error: `Maximum ${MAX_LOCATIONS} locations allowed` });
        }

        const docRef = await db.collection('locations').add({
          ...req.body,
          isActive: req.body.isActive !== false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const newDoc = await db.collection('locations').doc(docRef.id).get();
        return res.status(201).json({
          success: true,
          data: { id: docRef.id, ...newDoc.data() }
        });
      }

      case 'update': {
        if (req.method !== 'PUT') return res.status(405).json({ success: false, error: 'Method not allowed' });
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        
        await db.collection('locations').doc(String(id)).update({
          ...req.body,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const updatedDoc = await db.collection('locations').doc(String(id)).get();
        return res.json({
          success: true,
          data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      case 'delete': {
        if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        
        await db.collection('locations').doc(String(id)).delete();
        return res.json({ success: true });
      }

      case 'stats': {
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const [currentSnapshot, previousSnapshot] = await Promise.all([
          db.collection('orders')
            .where('locationId', '==', String(id))
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .get(),
          db.collection('orders')
            .where('locationId', '==', String(id))
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sixtyDaysAgo))
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .get()
        ]);

        const currentRevenue = currentSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || doc.data().amount || 0), 0);
        const previousRevenue = previousSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || doc.data().amount || 0), 0);
        const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        return res.json({
          success: true,
          data: {
            locationId: String(id),
            revenue: currentRevenue,
            orders: currentSnapshot.size,
            averageCheck: currentSnapshot.size > 0 ? currentRevenue / currentSnapshot.size : 0,
            growth: Math.round(growth * 10) / 10,
          }
        });
      }

      case 'analytics': {
        const locationsSnapshot = await db.collection('locations').get();
        const locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const analyticsPromises = locations.map(async (location: any) => {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

          const [currentSnapshot, previousSnapshot] = await Promise.all([
            db.collection('orders')
              .where('locationId', '==', location.id)
              .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
              .get(),
            db.collection('orders')
              .where('locationId', '==', location.id)
              .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sixtyDaysAgo))
              .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
              .get()
          ]);

          const currentRevenue = currentSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || doc.data().amount || 0), 0);
          const previousRevenue = previousSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || doc.data().amount || 0), 0);
          const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

          return {
            ...location,
            createdAt: location.createdAt?.toDate?.() || new Date(),
            updatedAt: location.updatedAt?.toDate?.() || new Date(),
            stats: {
              locationId: location.id,
              revenue: currentRevenue,
              orders: currentSnapshot.size,
              averageCheck: currentSnapshot.size > 0 ? currentRevenue / currentSnapshot.size : 0,
              growth: Math.round(growth * 10) / 10,
            }
          };
        });

        const analytics = await Promise.all(analyticsPromises);
        return res.json({ success: true, data: analytics });
      }

      case 'staff': {
        // Get staff for a specific location
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        
        const staffSnapshot = await db.collection('staff')
          .where('locationId', '==', String(id))
          .where('isActive', '==', true)
          .get();
        
        const staff = staffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        
        return res.json({ success: true, data: staff });
      }

      case 'saveStaff': {
        // Save/update staff for a location
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
        if (!id) return res.status(400).json({ success: false, error: 'Location ID required' });
        
        const { staff } = req.body;
        if (!Array.isArray(staff)) {
          return res.status(400).json({ success: false, error: 'Staff array required' });
        }

        const locationId = String(id);
        const batch = db.batch();

        // First, deactivate all existing staff for this location
        const existingStaffSnapshot = await db.collection('staff')
          .where('locationId', '==', locationId)
          .get();
        
        existingStaffSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });

        // Then add/update new staff
        for (const member of staff) {
          const { email, name, role } = member;
          if (!email || !name || !role) continue;

          const normalizedEmail = email.trim().toLowerCase();
          
          // Check if staff with this email already exists
          const existingSnapshot = await db.collection('staff')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

          if (!existingSnapshot.empty) {
            // Update existing staff
            const existingDoc = existingSnapshot.docs[0];
            batch.update(existingDoc.ref, {
              name,
              role,
              locationId,
              isActive: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            // Create new staff
            const newStaffRef = db.collection('staff').doc();
            batch.set(newStaffRef, {
              email: normalizedEmail,
              name,
              role,
              locationId,
              isActive: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        await batch.commit();
        return res.json({ success: true });
      }

      case 'staffByEmail': {
        // Get staff member's location by email
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, error: 'Email required' });

        const normalizedEmail = String(email).trim().toLowerCase();
        const staffSnapshot = await db.collection('staff')
          .where('email', '==', normalizedEmail)
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (staffSnapshot.empty) {
          return res.json({ success: false, error: 'Staff not found' });
        }

        const staffDoc = staffSnapshot.docs[0].data();
        return res.json({
          success: true,
          data: {
            locationId: staffDoc.locationId,
            role: staffDoc.role,
          }
        });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('[Locations API] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Добавляем endpoint для orders
httpApp.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const { action, userId, admin: isAdmin, from, to } = req.query;
    
    if (action === 'get') {
      console.log('📅 Orders API v2 REAL - Query params:', { userId, isAdmin, from, to });
      
      if (isAdmin === 'true') {
        // Админ панель - получаем заказы
        console.log('📅 Orders API - Fetching orders for admin');
        
        // Простой запрос без составного индекса - берем последние заказы
        const snap = await db.collection("orders")
          .orderBy('createdAt', 'desc')
          .limit(500)
          .get();
        
        console.log('📦 Firestore returned:', snap.docs.length, 'orders');
        
        // Фильтруем completed статусы на сервере
        const ordersData = snap.docs
          .map(doc => {
            const d = doc.data() as Record<string, any>;
            return {
              id: doc.id,
              orderNumber: d.orderNumber || null,
              orderNumberFormatted: d.orderNumberFormatted || `#${doc.id.slice(-6)}`,
              customerName: d.customerName || null,
              customerPhone: d.customerPhone || null,
              userId: d.userId,
              items: d.items,
              amount: d.amount || d.total || d.totalPrice || 0,
              totalPrice: d.totalPrice || d.amount || d.total || 0,
              bonusUsed: d.bonusUsed || 0,
              bonusEarned: d.bonusEarned || 0,
              status: d.status || 'pending',
              locationId: d.locationId,
              locationName: d.locationName || null,
              date: d.createdAt?.toDate?.()?.toISOString(),
              createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt,
              timestamp: d.createdAt?.toDate?.()?.toISOString()
            };
          })
          .filter(o => o.status === 'completed'); // Фильтруем completed
        
        // Фильтруем по датам на сервере (после получения из Firestore)
        let filtered = ordersData;
        if (from) {
          const fromTime = new Date(from as string).getTime();
          filtered = filtered.filter(o => new Date(o.createdAt || 0).getTime() >= fromTime);
          console.log('🔍 Filtered by from date:', filtered.length);
        }
        
        if (to) {
          const toTime = new Date(to as string).getTime();
          filtered = filtered.filter(o => new Date(o.createdAt || 0).getTime() <= toTime);
          console.log('� Filtered by to date:', filtered.length);
        }
        
        console.log('� Orders API - Returning:', filtered.length, 'orders');
        
        return res.status(200).json({ 
          ok: true,
          orders: filtered,
          admin: true,
          count: filtered.length,
          filtered: !!(from || to)
        });
      } else {
        // Пользователь - только его заказы
        if (!userId) return sendErr(res, 'BAD_REQUEST', 'userId required', 400);
        
        // Простой запрос без составного индекса - сортировка на сервере
        const snap = await db.collection("orders").where("userId", "==", userId).limit(50).get();
        const ordersData = snap.docs.map(doc => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            orderNumber: d.orderNumber || null,
            orderNumberFormatted: d.orderNumberFormatted || `#${doc.id.slice(-6)}`,
            customerName: d.customerName || null,
            customerPhone: d.customerPhone || null,
            locationName: d.locationName || null,
            items: d.items,
            amount: d.amount || d.total || d.totalPrice || 0,
            bonusEarned: d.bonusEarned || 0,
            bonusUsed: d.bonusUsed || 0,
            status: d.status || 'pending',
            date: d.createdAt?.toDate?.()?.toISOString() || d.createdAt,
            createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt
          };
        });
        
        // Сортируем на сервере по дате (descending)
        ordersData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        // Возвращаем последние 10
        return res.status(200).json(ordersData.slice(0, 10));
      }
    }
    
    return sendErr(res, 'UNKNOWN_ACTION', 'Unknown action', 400);
  } catch (e) {
    console.error('Orders(app) error:', e);
    return sendErr(res, 'INTERNAL', 'Internal error', 500);
  }
});

// ─── /api/approval-settings ─────────────────────────────────────────────
httpApp.get('/api/approval-settings', async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('settings').doc('orderApproval').get();
    const data = doc.exists ? doc.data() : null;
    return res.json({
      ok: true,
      threshold: data?.threshold ?? 20000,
      enabled: data?.enabled ?? true,
    });
  } catch (error: unknown) {
    console.error('[ApprovalSettings GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

httpApp.post('/api/approval-settings', async (req: Request, res: Response) => {
  try {
    const { threshold, enabled } = req.body || {};
    await db.collection('settings').doc('orderApproval').set({
      threshold: Number(threshold) || 20000,
      enabled: enabled !== false,
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
    return res.json({ ok: true });
  } catch (error: unknown) {
    console.error('[ApprovalSettings POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── /api/order-approve ─────────────────────────────────────────────
httpApp.post('/api/order-approve', async (req: Request, res: Response) => {
  try {
    const { orderId, action: approvalAction, approvedBy } = req.body || {};
    if (!orderId || !approvalAction) {
      return res.status(400).json({ ok: false, error: 'orderId and action are required' });
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }
    if (approvalAction === 'approve') {
      await orderRef.update({
        status: 'pending',
        needsApproval: false,
        approvedBy: approvedBy || null,
        approvedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      return res.json({ ok: true, message: 'Заказ одобрен' });
    } else if (approvalAction === 'reject') {
      await orderRef.update({
        status: 'cancelled',
        needsApproval: false,
        rejectedBy: approvedBy || null,
        rejectedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      return res.json({ ok: true, message: 'Заказ отклонён' });
    }
    return res.status(400).json({ ok: false, error: 'action must be "approve" or "reject"' });
  } catch (error: unknown) {
    console.error('[OrderApprove] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── /api/placeOrder ─────────────────────────────────────────────
httpApp.post('/api/placeOrder', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      locationId, 
      locationName,
      items, 
      amount, 
      bonusToUse, 
      customerName,
      customerPhone,
      deliveryType,
      deliveryInfo,
      personalDiscount,
      customerInfo 
    } = req.body || {};
    
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'userId and items are required' });
    }
    
    // ─── Генерируем ежедневный номер заказа ───
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Используем транзакцию для атомарного инкремента счётчика
    const counterRef = db.collection('counters').doc(`orders_${dateKey}`);
    let orderNumber: number;
    
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists) {
        orderNumber = (counterDoc.data()?.count || 0) + 1;
      } else {
        orderNumber = 1;
      }
      transaction.set(counterRef, { count: orderNumber, date: dateKey }, { merge: true });
    });
    
    // Форматируем номер: #001, #002, etc.
    const orderNumberFormatted = String(orderNumber!).padStart(3, '0');
    
    // Рассчитываем итоговую сумму
    const totalAmount = amount || items.reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0);
    const bonusUsed = Math.min(bonusToUse || 0, totalAmount);
    const finalAmount = Math.max(0, totalAmount - bonusUsed);
    
    // ─── Проверка порога одобрения ───
    const approvalDoc = await db.collection('settings').doc('orderApproval').get();
    const approvalData = approvalDoc.exists ? approvalDoc.data() : null;
    const approvalThreshold = approvalData?.threshold ?? 20000;
    const approvalEnabled = approvalData?.enabled !== false;
    const needsApproval = approvalEnabled && totalAmount > approvalThreshold;
    
    // Если используются бонусы - проверяем баланс
    if (bonusUsed > 0) {
      const bonusDoc = await db.collection('bonuses').doc(userId).get();
      const currentBalance = bonusDoc.exists ? (bonusDoc.data()?.balance || 0) : 0;
      
      if (currentBalance < bonusUsed) {
        return res.status(400).json({ ok: false, error: 'Insufficient bonus balance', available: currentBalance });
      }
    }
    
    // Создаем заказ с номером и данными клиента
    const orderData = {
      userId,
      orderNumber: orderNumber!,
      orderNumberFormatted: `#${orderNumberFormatted}`,
      orderDate: dateKey,
      locationId: locationId || null,
      locationName: locationName || null,
      // Данные клиента
      customerName: customerName || 'Клиент',
      customerPhone: customerPhone || null,
      // Тип доставки
      deliveryType: deliveryType || 'pickup',
      deliveryInfo: deliveryInfo || null,
      // Товары и суммы
      items,
      amount: finalAmount,
      totalPrice: totalAmount,
      bonusUsed,
      bonusEarned: 0,
      personalDiscount: personalDiscount || null,
      status: needsApproval ? 'awaiting_approval' : 'pending',
      needsApproval: needsApproval || false,
      customerInfo: customerInfo || {},
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    const orderRef = await db.collection('orders').add(orderData);
    const orderId = orderRef.id;
    
    // Списываем бонусы если использовались
    if (bonusUsed > 0) {
      const bonusDoc = await db.collection('bonuses').doc(userId).get();
      const currentBalance = bonusDoc.exists ? (bonusDoc.data()?.balance || 0) : 0;
      const newBalance = currentBalance - bonusUsed;
      
      await db.collection('bonuses').doc(userId).set({
        balance: newBalance,
        totalUsed: (bonusDoc.data()?.totalUsed || 0) + bonusUsed,
        updatedAt: admin.firestore.Timestamp.now()
      }, { merge: true });
      
      // Записываем историю списания бонусов
      await db.collection('bonusHistory').add({
        userId,
        type: 'used',
        amount: bonusUsed,
        balance: newBalance,
        orderId,
        description: `Списано за заказ #${orderNumberFormatted}`,
        createdAt: admin.firestore.Timestamp.now()
      });
    }
    
    console.log(`[PlaceOrder] Created order #${orderNumberFormatted} (${orderId}) for ${customerName} (${customerPhone})`);

    // ─── Накопительная лояльность по напиткам ───
    // Подсчитываем кол-во напитков в заказе. Учитываем только если у клиента
    // НЕТ персональной скидки на напитки/всё для ЭТОЙ точки (drinksPct === 0 для текущего outlet).
    // Если скидка только для outlet A, то в outlet B напитки всё равно засчитываются.
    try {
      const realUser = userId && userId !== 'pos_guest';
      const hasDrinksDiscount = !!personalDiscount && Number(personalDiscount.drinksPct) > 0;
      if (realUser && !hasDrinksDiscount) {
        // Ключевые слова еды — всё остальное считаем напитком (как в POS classifyCategory)
        const FOOD_KEYWORDS = ['food', 'bakery', 'выпеч', 'круасс', 'десерт', 'сэндв', 'sandwich', 'dessert', 'eat', 'croissant', 'snack'];
        const isDrink = (cat: string) => {
          const c = cat.toLowerCase();
          // Если POS прислал уже классифицированное значение
          if (c === 'drinks') return true;
          if (c === 'food') return false;
          // Fallback: проверяем по ключевым словам (raw categoryId от меню)
          return !FOOD_KEYWORDS.some(kw => c.includes(kw));
        };
        const drinksInOrder = (items as Array<{ category?: string; quantity?: number }>).reduce(
          (acc, it) => {
            const cat = it.category || 'drinks';
            return isDrink(cat) ? acc + (Number(it.quantity) || 1) : acc;
          },
          0
        );
        if (drinksInOrder > 0) {
          const bonusRef = db.collection('bonuses').doc(userId);
          await bonusRef.set(
            {
              drinksCount: admin.firestore.FieldValue.increment(drinksInOrder),
              ordersCount: admin.firestore.FieldValue.increment(1),
              lastOrderAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now(),
            },
            { merge: true }
          );
          console.log(`[PlaceOrder] +${drinksInOrder} drinks to loyalty for ${userId} (outlet: ${locationId})`);
        }
      }
    } catch (loyaltyErr) {
      console.error('[PlaceOrder] Loyalty drinksCount update failed:', loyaltyErr);
    }
    
    // ─── Push-уведомление суперовнерам при превышении порога ───
    if (needsApproval) {
      try {
        // Ищем суперовнеров с FCM-токенами
        const staffSnapshot = await db.collection('staff')
          .where('role', 'in', ['superowner', 'owner'])
          .where('isActive', '==', true)
          .get();
        
        const ownerTokens: string[] = [];
        for (const staffDoc of staffSnapshot.docs) {
          const staffData = staffDoc.data();
          const email = staffData.email;
          if (!email) continue;
          // Ищем пользователя по email для получения fcmToken
          const userSnap = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
          if (!userSnap.empty) {
            const token = userSnap.docs[0].data().fcmToken;
            if (token) ownerTokens.push(token);
          }
        }
        
        if (ownerTokens.length > 0) {
          const locName = locationName || locationId || 'неизвестная точка';
          const messaging = admin.messaging();
          await messaging.sendEachForMulticast({
            notification: {
              title: '⚠️ Требуется одобрение заказа',
              body: `Заказ #${orderNumberFormatted} на ${totalAmount.toLocaleString()} ₸ (${locName}). Одобрить?`,
            },
            data: {
              type: 'order_approval',
              orderId,
              orderNumber: orderNumberFormatted,
              amount: String(totalAmount),
              locationId: locationId || '',
            },
            tokens: ownerTokens,
          });
          console.log(`[PlaceOrder] Approval notification sent to ${ownerTokens.length} owner(s)`);
        }
      } catch (notifErr) {
        console.error('[PlaceOrder] Failed to send approval notification:', notifErr);
        // Не блокируем создание заказа из-за ошибки уведомления
      }
    }
    
    return res.status(201).json({
      ok: true,
      orderId,
      orderNumber: orderNumber!,
      orderNumberFormatted: `#${orderNumberFormatted}`,
      order: {
        id: orderId,
        ...orderData,
        createdAt: new Date().toISOString()
      },
      message: `Заказ #${orderNumberFormatted} принят!`
    });
  } catch (error: unknown) {
    console.error('[PlaceOrder] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// Endpoint для поиска пользователей по телефону (для POS системы)
httpApp.get('/api/users', async (req: Request, res: Response) => {
  try {
    const { action, phone, page, limit } = req.query;
    
    // Get user by phone - FAST endpoint for POS
    if (action === 'getByPhone' && phone) {
      const normalizePhone = (p: string) => {
        const cleaned = p.replace(/\D/g, '');
        if (cleaned.startsWith('8') && cleaned.length === 11) {
          return '+7' + cleaned.substring(1);
        }
        if (cleaned.startsWith('7') && cleaned.length === 11) {
          return '+' + cleaned;
        }
        return p;
      };
      
      const normalized = normalizePhone(phone as string);
      console.log('[Users getByPhone] Searching for:', normalized);
      
      // Ищем по нормализованному номеру
      const usersSnapshot = await db.collection('users')
        .where('phone', '==', normalized)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        console.log('[Users getByPhone] Not found');
        return res.status(404).json({ ok: false, error: 'User not found' });
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('[Users getByPhone] Found user:', userDoc.id);
      return res.status(200).json({
        ok: true,
        user: {
          id: userDoc.id,
          phone: userData.phone,
          displayName: userData.displayName || userData.name || null,
          email: userData.email || null
        }
      });
    }
    
    // Список пользователей для админ-панели
    if (action === 'list') {
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;
      
      console.log(`[Users list] page=${pageNum}, limit=${limitNum}, offset=${offset}`);
      
      // Получаем общее количество пользователей
      const countSnapshot = await db.collection('users').count().get();
      const totalCount = countSnapshot.data().count;
      
      // Получаем пользователей с пагинацией
      let query = db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limitNum);
      
      // Для offset используем startAfter если не первая страница
      if (offset > 0) {
        // Получаем документ для startAfter
        const skipSnapshot = await db.collection('users')
          .orderBy('createdAt', 'desc')
          .limit(offset)
          .get();
        
        if (!skipSnapshot.empty) {
          const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
          query = db.collection('users')
            .orderBy('createdAt', 'desc')
            .startAfter(lastDoc)
            .limit(limitNum);
        }
      }
      
      const usersSnapshot = await query.get();
      
      // Fetch bonus balances and order counts in parallel for all users
      const userIds = usersSnapshot.docs.map(d => d.id);
      
      // Batch fetch bonuses (balance + drinksCount — для накопительной лояльности)
      const bonusPromises = userIds.map(id => db.collection('bonuses').doc(id).get());
      const bonusDocs = await Promise.all(bonusPromises);
      const bonusMap = new Map<string, number>();
      const drinksCountMap = new Map<string, number>();
      bonusDocs.forEach((bDoc, i) => {
        const bd = bDoc.exists ? (bDoc.data() || {}) : {};
        bonusMap.set(userIds[i], Number(bd.balance) || 0);
        drinksCountMap.set(userIds[i], Number(bd.drinksCount) || 0);
      });
      
      // Batch fetch order counts and totalSpent
      const orderPromises = userIds.map(id =>
        db.collection('orders').where('userId', '==', id).get()
      );
      const orderSnapshots = await Promise.all(orderPromises);
      const ordersCountMap = new Map<string, number>();
      const totalSpentMap = new Map<string, number>();
      const lastOrderMap = new Map<string, string | null>();
      orderSnapshots.forEach((snap, i) => {
        ordersCountMap.set(userIds[i], snap.size);
        let spent = 0;
        let lastDate: Date | null = null;
        snap.docs.forEach(oDoc => {
          const od = oDoc.data();
          spent += od.amount || od.totalPrice || 0;
          const rawTs = od.createdAt;
          const ts: Date | null = rawTs?.toDate ? rawTs.toDate() : (rawTs ? new Date(String(rawTs)) : null);
          if (ts && (!lastDate || ts.getTime() > lastDate.getTime())) lastDate = ts;
        });
        totalSpentMap.set(userIds[i], spent);
        lastOrderMap.set(userIds[i], lastDate ? (lastDate as Date).toISOString() : null);
      });
      
      const users = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const totalOrders = ordersCountMap.get(doc.id) || 0;
        const totalSpent = totalSpentMap.get(doc.id) || 0;
        const drinksCount = drinksCountMap.get(doc.id) || 0;

        // Determine level based on total spent amount
        let level = 'Бронза';
        let levelRank = 0;
        if (totalSpent >= 25000) { level = 'Платинум'; levelRank = 3; }
        else if (totalSpent >= 15000) { level = 'Золото'; levelRank = 2; }
        else if (totalSpent >= 5000) { level = 'Серебро'; levelRank = 1; }

        // Накопительная скидка (cashback) по количеству выпитых напитков.
        // Тиры синхронизированы с src/components/AchievementBadge.ts:
        // 0/10/25/50/100/200 → 3/5/8/10/12/15%.
        let cashbackPercent = 3;
        if (drinksCount >= 200) cashbackPercent = 15;
        else if (drinksCount >= 100) cashbackPercent = 12;
        else if (drinksCount >= 50) cashbackPercent = 10;
        else if (drinksCount >= 25) cashbackPercent = 8;
        else if (drinksCount >= 10) cashbackPercent = 5;

        return {
          id: doc.id,
          uid: doc.id,
          phone: data.phone || null,
          email: data.email || null,
          displayName: data.displayName || data.name || null,
          name: data.name || data.displayName || null,
          avatar: data.avatar || null,
          role: data.role || 'user',
          isActive: data.isActive !== false,
          isCloseFriend: data.isCloseFriend || false,
          bonusBalance: bonusMap.get(doc.id) || 0,
          drinksCount,
          cashbackPercent,
          ordersCount: totalOrders,
          totalOrders,
          totalSpent: totalSpentMap.get(doc.id) || 0,
          lastOrderDate: lastOrderMap.get(doc.id) || null,
          level,
          levelRank,
          primaryLocationId: data.primaryLocationId || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
          lastLogin: data.lastLogin?.toDate?.()?.toISOString() || data.lastLogin || null
        };
      });
      
      return res.json({
        ok: true,
        users,
        total: totalCount,
        hasMore: users.length === limitNum,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    }
    
    return res.status(400).json({ ok: false, error: 'Invalid action or missing parameters' });
  } catch (error: unknown) {
    console.error('[Users] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// Endpoint для загрузки файлов (обходит CORS проблему)
httpApp.post('/api/upload-story', async (req: Request, res: Response) => {
  try {
    const { fileData, fileName, mimeType } = req.body;
    
    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing fileData or fileName' });
    }

    // Декодируем base64
    const buffer = Buffer.from(fileData, 'base64');
    
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `stories/${timestamp}_${sanitizedName}`;
    const contentType = mimeType || 'image/jpeg';
    
    // Генерируем download-токен (Firebase формат)
    const downloadToken = crypto.randomUUID();
    
    // Используем default bucket из initializeApp (storageBucket)
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Формируем Firebase Download URL с токеном
    // Формат: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return res.json({
      success: true,
      url,
      path: storagePath,
      contentType,
    });
  } catch (error: unknown) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return res.status(500).json({ 
      success: false, 
      error: message 
    });
  }
});

// ─── /api/bonus ─────────────────────────────────────────────
httpApp.get('/api/bonus', async (req: Request, res: Response) => {
  try {
    const { action, userId } = req.query;
    
    // Получение настроек бонусной системы
    if (action === 'settings') {
      const settingsDoc = await db.collection('bonusSettings').doc('default').get();
      const settings = settingsDoc.exists ? settingsDoc.data() : null;
      
      // Возвращаем настройки или значения по умолчанию
      return res.json({
        ok: true,
        pointsPerRuble: settings?.pointsPerRuble ?? 1,
        minOrderForBonus: settings?.minOrderForBonus ?? 200,
        multipliers: settings?.multipliers ?? {
          weekend: 2,
          morning: 1.5,
          vip: 3
        },
        categories: settings?.categories ?? {
          coffee: { multiplier: 1.2, name: 'Кофе' },
          desserts: { multiplier: 1.1, name: 'Десерты' },
          breakfast: { multiplier: 1.3, name: 'Завтраки' }
        },
        rewards: settings?.rewards ?? [
          { id: 'coffee_free', points: 100, reward: 'Бесплатный кофе', isActive: true },
          { id: 'discount_10', points: 500, reward: 'Скидка 10%', isActive: true },
          { id: 'dessert_free', points: 1000, reward: 'Бесплатный десерт', isActive: true }
        ],
        levels: settings?.levels ?? [
          { level: 1, name: 'Бронза', minSpent: 0, benefits: '5% кешбэк с каждого заказа', cashbackPercent: 5 },
          { level: 2, name: 'Серебро', minSpent: 5000, benefits: '10% кешбэк с каждого заказа', cashbackPercent: 10 },
          { level: 3, name: 'Золото', minSpent: 15000, benefits: '15% кешбэк + раннее уведомление', cashbackPercent: 15 },
          { level: 4, name: 'Платинум', minSpent: 25000, benefits: '20% кешбэк + приоритет + эксклюзив', cashbackPercent: 20 }
        ]
      });
    }
    
    // Получение бонусов конкретного пользователя
    if (userId) {
      const bonusDoc = await db.collection('bonuses').doc(userId as string).get();
      const bonusData = bonusDoc.exists ? bonusDoc.data() : {};
      
      // Получаем заказы пользователя
      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .get();
      const totalOrders = ordersSnapshot.size;
      
      // Считаем общую сумму потраченных денег
      let totalSpent = 0;
      ordersSnapshot.forEach(doc => {
        const d = doc.data();
        totalSpent += d.amount || d.totalAmount || 0;
      });
      
      // Загружаем настройки для определения уровня
      const settingsDoc = await db.collection('bonusSettings').doc('default').get();
      const settings = settingsDoc.exists ? settingsDoc.data() : null;
      
      let level = 'Бронза';
      let nextLevel = 'Серебро';
      let spentToNextLevel = 5000;
      let cashbackPercent = 5;
      
      interface LevelConfig {
        minSpent?: number;
        minPoints?: number;
        name: string;
        cashbackPercent?: number;
        bonusMultiplier?: number;
      }
      
      if (settings?.levels) {
        const sortedLevels = [...settings.levels].sort((a: LevelConfig, b: LevelConfig) => 
          (b.minSpent ?? b.minPoints ?? 0) - (a.minSpent ?? a.minPoints ?? 0)
        );
        for (let i = 0; i < sortedLevels.length; i++) {
          const lvl = sortedLevels[i];
          const threshold = lvl.minSpent ?? lvl.minPoints ?? 0;
          if (totalSpent >= threshold) {
            level = lvl.name;
            cashbackPercent = lvl.cashbackPercent || 5;
            if (i > 0) {
              nextLevel = sortedLevels[i - 1].name;
              const nextThreshold = sortedLevels[i - 1].minSpent ?? sortedLevels[i - 1].minPoints ?? 0;
              spentToNextLevel = nextThreshold - totalSpent;
            } else {
              nextLevel = lvl.name;
              spentToNextLevel = 0;
            }
            break;
          }
        }
      } else {
        // Fallback логика — по сумме потраченных денег
        if (totalSpent >= 25000) {
          level = 'Платинум'; nextLevel = 'Платинум'; spentToNextLevel = 0; cashbackPercent = 20;
        } else if (totalSpent >= 15000) {
          level = 'Золото'; nextLevel = 'Платинум'; spentToNextLevel = 25000 - totalSpent; cashbackPercent = 15;
        } else if (totalSpent >= 5000) {
          level = 'Серебро'; nextLevel = 'Золото'; spentToNextLevel = 15000 - totalSpent; cashbackPercent = 10;
        } else {
          level = 'Бронза'; nextLevel = 'Серебро'; spentToNextLevel = 5000 - totalSpent; cashbackPercent = 5;
        }
      }
      
      return res.json({
        ok: true,
        balance: bonusData?.balance || 0,
        level,
        cashbackPercent,
        multiplier: cashbackPercent / 100, // обратная совместимость
        totalOrders,
        totalSpent,
        nextLevel,
        spentToNextLevel,
        ordersToNextLevel: spentToNextLevel, // обратная совместимость
        earnedThisMonth: bonusData?.totalEarned || 0,
        totalEarned: bonusData?.totalEarned || 0,
        totalUsed: bonusData?.totalUsed || 0
      });
    }
    
    return res.status(400).json({ ok: false, error: 'Missing action or userId parameter' });
  } catch (error: unknown) {
    console.error('[Bonus] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── /api/promo ─────────────────────────────────────────────
httpApp.get('/api/promo', async (req: Request, res: Response) => {
  try {
    const { action, userId } = req.query;
    
    // Получение списка промоакций
    if (action === 'promotions') {
      const promotionsRef = await db.collection('promotions').get();
      const promotions: Record<string, unknown>[] = [];
      promotionsRef.forEach(doc => {
        promotions.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() }) as Record<string, unknown>);
      });
      
      // Если пустая коллекция, возвращаем mock данные
      if (promotions.length === 0) {
        return res.json({
          ok: true,
          promotions: [
            {
              id: 'promo_001',
              title: 'Happy Hour',
              description: 'Скидка 20% с 15:00 до 17:00',
              discountType: 'percentage',
              discountValue: 20,
              isActive: true,
              startDate: '2025-01-01',
              endDate: '2026-12-31',
              category: 'all',
              minOrderAmount: 100,
              targetAudience: 'all_users'
            },
            {
              id: 'promo_002',
              title: 'Бонус выходного дня',
              description: 'Двойные бонусы по выходным',
              discountType: 'percentage',
              discountValue: 0,
              isActive: true,
              startDate: '2025-01-01',
              endDate: '2026-12-31',
              category: 'all',
              minOrderAmount: 0,
              targetAudience: 'all_users'
            }
          ]
        });
      }
      
      return res.json({ ok: true, promotions });
    }
    
    // Получение достижений
    if (action === 'achievements') {
      if (userId) {
        // Достижения конкретного пользователя
        const userAchievementsRef = await db.collection('userAchievements')
          .where('userId', '==', userId)
          .get();
        const userAchievements: Record<string, unknown>[] = [];
        userAchievementsRef.forEach(doc => {
          userAchievements.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() }) as Record<string, unknown>);
        });
        return res.json({ ok: true, userAchievements });
      }
      
      // Все достижения
      const achievementsRef = await db.collection('achievements').get();
      const achievements: Record<string, unknown>[] = [];
      achievementsRef.forEach(doc => {
        achievements.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() }) as Record<string, unknown>);
      });
      
      if (achievements.length === 0) {
        return res.json({
          ok: true,
          achievements: [
            {
              id: 'ach_001',
              title: 'Первый заказ',
              description: 'Сделайте свой первый заказ',
              reward: 100,
              icon: '🎯',
              condition: 'first_order',
              category: 'orders',
              isActive: true
            },
            {
              id: 'ach_002',
              title: 'Кофейный гурман',
              description: 'Закажите 10 разных напитков',
              reward: 500,
              icon: '☕',
              condition: 'orders_count_10',
              category: 'orders',
              isActive: true
            }
          ]
        });
      }
      
      return res.json({ ok: true, achievements });
    }
    
    // Получение промокодов
    if (action === 'codes') {
      if (userId) {
        const userCodesRef = await db.collection('userPromoCodes')
          .where('userId', '==', userId)
          .get();
        const userCodes: Record<string, unknown>[] = [];
        userCodesRef.forEach(doc => {
          const data = doc.data();
          userCodes.push({
            id: doc.id,
            ...data,
            expiresAt: data.expiresAt?.toDate?.() || data.expiresAt
          });
        });
        return res.json({ ok: true, codes: userCodes });
      }
      
      const codesRef = await db.collection('promoCodes')
        .where('isActive', '==', true)
        .get();
      const codes: Record<string, unknown>[] = [];
      codesRef.forEach(doc => {
        const data = doc.data();
        codes.push({
          id: doc.id,
          ...data,
          expiresAt: data.expiresAt?.toDate?.() || data.expiresAt
        });
      });
      return res.json({ ok: true, codes });
    }
    
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (error: unknown) {
    console.error('[Promo] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

httpApp.post('/api/promo', async (req: Request, res: Response) => {
  try {
    const { action } = req.query;
    const body = req.body || {};
    
    // Создание промоакции
    if (action === 'promotions') {
      const { title, description, image, discountType, discountValue, startDate, endDate, category, minOrderAmount, targetAudience, isActive } = body;
      
      if (!title || !description || discountValue === undefined) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: title, description, discountValue' });
      }
      
      const newPromotion = {
        title,
        description,
        image: image || '',
        discountType: discountType || 'percentage',
        discountValue: parseInt(discountValue),
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || '2026-12-31',
        category: category || 'all',
        minOrderAmount: parseInt(minOrderAmount) || 0,
        targetAudience: targetAudience || 'all_users',
        isActive: isActive !== false,
        usageCount: 0,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await db.collection('promotions').add(newPromotion);
      return res.json({ ok: true, message: 'Promotion created successfully', promotion: { id: docRef.id, ...newPromotion } });
    }
    
    // Создание достижения
    if (action === 'achievements') {
      const { title, description, reward, icon, condition, category, isActive } = body;
      
      if (!title || !description || reward === undefined) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: title, description, reward' });
      }
      
      const newAchievement = {
        title,
        description,
        reward: parseInt(reward),
        icon: icon || '🏆',
        condition: condition || 'custom',
        category: category || 'general',
        isActive: isActive !== false,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await db.collection('achievements').add(newAchievement);
      return res.json({ ok: true, message: 'Achievement created successfully', achievement: { id: docRef.id, ...newAchievement } });
    }
    
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (error: unknown) {
    console.error('[Promo POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── PUT /api/promo — update promotions / achievements ──────────
httpApp.put('/api/promo', async (req: Request, res: Response) => {
  try {
    const { action, id } = req.query;
    const body = req.body || {};

    if (action === 'promotions' && id) {
      const docRef = db.collection('promotions').doc(id as string);
      const existing = await docRef.get();
      if (!existing.exists) {
        return res.status(404).json({ ok: false, error: 'Promotion not found' });
      }

      const { title, description, image, discountType, discountValue, startDate, endDate, category, minOrderAmount, targetAudience, isActive } = body;
      const updatedPromotion: Record<string, unknown> = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(category !== undefined && { category }),
        ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updatedPromotion);
      return res.json({ ok: true, message: 'Promotion updated successfully' });
    }

    if (action === 'achievements' && id) {
      const docRef = db.collection('achievements').doc(id as string);
      const existing = await docRef.get();
      if (!existing.exists) {
        return res.status(404).json({ ok: false, error: 'Achievement not found' });
      }

      const { title, description, reward, icon, condition, category, isActive } = body;
      const updatedAchievement: Record<string, unknown> = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(reward !== undefined && { reward: Number(reward) }),
        ...(icon !== undefined && { icon }),
        ...(condition !== undefined && { condition }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updatedAchievement);
      return res.json({ ok: true, message: 'Achievement updated successfully' });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action or missing id' });
  } catch (error: unknown) {
    console.error('[Promo PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── DELETE /api/promo — delete promotions / achievements ───────
httpApp.delete('/api/promo', async (req: Request, res: Response) => {
  try {
    const { action, id } = req.query;

    if (action === 'promotions' && id) {
      const docRef = db.collection('promotions').doc(id as string);
      const existing = await docRef.get();
      if (!existing.exists) {
        return res.status(404).json({ ok: false, error: 'Promotion not found' });
      }
      await docRef.delete();
      return res.json({ ok: true, message: 'Promotion deleted successfully' });
    }

    if (action === 'achievements' && id) {
      const docRef = db.collection('achievements').doc(id as string);
      const existing = await docRef.get();
      if (!existing.exists) {
        return res.status(404).json({ ok: false, error: 'Achievement not found' });
      }
      await docRef.delete();
      return res.json({ ok: true, message: 'Achievement deleted successfully' });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action or missing id' });
  } catch (error: unknown) {
    console.error('[Promo DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── Leaderboard API ─────────────────────────────────────────────
httpApp.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit: limitParam, userId } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam as string) || 50));
    
    // Drink / food category sets
    const DRINK_CATS = new Set(['coffee', 'ice_coffee', 'lemonade', 'milkshake', 'raf_royal']);
    const FOOD_CATS = new Set(['croissants', 'bakery', 'desserts', 'sandwiches']);

    // 1. Загружаем всех пользователей
    const usersSnapshot = await db.collection('users').limit(500).get();
    const usersMap = new Map<string, { name: string; ordersCount: number }>();
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      usersMap.set(doc.id, {
        name: data.displayName || data.name || 'Пользователь',
        ordersCount: data.ordersCount || 0,
      });
    });

    // 2. Загружаем menuItems для маппинга itemName → categoryId
    const menuItemsSnap = await db.collection('menuItems').get();
    const itemNameToCat = new Map<string, string>();
    menuItemsSnap.docs.forEach(d => {
      const data = d.data();
      if (data.name && data.categoryId) {
        itemNameToCat.set((data.name as string).toLowerCase(), data.categoryId as string);
      }
    });

    // 3. Агрегируем totalSpent + drink/food из orders (Admin SDK — full access)
    const ordersSnapshot = await db.collection('orders').get();
    const spentMap = new Map<string, number>();
    // catMap: { catId -> { userId -> count } }
    const drinkCatMap = new Map<string, Map<string, number>>();
    const foodCatMap = new Map<string, Map<string, number>>();
    const drinkTotalMap = new Map<string, number>();
    const foodTotalMap = new Map<string, number>();

    ordersSnapshot.docs.forEach(doc => {
      const o = doc.data();
      const uid = o.userId as string | undefined;
      if (!uid) return;
      const amount = (o.amount || o.totalAmount || o.total || 0) as number;
      spentMap.set(uid, (spentMap.get(uid) || 0) + amount);
      const items = o.items as Array<{ name?: string; quantity?: number }> | undefined;
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          if (!item.name) return;
          const qty = item.quantity || 1;
          const catId = itemNameToCat.get(item.name.toLowerCase());
          if (!catId) return;
          if (DRINK_CATS.has(catId)) {
            drinkTotalMap.set(uid, (drinkTotalMap.get(uid) || 0) + qty);
            if (!drinkCatMap.has(catId)) drinkCatMap.set(catId, new Map());
            const m = drinkCatMap.get(catId)!;
            m.set(uid, (m.get(uid) || 0) + qty);
          } else if (FOOD_CATS.has(catId)) {
            foodTotalMap.set(uid, (foodTotalMap.get(uid) || 0) + qty);
            if (!foodCatMap.has(catId)) foodCatMap.set(catId, new Map());
            const m = foodCatMap.get(catId)!;
            m.set(uid, (m.get(uid) || 0) + qty);
          }
        });
      }
    });

    // 4. Собираем лидерборд по сумме
    const leaderboardData: Array<{
      id: string;
      name: string;
      ordersCount: number;
      totalSpent: number;
      position: number;
    }> = [];

    usersMap.forEach((userData, id) => {
      const totalSpent = spentMap.get(id) || 0;
      if (totalSpent > 0 || userData.ordersCount > 0) {
        leaderboardData.push({
          id,
          name: userData.name,
          ordersCount: userData.ordersCount,
          totalSpent,
          position: 0,
        });
      }
    });

    leaderboardData.sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
      return b.ordersCount - a.ordersCount;
    });
    leaderboardData.forEach((u, i) => { u.position = i + 1; });

    // 5. Находим текущего юзера
    let currentUser = null;
    if (userId) {
      currentUser = leaderboardData.find(u => u.id === userId) || null;
      if (!currentUser) {
        const uData = usersMap.get(userId as string);
        if (uData) {
          currentUser = {
            id: userId as string,
            name: uData.name,
            ordersCount: uData.ordersCount,
            totalSpent: spentMap.get(userId as string) || 0,
            position: leaderboardData.length + 1,
          };
        }
      }
    }

    // 6. Строим drink/food лидерборды
    const buildCatLeaders = (
      catMap: Map<string, Map<string, number>>,
      totalMap: Map<string, number>,
      allKey: string,
    ): Record<string, Array<{ id: string; name: string; count: number; position: number }>> => {
      const result: Record<string, Array<{ id: string; name: string; count: number; position: number }>> = {};
      // "all" tab
      const allList: Array<{ id: string; name: string; count: number; position: number }> = [];
      totalMap.forEach((count, uid) => {
        allList.push({ id: uid, name: usersMap.get(uid)?.name || 'Пользователь', count, position: 0 });
      });
      allList.sort((a, b) => b.count - a.count);
      allList.forEach((u, i) => { u.position = i + 1; });
      result[allKey] = allList.slice(0, 10);
      // per-category tabs
      catMap.forEach((userMap, catKey) => {
        const list: Array<{ id: string; name: string; count: number; position: number }> = [];
        userMap.forEach((count, uid) => {
          list.push({ id: uid, name: usersMap.get(uid)?.name || 'Пользователь', count, position: 0 });
        });
        list.sort((a, b) => b.count - a.count);
        list.forEach((u, i) => { u.position = i + 1; });
        result[catKey] = list.slice(0, 10);
      });
      return result;
    };

    const drinkLeaders = buildCatLeaders(drinkCatMap, drinkTotalMap, 'all_drinks');
    const foodLeaders = buildCatLeaders(foodCatMap, foodTotalMap, 'all_food');

    // 7. Возвращаем
    const leaders = leaderboardData.slice(0, limitNum);
    
    return res.json({
      ok: true,
      leaders,
      currentUser,
      total: leaderboardData.length,
      drinkLeaders,
      foodLeaders,
    });
  } catch (error: unknown) {
    console.error('[Leaderboard] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── Extended Analytics API ─────────────────────────────────────────────
httpApp.get('/api/analytics/extended', async (req: Request, res: Response) => {
  try {
    const { locationId, period } = req.query;
    
    // Определяем период
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Простой запрос по дате (без составного индекса)
    // Фильтруем status и locationId на сервере
    const ordersQuery = db.collection('orders')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate));
    
    const ordersSnapshot = await ordersQuery.get();
    
    // Фильтруем completed + locationId на сервере
    const filteredDocs = ordersSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (data.status !== 'completed') return false;
      if (locationId && data.locationId !== locationId) return false;
      return true;
    });
    
    // Анализируем пиковые часы
    const hourlyStats: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { count: 0, revenue: 0 };
    }
    
    // Анализируем популярные продукты
    const productStats: Record<string, { name: string; count: number; revenue: number }> = {};
    
    // Анализируем по дням недели
    const dayStats: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { count: 0, revenue: 0 };
    }
    
    let totalRevenue = 0;
    let totalOrders = 0;
    
    filteredDocs.forEach(doc => {
      const order = doc.data();
      const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
      const hour = orderDate.getHours();
      const dayOfWeek = orderDate.getDay();
      const amount = order.amount || order.totalPrice || 0;
      
      // Часовая статистика
      hourlyStats[hour].count++;
      hourlyStats[hour].revenue += amount;
      
      // Дневная статистика
      dayStats[dayOfWeek].count++;
      dayStats[dayOfWeek].revenue += amount;
      
      // Статистика по продуктам
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: { name?: string; id?: string; price?: number; quantity?: number }) => {
          const productKey = item.name || item.id || 'Unknown';
          if (!productStats[productKey]) {
            productStats[productKey] = { name: productKey, count: 0, revenue: 0 };
          }
          productStats[productKey].count += item.quantity || 1;
          productStats[productKey].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
      
      totalRevenue += amount;
      totalOrders++;
    });
    
    // Находим пиковые часы
    const peakHours = Object.entries(hourlyStats)
      .map(([hour, stats]) => ({ hour: parseInt(hour), ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Находим популярные продукты
    const popularProducts = Object.values(productStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Находим лучшие дни
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const bestDays = Object.entries(dayStats)
      .map(([day, stats]) => ({ day: dayNames[parseInt(day)], dayIndex: parseInt(day), ...stats }))
      .sort((a, b) => b.count - a.count);
    
    return res.json({
      ok: true,
      analytics: {
        period: period || 'month',
        locationId: locationId || 'all',
        summary: {
          totalOrders,
          totalRevenue,
          averageCheck: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
        },
        peakHours: peakHours.map(h => ({
          hour: `${h.hour}:00 - ${h.hour + 1}:00`,
          orders: h.count,
          revenue: h.revenue
        })),
        popularProducts,
        bestDays,
        hourlyDistribution: Object.entries(hourlyStats).map(([hour, stats]) => ({
          hour: parseInt(hour),
          label: `${hour}:00`,
          orders: stats.count,
          revenue: stats.revenue
        }))
      }
    });
  } catch (error: unknown) {
    console.error('[Analytics Extended] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── Push Notifications API ─────────────────────────────────────────────
httpApp.post('/api/notifications/send', async (req: Request, res: Response) => {
  try {
    const { title, body, targetLevel, targetAll, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ ok: false, error: 'Missing title or body' });
    }
    
    // Получаем токены пользователей
    let usersQuery = db.collection('users').where('fcmToken', '!=', null);
    
    // Фильтруем по уровню если указан
    if (targetLevel && !targetAll) {
      usersQuery = usersQuery.where('level', '==', targetLevel);
    }
    
    const usersSnapshot = await usersQuery.limit(500).get();
    
    const tokens: string[] = [];
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });
    
    if (tokens.length === 0) {
      return res.json({ ok: true, sent: 0, message: 'No users with FCM tokens found' });
    }
    
    // Отправляем уведомления батчами по 500
    const messaging = admin.messaging();
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      const message = {
        notification: { title, body },
        data: data || {},
        tokens: batch
      };
      
      try {
        const response = await messaging.sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;
      } catch (e) {
        console.error('Error sending batch:', e);
        failureCount += batch.length;
      }
    }
    
    // Логируем отправку
    await db.collection('notificationLogs').add({
      title,
      body,
      targetLevel: targetLevel || 'all',
      sentCount: successCount,
      failedCount: failureCount,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    return res.json({
      ok: true,
      sent: successCount,
      failed: failureCount,
      total: tokens.length
    });
  } catch (error: unknown) {
    console.error('[Notifications Send] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── POS API Endpoints ─────────────────────────────────────────────
// Сканирование QR-кода клиента - идентификация пользователя
httpApp.post('/api/pos/scan', async (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    
    if (!payload) {
      return res.status(400).json({ ok: false, error: 'Missing payload' });
    }
    
    // Парсим QR данные (может быть JSON строка или просто uid)
    let userData: { uid?: string; userId?: string; phone?: string; name?: string } = {};
    
    try {
      userData = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      // Если не JSON, считаем что это просто uid
      userData = { uid: payload };
    }
    
    const uid = userData.uid || userData.userId;
    
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'Invalid QR code - no user ID' });
    }
    
    // Получаем данные пользователя (Firestore doc or Firebase Auth fallback)
    let userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      // User doc not in Firestore — try Firebase Auth to get basic profile
      try {
        const authUser = await admin.auth().getUser(uid);
        // Auto-create Firestore user document from Auth profile
        const autoData = {
          phone: authUser.phoneNumber || '',
          name: authUser.displayName || authUser.email?.split('@')[0] || 'Клиент',
          email: authUser.email || '',
          avatar: authUser.photoURL || '',
          role: 'user',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await db.collection('users').doc(uid).set(autoData, { merge: true });
        userDoc = await db.collection('users').doc(uid).get();
        console.log(`[POS Scan] Auto-created user doc for ${uid} from Auth profile`);
      } catch (_authErr) {
        console.warn(`[POS Scan] User ${uid} not found in Auth either, creating minimal doc`);
        // Auto-create minimal Firestore user doc so POS can link the customer
        const minimalData = {
          phone: '',
          name: 'POS Клиент',
          email: '',
          avatar: '',
          role: 'user',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await db.collection('users').doc(uid).set(minimalData, { merge: true });
        userDoc = await db.collection('users').doc(uid).get();
        console.log(`[POS Scan] Auto-created minimal user doc for ${uid}`);
      }
    }
    
    if (!userDoc.exists) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    
    const user = userDoc.data()!;
    
    // Получаем бонусный баланс
    const bonusDoc = await db.collection('bonuses').doc(uid).get();
    const bonusData = bonusDoc.exists ? bonusDoc.data() : { balance: 0 };
    
    // Получаем количество заказов
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', uid)
      .get();
    const totalOrders = ordersSnapshot.size;
    
    // Получаем ledger (историю транзакций)
    const ledgerSnapshot = await db.collection('users').doc(uid)
      .collection('ledger')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    const ledger = ledgerSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));
    
    console.log(`[POS Scan] Found user ${uid}: ${user.displayName || user.name || user.phone}, balance: ${bonusData?.balance || 0}`);
    
    return res.json({
      ok: true,
      user: {
        uid,
        name: user.displayName || user.name || 'Гость',
        phone: user.phone || null,
        email: user.email || null
      },
      balance: bonusData?.balance || 0,
      totalOrders,
      ledger
    });
  } catch (error: unknown) {
    console.error('[POS Scan] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// Начисление бонусов клиенту за покупку
httpApp.post('/api/pos/accrue', async (req: Request, res: Response) => {
  try {
    const { uid, amount, reason } = req.body;
    
    if (!uid || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'Missing uid or invalid amount' });
    }
    
    // Ensure user doc exists (auto-create from Auth if needed)
    let userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      try {
        const authUser = await admin.auth().getUser(uid);
        await db.collection('users').doc(uid).set({
          phone: authUser.phoneNumber || '',
          name: authUser.displayName || 'Клиент',
          email: authUser.email || '',
          role: 'user',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        userDoc = await db.collection('users').doc(uid).get();
      } catch {
        // Even if user doesn't exist in Auth, still allow bonus accrual with the UID
        await db.collection('users').doc(uid).set({
          name: 'POS Клиент',
          role: 'user',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
      }
    }
    
    const bonusRef = db.collection('bonuses').doc(uid);
    const bonusDoc = await bonusRef.get();
    const currentBalance = bonusDoc.exists ? (bonusDoc.data()?.balance || 0) : 0;
    const newBalance = currentBalance + amount;
    
    // Обновляем баланс
    await bonusRef.set({
      balance: newBalance,
      totalEarned: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Записываем в ledger
    await db.collection('users').doc(uid).collection('ledger').add({
      type: 'earn',
      amount: amount,
      balance: newBalance,
      reason: reason || 'Покупка в POS',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[POS Accrue] User ${uid}: +${amount} бонусов, новый баланс: ${newBalance}`);
    
    return res.json({
      ok: true,
      earned: amount,
      balance: newBalance,
      message: `Начислено ${amount} бонусов`
    });
  } catch (error: unknown) {
    console.error('[POS Accrue] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// Списание бонусов при оплате
httpApp.post('/api/pos/redeem', async (req: Request, res: Response) => {
  try {
    const { uid, amount, reason } = req.body;
    
    if (!uid || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'Missing uid or invalid amount' });
    }
    
    // Ensure user doc exists (auto-create from Auth if needed)
    let userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      try {
        const authUser = await admin.auth().getUser(uid);
        await db.collection('users').doc(uid).set({
          phone: authUser.phoneNumber || '',
          name: authUser.displayName || 'Клиент',
          email: authUser.email || '',
          role: 'user',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        userDoc = await db.collection('users').doc(uid).get();
      } catch {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }
    }
    
    const bonusRef = db.collection('bonuses').doc(uid);
    const bonusDoc = await bonusRef.get();
    const currentBalance = bonusDoc.exists ? (bonusDoc.data()?.balance || 0) : 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({ 
        ok: false, 
        error: `Недостаточно бонусов. Доступно: ${currentBalance}, запрошено: ${amount}` 
      });
    }
    
    const newBalance = currentBalance - amount;
    
    // Обновляем баланс
    await bonusRef.set({
      balance: newBalance,
      totalUsed: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Записываем в ledger
    await db.collection('users').doc(uid).collection('ledger').add({
      type: 'spend',
      amount: -amount,
      balance: newBalance,
      reason: reason || 'Списание в POS',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[POS Redeem] User ${uid}: -${amount} бонусов, новый баланс: ${newBalance}`);
    
    return res.json({
      ok: true,
      redeemed: amount,
      balance: newBalance,
      message: `Списано ${amount} бонусов`
    });
  } catch (error: unknown) {
    console.error('[POS Redeem] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
});

// ─── Role management routes (via express app so /api/roles/* works) ───
import {
  setRole as setRoleFn,
  bulkSetRoles as bulkSetRolesFn,
  getRole as getRoleFn,
  listStaff as listStaffFn,
  removeRole as removeRoleFn,
  createStaffUser as createStaffUserFn,
  listStaffFull as listStaffFullFn,
  updateStaffPassword as updateStaffPasswordFn
} from './roles';

httpApp.post('/api/roles/set', (req, res) => setRoleFn(req, res));
httpApp.post('/api/roles/bulk', (req, res) => bulkSetRolesFn(req, res));
httpApp.get('/api/roles/get', (req, res) => getRoleFn(req, res));
httpApp.get('/api/roles/staff', (req, res) => listStaffFn(req, res));
httpApp.post('/api/roles/remove', (req, res) => removeRoleFn(req, res));
httpApp.post('/api/roles/create-staff', (req, res) => createStaffUserFn(req, res));
httpApp.get('/api/roles/staff-full', (req, res) => listStaffFullFn(req, res));
httpApp.post('/api/roles/update-password', (req, res) => updateStaffPasswordFn(req, res));

export const app = functions.https.onRequest(httpApp);

// ─── Push Notification Functions ───
import {
  onNewOrderForAdmin,
  onAchievementUnlocked,
  onPromotionCreated,
  onStoryCreated,
  onOrderUpdated,
  onNewsCreated
} from './triggers';

import {
  reengageInactiveUsers,
  testReengage
} from './cron';

// Import role management functions (already imported above as *Fn aliases for express routes)

// Export notification trigger functions
export {
  onNewOrderForAdmin,
  onAchievementUnlocked,
  onPromotionCreated,
  onStoryCreated,
  onOrderUpdated,
  onNewsCreated,
  reengageInactiveUsers,
  testReengage
};

// Export role management functions (also available via /api/roles/* through express app)
export {
  setRoleFn as setRole,
  bulkSetRolesFn as bulkSetRoles,
  getRoleFn as getRole,
  listStaffFn as listStaff,
  removeRoleFn as removeRole,
  createStaffUserFn as createStaffUser,
  listStaffFullFn as listStaffFull,
  updateStaffPasswordFn as updateStaffPassword
};

// ─── Существующие экспортируемые функции ниже остаются без изменений ───

