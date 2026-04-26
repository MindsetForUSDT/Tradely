// ============================================================
// TradeumDiary — Supabase клиент (синглтон)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase'; // Будет сгенерирован позже

// Валидация переменных окружения на этапе загрузки
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ TradeumDiary: Отсутствуют переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY.\n' +
    'Скопируйте .env.example в .env и заполните реальными значениями.'
  );
}

// Создаём клиент с расширенными настройками
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Храним сессию в localStorage для персистентности
    persistSession: true,
    // Автоматически обновляем токен
    autoRefreshToken: true,
    // Обновляем за 10 минут до истечения
    refreshTokenMargin: 600,
    // Определяем сессию из URL (для OAuth и подтверждения email)
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  // Глобальные настройки запросов
  global: {
    headers: {
      'x-app-version': '1.0.0',
      'x-app-name': 'tradeumdiary',
    },
  },
});