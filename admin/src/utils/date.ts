/**
 * Утилиты для безопасной работы с датами в формах
 * Предотвращают ошибки парсинга "The specified value '[object Object]' cannot be parsed"
 */

/**
 * Конвертирует дату в ISO строку формата YYYY-MM-DD для input[type="date"]
 * @param d - Date объект, строка или null/undefined
 * @returns Строка в формате YYYY-MM-DD
 */
export const toISODate = (d: Date | string | null | undefined): string => {
  if (!d) return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dd = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dd.getTime())) return new Date().toISOString().slice(0, 10);
  return dd.toISOString().slice(0, 10);
};

/**
 * Конвертирует ISO строку обратно в Date объект
 * @param s - Строка в формате YYYY-MM-DD
 * @returns Date объект
 */
export const fromISODate = (s: string | null | undefined): Date => {
  if (!s) return new Date();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Конвертирует дату в ISO строку формата YYYY-MM-DDTHH:mm для input[type="datetime-local"]
 * @param d - Date объект, строка или null/undefined
 * @returns Строка в формате YYYY-MM-DDTHH:mm
 */
export const toISODateTime = (d: Date | string | null | undefined): string => {
  if (!d) return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  const dd = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dd.getTime())) return new Date().toISOString().slice(0, 16);
  return dd.toISOString().slice(0, 16);
};

/**
 * Безопасно парсит строковое значение в число
 * @param value - Значение для парсинга
 * @param fallback - Значение по умолчанию
 * @returns Число или fallback
 */
export const safeParseNumber = (value: unknown, fallback: number = 0): number => {
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

/**
 * Безопасно конвертирует значение в строку для селектов
 * @param value - Значение для конвертации
 * @param fallback - Значение по умолчанию
 * @returns Строка
 */
export const safeStringValue = (value: unknown, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

/**
 * Безопасно извлекает массив из любого значения
 * @param value - Значение для проверки
 * @param fallback - Массив по умолчанию
 * @returns Массив
 */
export const safeArray = <T>(value: unknown, fallback: T[] = []): T[] => {
  return Array.isArray(value) ? value : fallback;
};