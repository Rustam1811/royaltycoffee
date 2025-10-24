import { API_CONFIG } from './apiConfig';
import { api } from './api';
import { normalizePhoneNumber } from '../utils/phone';

export async function getUserBonus(phone: string): Promise<number> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const digitsOnly = (phone ?? '').replace(/\D/g, '');
  const res = await api.get(API_CONFIG.ENDPOINTS.USER_BONUS, {
    action: 'get',
    phone: normalizedPhone || digitsOnly || phone,
    originalPhone: digitsOnly || phone,
  });
  if (typeof res?.bonus === 'number') return res.bonus;
  return 0;
}

export async function useUserBonus(phone: string, amount: number): Promise<{ success: boolean; bonus: number }> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const digitsOnly = (phone ?? '').replace(/\D/g, '');
  const res = await api.post(API_CONFIG.ENDPOINTS.USE_BONUS, {
    action: 'use',
    phone: normalizedPhone || digitsOnly || phone,
    originalPhone: digitsOnly || phone,
    amount,
  });
  return { success: !!res?.success, bonus: typeof res?.bonus === 'number' ? res.bonus : 0 };
}

export default { getUserBonus, useUserBonus };

