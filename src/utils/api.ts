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

export const FIREBASE_BASE = '/api';

export async function getFb(path: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const r = await fetch(`${FIREBASE_BASE}${path}${qs}`, {
    credentials: 'include'
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// Безопасные API запросы с проверкой Content-Type
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Безопасный API запрос с проверкой Content-Type и обработкой HTML ответов
 */
export async function safeApiRequest<T = unknown>(
  path: string, 
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = apiUrl(path, params);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Проверяем Content-Type ответа
    const contentType = response.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
      // Если получили HTML вместо JSON, читаем текст для диагностики
      const text = await response.text();
      console.error('API вернул не JSON:', {
        url,
        status: response.status,
        contentType,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : '')
      });
      
      return {
        success: false,
        error: `API вернул HTML вместо JSON. Возможно, сервис недоступен или URL неверный.`
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('Ошибка API запроса:', error);
    
    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      return {
        success: false,
        error: 'Сервер вернул некорректный JSON. Возможно, API сервис недоступен.'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Запрос с retry логикой для критически важных операций
 */
export async function safeApiRequestWithRetry<T = unknown>(
  path: string, 
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestInit,
  maxRetries: number = 2
): Promise<ApiResponse<T>> {
  let lastError: string = '';
  
  for (let i = 0; i <= maxRetries; i++) {
    const result = await safeApiRequest<T>(path, params, options);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error || 'Неизвестная ошибка';
    
    // Не повторяем запрос если это явно проблема с данными
    if (result.error?.includes('HTTP 4')) {
      break;
    }
    
    if (i < maxRetries) {
      // Ждем перед повторным запросом
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return {
    success: false,
    error: lastError
  };
}
