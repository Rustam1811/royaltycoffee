import * as admin from 'firebase-admin';
import { Router, Request, Response } from 'express';

const db = admin.firestore();

// ─── Mapping: iiko organizationId → our Firestore outletId ───
// Stored in Firestore: settings/iikoOrganizations → { [iikoOrgId]: outletId }
// If no mapping found, fall back to treating iikoOrgId as outletId directly.
async function resolveOutletId(iikoOrgId: string | undefined): Promise<string | null> {
  if (!iikoOrgId) return null;
  try {
    const snap = await db.collection('settings').doc('iikoOrganizations').get();
    if (snap.exists) {
      const map = snap.data() as Record<string, string>;
      return map[iikoOrgId] ?? iikoOrgId;
    }
  } catch {
    // mapping doc not configured yet — use orgId as-is
  }
  return iikoOrgId;
}

// ─── Resolve effective discount for a customer at a given outlet ───
// Returns the highest applicable discount:
//   max( tier cashback%, personal discount for this outlet, personal discount for '*' )
interface EffectiveDiscount {
  percent: number;
  source: 'tier' | 'personal';
  category: string; // 'drinks' | 'food' | 'all'
}

async function getEffectiveDiscount(
  uid: string,
  drinksCount: number,
  outletId: string | null,
): Promise<EffectiveDiscount> {
  const tierPct = getCashbackPercent(drinksCount);

  let personalPct = 0;
  let personalCategory = 'all';
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const personalDiscounts: Record<string, { percent: number; category?: string }> =
      userSnap.data()?.personalDiscounts ?? {};

    // Collect all applicable entries: specific outlet + wildcard
    const candidates: Array<{ percent: number; category: string }> = [];

    for (const [key, entry] of Object.entries(personalDiscounts)) {
      const colonIdx = key.indexOf(':');
      const keyOutlet = colonIdx === -1 ? key : key.slice(0, colonIdx);
      const keyCat = colonIdx === -1 ? 'all' : key.slice(colonIdx + 1);
      const appliesToThisOutlet = keyOutlet === '*' || (outletId && keyOutlet === outletId);
      if (appliesToThisOutlet) {
        candidates.push({ percent: entry.percent ?? 0, category: keyCat || 'all' });
      }
    }

    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => a.percent >= b.percent ? a : b);
      personalPct = best.percent;
      personalCategory = best.category;
    }
  } catch {
    // user doc missing personalDiscounts — fine
  }

  if (personalPct >= tierPct) {
    return { percent: personalPct, source: 'personal', category: personalCategory };
  }
  return { percent: tierPct, source: 'tier', category: 'all' };
}

// ─── Tier thresholds (mirrors frontend AchievementBadge.tsx) ───
const TIERS = [
  { minDrinks: 0,   cashback: 3  },
  { minDrinks: 50,  cashback: 5  },
  { minDrinks: 80,  cashback: 8  },
  { minDrinks: 100, cashback: 10 },
  { minDrinks: 250, cashback: 12 },
  { minDrinks: 400, cashback: 15 },
] as const;

function getCashbackPercent(drinks: number): number {
  let pct = 3;
  for (const t of TIERS) {
    if (drinks >= t.minDrinks) pct = t.cashback;
  }
  return pct;
}

// ─── Parse Firebase uid from QR value ───
// QR encodes: "loyalty:uid={userId}&v=1"
function parseUid(cardId: string): string | null {
  try {
    const decoded = decodeURIComponent(cardId);
    const m = decoded.match(/[?&]?uid=([^&]+)/);
    if (m) return m[1];
    // Fallback: bare uid (28-char alphanumeric Firebase uid)
    if (/^[A-Za-z0-9]{20,}$/.test(decoded)) return decoded;
    return null;
  } catch {
    return null;
  }
}

// ─── Validate shared secret set in Firebase Functions config ───
// Set via: firebase functions:config:set iiko.secret="your-secret"
// Then access as process.env.IIKO_WEBHOOK_SECRET (set in .env or runtime config)
function validateSecret(req: Request): boolean {
  const secret = process.env.IIKO_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — open (configure before going live)
  const header = req.headers['x-iiko-secret'] ?? req.headers['authorization'];
  return header === secret || header === `Bearer ${secret}`;
}

