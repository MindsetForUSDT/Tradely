// lib/cache.ts — Кэширование данных на клиенте
const CACHE_PREFIX = 'tradeumdiary::';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

export const cache = {
  // Получить из кэша
  get<T>(key: string): { data: T; expired: boolean } | null {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();
      const expired = parsed.expiresAt && now > parsed.expiresAt;

      return {
        data: parsed.data,
        expired,
      };
    } catch {
      return null;
    }
  },

  // Сохранить в кэш
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    try {
      const item = {
        data,
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.warn('[Cache] Set error:', error);
    }
  },

  // Удалить из кэша
  remove(key: string): void {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.warn('[Cache] Remove error:', error);
    }
  },

  // Очистить весь кэш
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('[Cache] Clear error:', error);
    }
  },
};

// Хелперы для конкретных данных
export const userCache = {
  getUser: () => cache.get<unknown>('user'),
  setUser: (data: unknown) => cache.set('user', data),
  removeUser: () => cache.remove('user'),
};

export const walletsCache = {
  getWallets: (userId: string) => cache.get<unknown[]>(`wallets:${userId}`),
  setWallets: (userId: string, data: unknown[]) => cache.set(`wallets:${userId}`, data),
  removeWallets: (userId: string) => cache.remove(`wallets:${userId}`),
};

export const tradesCache = {
  getTrades: (userId: string) => cache.get<unknown[]>(`trades:${userId}`),
  setTrades: (userId: string, data: unknown[]) => cache.set(`trades:${userId}`, data),
  removeTrades: (userId: string) => cache.remove(`trades:${userId}`),
};
