import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,  // Не сохранять через библиотеку
    autoRefreshToken: false, // Не обновлять токен
    detectSessionInUrl: false, // Не парсить URL
  },
});

// Хелперы
export function getToken(): string | null {
  try {
    const data = localStorage.getItem('tradeumdiary-auth');
    return data ? JSON.parse(data).access_token : null;
  } catch { return null; }
}

export function getUserId(): string | null {
  try {
    const data = localStorage.getItem('tradeumdiary-auth');
    return data ? JSON.parse(data).user?.id : null;
  } catch { return null; }
}

export function clearSession(): void {
  localStorage.removeItem('tradeumdiary-auth');
}