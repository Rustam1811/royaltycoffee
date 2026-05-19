import { getAuth } from 'firebase/auth';

async function headersWithAuth(extra?: HeadersInit) {
  const h = new Headers(extra);
  h.set('Content-Type', 'application/json');
  const u = getAuth().currentUser;
  if (u) h.set('Authorization', `Bearer ${await u.getIdToken(false)}`);
  return h;
}

async function request(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: await headersWithAuth(init.headers) });
  if (res.status !== 401) return res;
  const u = getAuth().currentUser;
  if (u) await u.getIdToken(true); // форс-рефреш
  return fetch(url, { ...init, headers: await headersWithAuth(init.headers) });
}

const BASE = '/api';

export const api = {
  async get(path: string) {
    const r = await request(`${BASE}/${path}`, { method: 'GET' });
    if (!r.ok) throw new Error(await r.text());
    return r.json().catch(() => ({}));
  },
  async post(path: string, body: unknown) {
    const r = await request(`${BASE}/${path}`, { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json().catch(() => ({}));
  }
};