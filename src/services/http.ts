import { getAuth } from 'firebase/auth';
import { apiUrl } from '@/config/api';

type QueryParams = Parameters<typeof apiUrl>[1];

type RequestOptions = {
  query?: QueryParams;
  json?: unknown;
  headers?: HeadersInit;
  init?: RequestInit;
  forceRefresh?: boolean;
};

async function ensureIdToken(forceRefresh = false): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User is not authenticated');
  }

  return user.getIdToken(forceRefresh);
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, json, headers: customHeaders, init, forceRefresh } = options;
  const token = await ensureIdToken(forceRefresh);
  const headers = new Headers(customHeaders);
  headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  } else if (init?.body) {
    body = init.body;
  }

  const response = await fetch(apiUrl(path, query), {
    method,
    headers,
    body,
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error || response.statusText || 'Request failed';
    const error = new Error(message) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit, forceRefresh = false) {
  const token = await ensureIdToken(forceRefresh);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, {
    credentials: 'include',
    ...init,
    headers,
  });
}

export type HttpClient = typeof http;
