// src/services/api.ts
// Fetch helper with JSON parsing and Firebase ID token auth.

type Json = unknown;

const BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE?.trim() || '/api';
if (!BASE) throw new Error('VITE_API_BASE is missing. Set it in .env.production');

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

function toQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : '';
}

async function parseJsonOrThrowHTML(url: string, res: Response) {
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('application/json')) {
    const text = await res.text();
    console.error('[API NON-JSON]', { url, status: res.status, contentType: ctype, preview: text.slice(0, 200) });
    const err = new Error('NON_JSON_RESPONSE') as Error & { details?: unknown };
    err.details = { url, status: res.status, contentType: ctype, preview: text.slice(0, 200) };
    throw err;
  }
  return res.json() as Promise<Json>;
}

async function withAuth(init: RequestInit = {}): Promise<RequestInit> {
  try {
    const { auth } = await import('@/lib/firebase');
    const token = await auth.currentUser?.getIdToken?.();
    return { ...init, headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  } catch {
    return init;
  }
}

async function handle<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await parseJsonOrThrowHTML(url, res);
  if (!res.ok) {
    console.error('[API BAD_STATUS]', { url, status: res.status, body: data });
    const err = new Error('BAD_STATUS') as Error & { details?: unknown };
    err.details = { url, status: res.status, body: data };
    throw err;
  }
  return data as T;
}

class ApiClient {
  constructor(private base = BASE) {}

  async get<T = Json>(path: string, params?: Record<string, any>, init?: RequestInit) {
    const url = joinUrl(this.base, path) + toQuery(params);
    const req = await withAuth({
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
      ...init,
    });
    return handle<T>(url, req);
  }

  async post<T = Json>(path: string, body?: unknown, init?: RequestInit) {
    const url = joinUrl(this.base, path);
    const req = await withAuth({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    });
    return handle<T>(url, req);
  }

  async put<T = Json>(path: string, body?: unknown, init?: RequestInit) {
    const url = joinUrl(this.base, path);
    const req = await withAuth({
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    });
    return handle<T>(url, req);
  }

  async delete<T = Json>(path: string, init?: RequestInit) {
    const url = joinUrl(this.base, path);
    const req = await withAuth({
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers || {}) },
      ...init,
    });
    return handle<T>(url, req);
  }

  health(path: string = 'health') {
    return this.get<{ ok: boolean }>(path);
  }
}

export const api = new ApiClient();
export type { Json };
