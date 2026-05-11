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
    // Используем supabase.auth.getSession() синхронно из кэша
    const storageKey = Object.keys(localStorage).find((k) => k.includes('auth-token'));
    if (!storageKey) return null;

    const sessionStr = localStorage.getItem(storageKey);
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// Совместимость со старым кодом
export function getUserId(): string | null {
  return getUserIdFromCache();
}
