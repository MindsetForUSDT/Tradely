// lib/auth.ts
import { supabase } from './supabase';

/**
 * Асинхронно получает ID пользователя через Supabase Auth.
 */
export async function getUserIdAsync(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.user) {
    console.warn('Auth session not found:', error?.message);
    return null;
  }
  return session.user.id;
}

/**
 * Синхронная версия из кэша.
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
        if (userId) return userId;
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
 * Асинхронная версия с фолбэком на getSession.
 */
export async function getUserIdFromCacheAsync(): Promise<string | null> {
  const syncId = getUserIdFromCache();
  if (syncId) return syncId;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// Совместимость со старым кодом
export function getUserId(): string | null {
  return getUserIdFromCache();
}
