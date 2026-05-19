// admin/src/utils/safeApi.ts
import { API_BASE } from '../config/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Безопасный API запрос для админки с проверкой Content-Type
 */
export async function safeApiRequest<T = unknown>(
  path: string, 
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = new URL(path.startsWith('/') ? path : `${API_BASE}/${path}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
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
        url: url.toString(),
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
 * Запрос с retry логикой
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
    
    if (result.error?.includes('HTTP 4')) {
      break;
    }
    
    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return {
    success: false,
    error: lastError
  };
}