// лёгкий обёртка над fetch с автоподстановкой токена и авто-рефрешем
import { apiUrl } from '@/config/api';

type Tokens = { accessToken: string | null; refreshToken: string | null };

let ACCESS_TOKEN: string | null = null;
let REFRESH_TOKEN: string | null = null;
let refreshingPromise: Promise<void> | null = null;

const STORAGE_KEY = 'auth_tokens_v1';

export const setAuthTokens = (access: string | null, refresh: string | null) => {
  ACCESS_TOKEN = access;
  REFRESH_TOKEN = refresh;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: access, refreshToken: refresh }));
};

export const clearAuthTokens = () => {
  ACCESS_TOKEN = null;
  REFRESH_TOKEN = null;
  localStorage.removeItem(STORAGE_KEY);
};

export const getStoredTokens = (): Tokens | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

async function refreshTokensOnce() {
  if (!REFRESH_TOKEN) throw new Error('No refresh token');
  const resp = await fetch(apiUrl('auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: REFRESH_TOKEN })
  });
  if (!resp.ok) throw new Error('Refresh failed');
  const data = await resp.json();
  if (!data.token) throw new Error('Bad refresh payload');
  setAuthTokens(data.token, data.refreshToken || REFRESH_TOKEN);
}

async function withAuthRetry(input: RequestInfo, init?: RequestInit) {
  // первый запрос
  const resp = await fetch(input, init);
  if (resp.status !== 401) return resp;

  // одна попытка рефреша на 401
  if (!refreshingPromise) {
    refreshingPromise = refreshTokensOnce().finally(() => {
      refreshingPromise = null;
    });
  }
  await refreshingPromise;

  // повтор
  const init2: RequestInit = {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {})
    }
  };
  return fetch(input, init2);
}

export const api = {
  async get(url: string) {
    const resp = await withAuthRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {})
      }
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  },
  async post(url: string, body: unknown) {
    const resp = await withAuthRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }
};

export const FIREBASE_BASE = '/firebase-api';

export async function getFb(path: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const r = await fetch(`${FIREBASE_BASE}${path}${qs}`, {
    credentials: 'include'
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
