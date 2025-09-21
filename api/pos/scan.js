// POS: scan loyalty card / qr (Vercel handler)
// POST only. Body: { payload?: string, uid?: string, cardId?: string }

const { withCors } = require('../_lib/cors');
const { verifyAuth } = require('../_lib/verifyAuth');
const { requireRole } = require('../_lib/requireRole');
const parseJson = require('../_lib/json');
const { adminDb } = require('../_lib/firebaseAdmin');

function parseLoyaltyPayloadStrict(payload) {
	if (typeof payload !== 'string') return null;
	const p = payload.trim();
	if (!p) return null;
	if (!p.startsWith('loyalty:')) return null;
	try {
		const query = p.slice('loyalty:'.length);
		const params = new URLSearchParams(query);
		const uid = params.get('uid');
		return uid && uid.trim() ? { uid: uid.trim() } : null;
	} catch {
		return null;
	}
}

async function findUserByUid(db, uid) {
	const ref = db.collection('users').doc(uid);
	const snap = await ref.get();
	return snap.exists ? { uid: snap.id, data: snap.data() } : null;
}

async function findUserByCardId(db, cardId) {
	const col = db.collection('users');
	const q = await col.where('cardId', '==', cardId).limit(1).get();
	if (q.empty) return null;
	const d = q.docs[0];
	return { uid: d.id, data: d.data() };
}

async function handler(req, res) {
	try {
		if (req.method !== 'POST') {
			res.status(405).json({ ok: false, error: 'Method not allowed' });
			return;
		}

		await verifyAuth(req, res);
		if (res.headersSent) return;
		await requireRole('staff', 'admin')(req, res, () => {});
		if (res.headersSent) return;

		const body = await parseJson(req, res);
		if (body === undefined) return; // invalid json already handled

		const hasPayload = typeof body.payload === 'string' && body.payload.trim().length > 0;
		let uid = null;
		let cardId = null;

		if (hasPayload) {
			const parsed = parseLoyaltyPayloadStrict(body.payload);
			if (!parsed) {
				res.status(422).json({ ok: false, error: 'Unsupported code' });
				return;
			}
			uid = parsed.uid;
		} else {
			if (typeof body.uid === 'string' && body.uid.trim()) {
				uid = body.uid.trim();
			} else if (typeof body.cardId === 'string' && body.cardId.trim()) {
				cardId = body.cardId.trim();
			} else {
				res.status(422).json({ ok: false, error: 'Unsupported code' });
				return;
			}
		}

		let found = null;
		if (uid) {
			found = await findUserByUid(adminDb, uid);
		} else if (cardId) {
			found = await findUserByCardId(adminDb, cardId);
		}

		if (!found) {
			res.status(404).json({ ok: false, error: 'User not found' });
			return;
		}

		const balance = Number(found.data?.bonusBalance || found.data?.balance || 0);
		const name = found.data?.name || found.data?.displayName;
		const payload = { uid: found.uid, balance };
		if (name) payload.name = name;

		res.status(200).json({ ok: true, data: payload });
	} catch (e) {
		if (!res.headersSent) {
			res.status(500).json({ ok: false, error: 'Internal error' });
		}
	}
}

module.exports = withCors(handler);
