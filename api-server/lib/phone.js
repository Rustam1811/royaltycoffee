// api-server/lib/phone.js
// Нормализация телефонов в формат E.164 и простая валидация

/**
 * Привести телефон к формату E.164 (+<digits>)
 * - убрать всё кроме цифр
 * - если начинается с 8 и длина 11 => +7...
 * - если начинается с 7 => +7...
 * - если длина 10 (KZ/RU) => +7...
 * - иначе => +<digits>
 */
exports.toE164 = function toE164(input) {
  if (!input) return '';
  const raw = String(input);
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
};

/**
 * Простая проверка E.164: + и 8-15 цифр
 */
exports.isE164 = function isE164(str) {
  return typeof str === 'string' && /^\+\d{8,15}$/.test(str);
};
