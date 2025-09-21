// POS: accrue bonuses for an order (Vercel handler)
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
	bonusesEarned: z.number().min(0),
	orderId: z.string().min(1).optional(),
	storeId: z.string().min(1),
	idempotencyKey: z.string().min(8)
});

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
		if (body === undefined) return; // readJson already sent 422
		const parsed = BodySchema.safeParse(body);
		if (!parsed.success) {
			res.status(422).json({ ok: false, error: 'Validation failed' });
			return;
		}
		const { uid, orderTotal, bonusesEarned, orderId, storeId, idempotencyKey } = parsed.data;

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

		// Transactional accrual & ledger
		const result = await adminDb.runTransaction(async (tx) => {
			const freshUserSnap = await tx.get(userRef);
			const current = Number(freshUserSnap.data()?.balance ?? 0) || 0;
			const nextBalance = current + Number(bonusesEarned);

			tx.set(userRef, { balance: nextBalance }, { merge: true });

			const ledgerRef = userRef.collection('ledger').doc();
			const txId = ledgerRef.id;
			tx.set(ledgerRef, {
				type: 'accrual',
				amount: Number(bonusesEarned),
				cashierId: req.user?.uid || null,
				orderId: orderId || null,
				storeId,
				ts: new Date().toISOString()
			});

			tx.set(idemRef, {
				orderId: orderId || null,
				ts: new Date().toISOString(),
				amount: Number(bonusesEarned),
				txId,
				balance: nextBalance,
				uid,
				storeId,
				orderTotal: Number(orderTotal)
			});

			return { balance: nextBalance, txId };
		});

		res.status(200).json({ ok: true, data: result });
	} catch (e) {
		if (!res.headersSent) {
			res.status(500).json({ ok: false, error: 'Internal error' });
		}
	}
}

module.exports = withCors(handler);
