// src/utils/phone.ts
export function sanitizePhone(input: string): string {
  // Оставляем только + и цифры
  return input.replace(/[^\d+]/g, '');
}

export function validateE164(phone: string): boolean {
  // E.164: опциональный +, затем 1-9, затем 7-14 цифр
  const e164Regex = /^\+?[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
}

export function formatPhoneForDisplay(phone: string): string {
  // Для отображения: +7 (XXX) XXX-XX-XX
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  }
  return phone;
}

export function ensurePlusPrefix(phone: string): string {
  // Добавляем + если его нет
  const sanitized = sanitizePhone(phone);
  return sanitized.startsWith('+') ? sanitized : '+' + sanitized;
}
