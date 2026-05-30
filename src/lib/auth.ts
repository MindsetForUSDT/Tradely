// lib/auth.ts
// Улучшенная версия с дополнительными мерами безопасности

// Константы валидации
const MAX_USERNAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Валидация UUID
 */
function isValidUuid(id: unknown): boolean {
  return typeof id === 'string' && UUID_PATTERN.test(id);
}

/**
 * Санитизация строковых данных
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[\0\r\n]/g, '')
    .substring(0, 1000);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _secureLog(_action: string, _details?: Record<string, unknown>) {
  // Silent logging
}

/**
 * Получает ID пользователя из localStorage
 */
export function getUserIdAsync(): Promise<string | null> {
  const userId = localStorage.getItem('tradeumdiary-user-id');
  if (userId && isValidUuid(userId)) {
    return Promise.resolve(userId);
  }
  return Promise.resolve(null);
}

/**
 * Безопасный парсинг JSON
 */
function safeParseJson<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

interface UserSession {
  user?: { id?: string };
  data?: { user?: { id?: string } };
  user_id?: string;
}

/**
 * Синхронная версия из кэша
 */
export function getUserIdFromCache(): string | null {
  try {
    const userId = localStorage.getItem('tradeumdiary-user-id');
    if (userId && isValidUuid(userId)) return userId;

    const session = safeParseJson<UserSession>(localStorage.getItem('tradeumdiary-auth::session'));
    if (session) {
      const id = session.user?.id || session.data?.user?.id || session.user_id;
      if (id && isValidUuid(id)) return id;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Асинхронная версия
 */
export function getUserIdFromCacheAsync(): Promise<string | null> {
  return Promise.resolve(getUserIdFromCache());
}

/**
 * Валидация email адреса
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;

  const sanitized = sanitizeString(email);
  if (!sanitized || sanitized.length > MAX_EMAIL_LENGTH) return false;

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(sanitized);
}

/**
 * Валидация username
 */
export function isValidUsername(username: unknown): boolean {
  if (typeof username !== 'string') return false;

  const sanitized = sanitizeString(username);
  if (!sanitized || sanitized.length > MAX_USERNAME_LENGTH) return false;

  const usernamePattern = /^[a-zA-Z0-9_-]+$/;
  return usernamePattern.test(sanitized);
}

/**
 * Санитизация ввода
 */
export function sanitizeUserInput(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return sanitizeString(input);
}

// Совместимость со старым кодом
export function getUserId(): string | null {
  return getUserIdFromCache();
}

/**
 * Выход из аккаунта
 */
export function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    const keysToRemove = [
      'tradeumdiary-auth::session',
      'tradeumdiary-user',
      'tradeumdiary-user-id',
      'tradeumdiary-store',
      'tradeumdiary-api-token',
    ];
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Игнорируем ошибки
      }
    });
    return Promise.resolve({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ошибка выхода';
    return Promise.resolve({ success: false, error: message });
  }
}
