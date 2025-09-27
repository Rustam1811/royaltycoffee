import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const verifierMock = vi.fn(async (token: string) => {
  if (token === 'admin-token') {
    return { uid: 'admin-user', role: 'admin' };
  }
  if (token === 'user-token') {
    return { uid: 'regular-user', role: 'user' };
  }
  throw new Error('invalid token');
});

const { withAuth, __setTokenVerifier } = require('../../src/server/http/withAuth');

describe('withAuth middleware', () => {
  beforeEach(() => {
    verifierMock.mockClear();
    __setTokenVerifier(verifierMock);
  });

  it('rejects requests without Authorization header', async () => {
    const app = express();
    app.get('/secure', withAuth((_req, res) => res.json({ ok: true })));

    const response = await request(app).get('/secure');
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('rejects requests without required role', async () => {
    const app = express();
    app.get('/admin-only', withAuth((_req, res) => res.json({ ok: true }), { requireRole: 'admin' }));

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    expect(verifierMock).toHaveBeenCalled();
  });

  it('allows authorized requests with valid role', async () => {
    const app = express();
    app.get(
      '/admin-only',
      withAuth((req, res) => res.json({ ok: true, uid: req.user.uid }), { requireRole: 'admin' })
    );

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.uid).toBe('admin-user');
    expect(verifierMock).toHaveBeenCalled();
  });
});
