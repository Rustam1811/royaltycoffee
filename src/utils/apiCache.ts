// Простой in-memory кэш для API запросов
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 минут по умолчанию

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.expiresIn;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.expiresIn;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Очистка всех записей, которые содержат определённый паттерн
  clearByPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

export const apiCache = new ApiCache();

// Хелпер для кэшированных fetch запросов
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  const cacheKey = `${url}-${JSON.stringify(options?.body || '')}`;

  // Проверяем кэш
  const cached = apiCache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Делаем запрос
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json() as T;

  // Сохраняем в кэш
  apiCache.set(cacheKey, data, ttl);

  return data;
}

// Хелпер для инвалидации кэша по ключу или паттерну
export function invalidateCache(keyOrPattern: string): void {
  if (apiCache.has(keyOrPattern)) {
    apiCache.delete(keyOrPattern);
  } else {
    apiCache.clearByPattern(keyOrPattern);
  }
}
