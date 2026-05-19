import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.ALLOWED_ORIGINS = 'http://localhost:4000';

const verifyIdTokenMock = vi.fn();
let currentDb: ReturnType<typeof createFakeFirestore> | null = null;
let currentAdmin: ReturnType<typeof createFakeAdmin> | null = null;

vi.mock('../../src/server/firebaseAdmin', () => ({
  initFirebaseAdmin: vi.fn(() => {
    if (!currentDb || !currentAdmin) {
      throw new Error('Fake Firestore not initialised for test');
    }
    return { admin: currentAdmin, db: currentDb };
  }),
  verifyIdToken: (token: string) => verifyIdTokenMock(token),
}));

const scanRoute = require('../../api/pos/scan');
const accrueRoute = require('../../api/pos/accrue');
const redeemRoute = require('../../api/pos/redeem');

function createApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/pos/scan', scanRoute);
  app.post('/api/pos/accrue', accrueRoute);
  app.post('/api/pos/redeem', redeemRoute);
  return app;
}

function createFakeAdmin() {
  const now = () => ({
    toDate: () => new Date('2024-01-01T00:00:00.000Z'),
    seconds: 1704067200,
    nanoseconds: 0,
  });

  return {
    firestore: {
      Timestamp: { now },
    },
  };
}

function createFakeFirestore(seed: Record<string, any>) {
  const store = new Map<string, any>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  let idCounter = 0;

  const getDocSnapshot = (path: string) => {
    const entry = store.get(path);
    return {
      exists: entry !== undefined,
      data: () => (entry !== undefined ? clone(entry) : undefined),
      ref: makeDocRef(path),
    };
  };

  const makeDocRef = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const id = segments[segments.length - 1];

    return {
      id,
      path,
      collection: (name: string) => makeCollection(${path}/),
      async get() {
        return getDocSnapshot(path);
      },
      async set(data: any, options?: { merge?: boolean }) {
        if (options?.merge && store.has(path)) {
          const current = store.get(path) || {};
          store.set(path, { ...clone(current), ...clone(data) });
        } else {
          store.set(path, clone(data));
        }
      },
      async update(data: any) {
        if (!store.has(path)) {
          throw new Error(Document not found: );
        }
        const current = store.get(path) || {};
        store.set(path, { ...clone(current), ...clone(data) });
      },
    };
  };

  const makeCollection = (path: string) => ({
    path,
    doc(id?: string) {
      if (!id) {
        id = uto;
      }
      return makeDocRef(${path}/);
    },
  });

  const runTransaction = async (fn: (tx: any) => Promise<any>) => {
    const pending: Array<{ type: 'set' | 'update'; ref: ReturnType<typeof makeDocRef>; data: any; options?: any }> = [];
    const tx = {
      async get(ref: ReturnType<typeof makeDocRef>) {
        return getDocSnapshot(ref.path);
      },
      set(ref: ReturnType<typeof makeDocRef>, data: any, options?: any) {
        pending.push({ type: 'set', ref, data: clone(data), options });
      },
      update(ref: ReturnType<typeof makeDocRef>, data: any) {
        pending.push({ type: 'update', ref, data: clone(data) });
      },
    };

    const result = await fn(tx);

    for (const change of pending) {
      const { ref, data, options } = change;
      if (change.type === 'set') {
        if (options?.merge && store.has(ref.path)) {
          const current = store.get(ref.path) || {};
          store.set(ref.path, { ...clone(current), ...data });
        } else {
          store.set(ref.path, data);
        }
      } else if (change.type === 'update') {
        if (!store.has(ref.path)) {
          throw new Error(Document not found: );
        }
        const current = store.get(ref.path) || {};
        store.set(ref.path, { ...clone(current), ...data });
      }
    }

    return result;
  };

  Object.entries(seed).forEach(([path, value]) => {
    store.set(path, clone(value));
  });

  return {
    collection: (path: string) => makeCollection(path),
    runTransaction,
    _dump: () => store,
  };
}

function setTokenBehaviour() {
  verifyIdTokenMock.mockImplementation((token: string) => {
    if (token === 'staff-token') {
      return { uid: 'cashier-1', role: 'staff', roles: ['staff'] };
    }
    if (token === 'admin-token') {
      return { uid: 'cashier-admin', role: 'admin', roles: ['admin'] };
    }
    if (token === 'user-token') {
      return { uid: 'customer', role: 'user', roles: [] };
    }
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  });
}

