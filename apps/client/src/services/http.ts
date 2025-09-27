/* Client HTTP service with Firebase auth token injection */

// If your project has a centralized firebase client, adjust the import below.
// Here we import dynamically to avoid bundling if unused in SSR-like contexts.

async function getAuthToken(): Promise<string | null> {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function api(path: string, init: RequestInit = {}) {
  const baseUrl: string = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE || '/api';

  const token = await getAuthToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const opts: RequestInit = {
    ...init,
    method: init.method || 'GET',
    credentials: 'include',
    headers
  };

  const url = baseUrl.endsWith('/')
    ? baseUrl.replace(/\/$/, '') + path
    : baseUrl + (path.startsWith('/') ? path : `/${path}`);

  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      // ignore json parse errors
    }
    const error = new Error(`API ${res.status} ${res.statusText}`) as Error & { status?: number; detail?: unknown };
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  // Try JSON first; fall back to text
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const http = { api };
