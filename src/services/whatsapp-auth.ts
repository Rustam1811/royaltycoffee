/**
 * WhatsApp Phone Authentication Service
 */
import { API_CONFIG } from './apiConfig';

function getApiBase() {
  return `${API_CONFIG.BASE_URL}/auth`;
}

interface RequestCodeResponse {
  ok?: boolean;
  error?: string;
  retryAfter?: number;
}

interface VerifyCodeResponse {
  token?: string;
  error?: string;
  retryAfter?: number;
}

/**
 * Request OTP code via WhatsApp
 */
export async function requestWhatsAppCode(phone: string): Promise<RequestCodeResponse> {
  try {
    const response = await fetch(`${getApiBase()}/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    if (response.status === 429) {
      return { 
        error: 'Слишком много попыток. Подождите несколько минут.',
        retryAfter: data.retryAfter 
      };
    }

    if (!response.ok) {
      return { error: data.error || 'Ошибка отправки кода' };
    }

    return { ok: true };
  } catch (_err) {
    return { error: 'Ошибка сети. Проверьте подключение.' };
  }
}

/**
 * Verify OTP code and get JWT token
 */
export async function verifyWhatsAppCode(phone: string, code: string): Promise<VerifyCodeResponse> {
  try {
    const response = await fetch(`${getApiBase()}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });

    const data = await response.json();

    if (response.status === 429) {
      return { 
        error: 'Слишком много попыток. Подождите несколько минут.',
        retryAfter: data.retryAfter 
      };
    }

    if (!response.ok) {
      return { error: data.error || 'Неверный код' };
    }

    return { token: data.token };
  } catch (_err) {
    return { error: 'Ошибка сети. Проверьте подключение.' };
  }
}

/**
 * Normalize phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  // +7 (705) 309-62-06
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return phone;
}