describe('POS API', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    setTokenBehaviour();
    currentAdmin = createFakeAdmin();
    currentDb = createFakeFirestore({
      'users/user-1': { balance: 100, name: 'Alice', cardId: 'CARD-1' },
    });
  });

  it('rejects requests without Authorization header', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/pos/scan')
      .send({ payload: 'loyalty:uid=user-1&v=1' });

    expect(response.status).toBe(401);
  });

  it('rejects requests without staff/admin role', async () => {
    const app = createApp();
    verifyIdTokenMock.mockReturnValueOnce({ uid: 'customer', role: 'user', roles: [] });

    const response = await request(app)
      .post('/api/pos/scan')
      .set('Authorization', 'Bearer user-token')
      .send({ payload: 'loyalty:uid=user-1&v=1' });

    expect(response.status).toBe(403);
  });

  it('returns user info for valid scan payload', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/pos/scan')
      .set('Authorization', 'Bearer staff-token')
      .send({ payload: 'loyalty:uid=user-1&v=1' });

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(100);
    expect(response.body.uid).toBe('user-1');
  });

  it('accrues bonuses once per idempotency key', async () => {
    const app = createApp();

    const accruePayload = {
      uid: 'user-1',
      orderTotal: 100,
      bonusesEarned: 20,
      storeId: 'store-1',
      idempotencyKey: 'accrue-1',
    };

    const first = await request(app)
      .post('/api/pos/accrue')
      .set('Authorization', 'Bearer staff-token')
      .send(accruePayload);

    expect(first.status).toBe(200);
    expect(first.body.balance).toBe(120);
    expect(first.body.idempotent).toBe(false);

    const second = await request(app)
      .post('/api/pos/accrue')
      .set('Authorization', 'Bearer staff-token')
      .send(accruePayload);

    expect(second.status).toBe(200);
    expect(second.body.idempotent).toBe(true);

    const data = currentDb!._dump();
    const ledgerEntries = Array.from(data.keys()).filter((key) => key.startsWith('users/user-1/ledger/'));
    expect(ledgerEntries.length).toBe(1);
  });

  it('prevents redeem above balance or percentage cap', async () => {
    const app = createApp();
    const data = currentDb!._dump();
    data.set('users/user-1', { balance: 50, name: 'Alice' });

    const response = await request(app)
      .post('/api/pos/redeem')
      .set('Authorization', 'Bearer staff-token')
      .send({
        uid: 'user-1',
        orderTotal: 100,
        bonusesUsed: 40,
        storeId: 'store-1',
        idempotencyKey: 'redeem-over-cap',
      });

    expect(response.status).toBe(400);

    const responseBalance = await request(app)
      .post('/api/pos/redeem')
      .set('Authorization', 'Bearer staff-token')
      .send({
        uid: 'user-1',
        orderTotal: 100,
        bonusesUsed: 60,
        storeId: 'store-1',
        idempotencyKey: 'redeem-over-balance',
      });

    expect(responseBalance.status).toBe(400);
  });

  it('redeems bonuses respecting idempotency', async () => {
    const app = createApp();
    const data = currentDb!._dump();
    data.set('users/user-1', { balance: 90, name: 'Alice' });

    const redeemPayload = {
      uid: 'user-1',
      orderTotal: 200,
      bonusesUsed: 30,
      storeId: 'store-1',
      idempotencyKey: 'redeem-1',
    };

    const first = await request(app)
      .post('/api/pos/redeem')
      .set('Authorization', 'Bearer staff-token')
      .send(redeemPayload);

    expect(first.status).toBe(200);
    expect(first.body.balance).toBe(60);
    expect(first.body.idempotent).toBe(false);

    const second = await request(app)
      .post('/api/pos/redeem')
      .set('Authorization', 'Bearer staff-token')
      .send(redeemPayload);

    expect(second.status).toBe(200);
    expect(second.body.idempotent).toBe(true);

    const ledgerEntries = Array.from(currentDb!._dump().keys()).filter((key) => key.startsWith('users/user-1/ledger/'));
    expect(ledgerEntries.length).toBe(1);
  });
});
