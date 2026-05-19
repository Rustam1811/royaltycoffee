/**
 * Утилиты для безопасной работы с датами в формах
 * Предотвращают ошибки парсинга "The specified value '[object Object]' cannot be parsed"
 */

/**
 * Safely converts any date-like value (Date, string, Firestore Timestamp) to a JS Date
 */
interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

const isFirestoreTimestamp = (d: unknown): d is FirestoreTimestamp =>
  typeof d === 'object' && d !== null && typeof (d as FirestoreTimestamp).toDate === 'function';

const hasSeconds = (d: unknown): d is { seconds: number } =>
  typeof d === 'object' && d !== null && typeof (d as { seconds: number }).seconds === 'number';

const toDate = (d: unknown): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === 'string') return new Date(d);
  if (isFirestoreTimestamp(d)) return d.toDate();
  if (hasSeconds(d)) return new Date(d.seconds * 1000);
  return new Date(String(d));
};

/**
 * Конвертирует дату в ISO строку формата YYYY-MM-DD для input[type="date"]
 * @param d - Date объект, строка, Firestore Timestamp или null/undefined
 * @returns Строка в формате YYYY-MM-DD
 */
export const toISODate = (d: Date | string | null | undefined): string => {
  const dd = toDate(d);
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
  const dd = toDate(d);
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