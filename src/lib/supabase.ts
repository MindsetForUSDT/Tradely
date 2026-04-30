/**
 * TradeumDiary — Supabase Client Singleton
 *
 * Безопасность:
 * - Ключи только из ENV, не хардкодятся
 * - session persistence через localStorage с кастомным ключом
 * - autoRefresh включён для бесшовного обновления токенов
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || supabaseUrl.length === 0) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL is not set. Check your environment variables.'
  );
}

if (!supabaseAnonKey || supabaseAnonKey.length === 0) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_ANON_KEY is not set. Check your environment variables.'
  );
}

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'tradeumdiary-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
}

// Экспортируем готовый клиент
export const supabase: SupabaseClient = createSupabaseClient();