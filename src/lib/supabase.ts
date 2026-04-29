// ============================================================
// TradeumDiary — Supabase Client Singleton
// Правильная инициализация с реальным SDK, а не самописным REST
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
}

// Единый экземпляр клиента для всего приложения
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Сохраняем сессию в localStorage
    autoRefreshToken: true,      // Автоматически обновляем токен
    detectSessionInUrl: false,   // Не используем OAuth редиректы
    storageKey: 'tradeumdiary-auth', // Кастомный ключ
  },
  // Глобальные настройки для запросов
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
});

// Получение текущей сессии (не просто токен из localStorage!)
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Получение ID текущего пользователя
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

// Выход из системы
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}