export const iikoLoyaltyRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-loyalty/couponinfo
// iiko calls this when cashier scans QR — returns customer name, discount %, balance
// ─────────────────────────────────────────────────────────────────────────────
iikoLoyaltyRouter.post('/couponinfo', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { id, organizationId } = req.body as { id?: string; organizationId?: string };
  if (!id) return res.status(400).json({ status: 'error', message: 'id required' });

  const uid = parseUid(id);
  if (!uid) return res.status(404).json({ status: 'error', message: 'Invalid loyalty card format' });

  try {
    const outletId = await resolveOutletId(organizationId);

    const [userSnap, bonusSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('bonuses').doc(uid).get(),
    ]);

    if (!userSnap.exists) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }

    const user = userSnap.data()!;
    const bonus = bonusSnap.exists ? bonusSnap.data()! : {};
    const drinksCount: number = bonus.drinksCount ?? bonus.ordersCount ?? 0;
    const balance: number = Math.floor(bonus.balance ?? 0);
    const effective = await getEffectiveDiscount(uid, drinksCount, outletId);

    return res.json({
      status: 'ok',
      id,
      uid,
      name: user.name || user.displayName || 'Клиент',
      phone: user.phone ?? '',
      balance,
      discount: effective.percent,         // итоговый % скидки для iiko
      discountSource: effective.source,    // 'tier' или 'personal' — для отладки
      discountCategory: effective.category, // 'drinks' / 'food' / 'all'
      drinksCount,
      organizationId: organizationId ?? null,
    });
  } catch (err) {
    console.error('[iiko/couponinfo]', err);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-loyalty/calculatecheque
// iiko calls this to know the exact discount amount for a given order total
// ─────────────────────────────────────────────────────────────────────────────
iikoLoyaltyRouter.post('/calculatecheque', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { couponSeries, orderSum, organizationId } = req.body as {
    couponSeries?: string;
    orderSum?: number;
    organizationId?: string;
  };

  if (!couponSeries || orderSum == null) {
    return res.status(400).json({ status: 'error', message: 'couponSeries and orderSum required' });
  }

  const uid = parseUid(couponSeries);
  if (!uid) return res.status(404).json({ status: 'error', message: 'Invalid card' });

  try {
    const outletId = await resolveOutletId(organizationId);
    const bonusSnap = await db.collection('bonuses').doc(uid).get();
    const bonus = bonusSnap.exists ? bonusSnap.data()! : {};
    const drinksCount: number = bonus.drinksCount ?? bonus.ordersCount ?? 0;
    const effective = await getEffectiveDiscount(uid, drinksCount, outletId);
    const discountSum = Math.floor((orderSum * effective.percent) / 100);

    return res.json({
      status: 'ok',
      discount: effective.percent,
      discountSource: effective.source,
      discountCategory: effective.category,
      discountSum,
      orderSum,
      finalSum: orderSum - discountSum,
    });
  } catch (err) {
    console.error('[iiko/calculatecheque]', err);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-loyalty/createorder
// Called by iiko after payment is completed:
//   - counts drinks from order items
//   - increments drinksCount in bonuses/{uid}
//   - accrues cashback (% of paid sum) to balance
// Idempotent: duplicate orderId is a no-op
// ─────────────────────────────────────────────────────────────────────────────
iikoLoyaltyRouter.post('/createorder', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const {
    couponSeries,
    orderId,
    orderSum,
    discountSum = 0,
    organizationId,
    items = [],
  } = req.body as {
    couponSeries?: string;
    orderId?: string;
    orderSum?: number;
    discountSum?: number;
    organizationId?: string;
    items?: Array<{ id?: string; name?: string; amount?: number; sum?: number }>;
  };

  if (!couponSeries || !orderId || orderSum == null) {
    return res.status(400).json({ status: 'error', message: 'couponSeries, orderId and orderSum required' });
  }

  const uid = parseUid(couponSeries);
  if (!uid) return res.status(404).json({ status: 'error', message: 'Invalid card' });

  const txRef = db.collection('iikoTransactions').doc(orderId);

  try {
    // Idempotency guard
    const existing = await txRef.get();
    if (existing.exists) {
      const d = existing.data()!;
      return res.json({
        status: 'ok',
        alreadyProcessed: true,
        newBalance: d.balanceAfter,
        earned: d.cashbackEarned,
      });
    }

    const bonusRef = db.collection('bonuses').doc(uid);
    const bonusSnap = await bonusRef.get();
    const bonus = bonusSnap.exists ? bonusSnap.data()! : {};

    const currentBalance: number = Math.floor(bonus.balance ?? 0);
    const currentDrinks: number = bonus.drinksCount ?? bonus.ordersCount ?? 0;

    // Each item.amount = number of that drink ordered (e.g. 3 cappuccinos = amount 3)
    const drinksInOrder = items.reduce((sum, item) => sum + (item.amount ?? 1), 0) || 1;
    const newDrinksCount = currentDrinks + drinksInOrder;

    // Cashback is calculated on the amount actually paid (after discount)
    const paidSum = Math.max(0, orderSum - discountSum);
    const cashbackPct = getCashbackPercent(newDrinksCount);
    const cashbackEarned = Math.floor((paidSum * cashbackPct) / 100);
    const newBalance = currentBalance + cashbackEarned;

    const batch = db.batch();

    batch.set(bonusRef, {
      balance: newBalance,
      drinksCount: newDrinksCount,
      ordersCount: newDrinksCount, // legacy field — keep in sync
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Full audit trail for every iiko transaction
    batch.set(txRef, {
      uid,
      orderId,
      organizationId: organizationId ?? null,
      orderSum,
      discountSum,
      paidSum,
      drinksInOrder,
      cashbackEarned,
      cashbackPct,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      drinksCountBefore: currentDrinks,
      drinksCountAfter: newDrinksCount,
      source: 'iiko',
      cancelled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return res.json({
      status: 'ok',
      earned: cashbackEarned,
      newBalance,
      drinksCount: newDrinksCount,
      discount: cashbackPct,
    });
  } catch (err) {
    console.error('[iiko/createorder]', err);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-loyalty/cancelorder
// Called on order cancellation/refund — reverses cashback and drinks
// ─────────────────────────────────────────────────────────────────────────────
iikoLoyaltyRouter.post('/cancelorder', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { orderId } = req.body as { orderId?: string; organizationId?: string };
  if (!orderId) return res.status(400).json({ status: 'error', message: 'orderId required' });

  const txRef = db.collection('iikoTransactions').doc(orderId);

  try {
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      return res.json({ status: 'ok', message: 'Order not found — nothing to cancel' });
    }

    const tx = txSnap.data()!;
    if (tx.cancelled) {
      return res.json({ status: 'ok', message: 'Already cancelled' });
    }

    const bonusRef = db.collection('bonuses').doc(tx.uid);
    const bonusSnap = await bonusRef.get();
    if (!bonusSnap.exists) {
      return res.status(404).json({ status: 'error', message: 'Customer bonus record not found' });
    }

    const bonus = bonusSnap.data()!;
    const newBalance = Math.max(0, Math.floor(bonus.balance ?? 0) - tx.cashbackEarned);
    const newDrinks = Math.max(0, (bonus.drinksCount ?? bonus.ordersCount ?? 0) - tx.drinksInOrder);

    const batch = db.batch();

    batch.set(bonusRef, {
      balance: newBalance,
      drinksCount: newDrinks,
      ordersCount: newDrinks,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.update(txRef, {
      cancelled: true,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return res.json({
      status: 'ok',
      refundedCashback: tx.cashbackEarned,
      newBalance,
      drinksCount: newDrinks,
    });
  } catch (err) {
    console.error('[iiko/cancelorder]', err);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
});
