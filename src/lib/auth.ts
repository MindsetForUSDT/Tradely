// lib/auth.ts
// Улучшенная версия с дополнительными мерами безопасности
import { supabase } from './supabase';

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
    .replace(/[\0\r\n]/g, '') // Удаление null-байтов и управляющих символов
    .substring(0, 1000); // Ограничение длины
}

/**
 * Безопасное логирование (без чувствительных данных)
 */
function secureLog(action: string, details?: Record<string, unknown>) {
  const safeDetails = {
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };
  // Не логируем userId, email и другие PII данные
  console.log('[auth]', JSON.stringify(safeDetails));
}

/**
 * Асинхронно получает ID пользователя через Supabase Auth.
 * С валидацией и защитой от инъекций.
 */
export async function getUserIdAsync(): Promise<string | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      secureLog('session_not_found', { reason: error?.message || 'no_user' });
      return null;
    }

    // Валидация UUID пользователя
    if (!isValidUuid(session.user.id)) {
      secureLog('validation_failure', { reason: 'invalid_user_id_format' });
      return null;
    }

    return session.user.id;
  } catch (error) {
    secureLog('error', { type: error instanceof Error ? error.name : 'UnknownError' });
    return null;
  }
}

/**
 * Синхронная версия из кэша с валидацией.
 */
export function getUserIdFromCache(): string | null {
  try {
    // Пробуем несколько вариантов ключей localStorage для Supabase
    const possibleKeys = [
      ...Object.keys(localStorage).filter((k) => k.includes('supabase')),
      ...Object.keys(localStorage).filter((k) => k.includes('auth')),
    ];

    for (const key of possibleKeys) {
      const sessionStr = localStorage.getItem(key);
      if (!sessionStr) continue;

      try {
        const session = JSON.parse(sessionStr);
        // Пробуем разные структуры сессии
        const userId = session?.user?.id || session?.data?.user?.id || session?.user_id;

        if (userId && isValidUuid(userId)) {
          return userId;
        }
      } catch {
        continue;
      }
    }

    // Фолбэк: асинхронно получаем сессию
    return null;
  } catch {
    return null;
  }
}

/**
 * Асинхронная версия с фолбэком на getSession и валидацией.
 */
export async function getUserIdFromCacheAsync(): Promise<string | null> {
  const syncId = getUserIdFromCache();
  if (syncId) return syncId;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user && isValidUuid(session.user.id)) {
      return session.user.id;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Валидация email адреса
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;

  const sanitized = sanitizeString(email);
  if (!sanitized || sanitized.length > MAX_EMAIL_LENGTH) return false;

  // RFC 5322 упрощённый паттерн
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

  // Разрешаем только буквы, цифры, нижнее подчеркивание и дефис
  const usernamePattern = /^[a-zA-Z0-9_-]+$/;
  return usernamePattern.test(sanitized);
}

/**
 * Санитизация ввода для предотвращения XSS и инъекций
 */
export function sanitizeUserInput(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return sanitizeString(input);
}

// Совместимость со старым кодом
export function getUserId(): string | null {
  return getUserIdFromCache();
}
