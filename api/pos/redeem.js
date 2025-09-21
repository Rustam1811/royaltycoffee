// POS: redeem bonuses for an order (Vercel handler)
// Security: CORS, Firebase auth, role guard, input validation, idempotency

const { withCors } = require('../_lib/cors');
const { verifyAuth } = require('../_lib/verifyAuth');
const { requireRole } = require('../_lib/requireRole');
const readJson = require('../_lib/json');
const { adminDb } = require('../_lib/firebaseAdmin');
const { z } = require('zod');

const BodySchema = z.object({
	uid: z.string().min(1),
	orderTotal: z.number().min(0),
	bonusesUsed: z.number().gt(0),
	storeId: z.string().min(1),
	idempotencyKey: z.string().min(8),
	orderId: z.string().min(1).optional()
});

const MAX_REDEEM_PERCENT = 0.30; // 30%

async function handler(req, res) {
	try {
		if (req.method !== 'POST') {
			res.status(405).json({ ok: false, error: 'Method not allowed' });
			return;
		}

		// Authn/Authz
		await verifyAuth(req, res);
		if (res.headersSent) return;
		await requireRole('staff', 'admin')(req, res, () => {});
		if (res.headersSent) return;

		// Parse + validate
		const body = await readJson(req, res);
		if (body === undefined) return;
		const parsed = BodySchema.safeParse(body);
		if (!parsed.success) {
			res.status(422).json({ ok: false, error: 'Validation failed' });
			return;
		}
		const { uid, orderTotal, bonusesUsed, storeId, idempotencyKey, orderId } = parsed.data;

		// Idempotency
		const idemRef = adminDb.collection('pos_idem').doc(idempotencyKey);
		const idemSnap = await idemRef.get();
		if (idemSnap.exists) {
			const d = idemSnap.data() || {};
			res.status(200).json({ ok: true, data: { balance: d.balance ?? null, txId: d.txId ?? null } });
			return;
		}

		// Ensure user exists (not found => 404)
		const userRef = adminDb.collection('users').doc(uid);
		const preSnap = await userRef.get();
		if (!preSnap.exists) {
			res.status(404).json({ ok: false, error: 'User not found' });
			return;
		}

		// Transactional redeem with limit checks
		const result = await adminDb.runTransaction(async (tx) => {
			const userSnap = await tx.get(userRef);
			const current = Number(userSnap.exists ? (userSnap.data().balance ?? 0) : 0) || 0;

			const maxByPercent = Math.floor(orderTotal * MAX_REDEEM_PERCENT);
			const allowed = Math.min(current, maxByPercent);
			if (bonusesUsed > allowed) {
				const e = new Error(`bonusesUsed exceeds limit (requested ${bonusesUsed}, allowed ${allowed})`);
				e.status = 422;
				throw e;
			}

			const nextBalance = current - Number(bonusesUsed);
			tx.set(userRef, { balance: nextBalance }, { merge: true });

			const ledgerRef = userRef.collection('ledger').doc();
			const txId = ledgerRef.id;
			tx.set(ledgerRef, {
				type: 'redeem',
				amount: -Number(bonusesUsed),
				cashierId: req.user?.uid || null,
				orderId: orderId || null,
				storeId,
				ts: new Date().toISOString()
			});

			tx.set(idemRef, {
				orderId: orderId || null,
				ts: new Date().toISOString(),
				amount: -Number(bonusesUsed),
				txId,
				balance: nextBalance,
				uid,
				storeId
			});

			return { balance: nextBalance, txId };
		});

		res.status(200).json({ ok: true, data: result });
	} catch (e) {
		if (e && e.status === 422) {
			res.status(422).json({ ok: false, error: e.message });
			return;
		}
		if (!res.headersSent) {
			res.status(500).json({ ok: false, error: 'Internal error' });
		}
	}
}

module.exports = withCors(handler);
