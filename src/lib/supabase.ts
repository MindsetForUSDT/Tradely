import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Строгая проверка переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase credentials missing!',
    '\nVITE_SUPABASE_URL:',
    supabaseUrl ? '✅' : '❌',
    '\nVITE_SUPABASE_ANON_KEY:',
    supabaseAnonKey ? '✅' : '❌'
  );
  console.error('⚠️ Создаю заглушку Supabase клиента. Добавьте переменные в .env файл.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tradeumdiary-auth',
    storage: {
      // Кастомное хранилище с логированием
      getItem: (key) => {
        const value = localStorage.getItem(key);
        console.log('[Supabase Storage] GET', key, value ? '✅ found' : '❌ not found');
        return value;
      },
      setItem: (key, value) => {
        console.log('[Supabase Storage] SET', key);
        localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        console.log('[Supabase Storage] REMOVE', key);
        localStorage.removeItem(key);
      },
    },
  },
  global: {
    headers: { 'X-Client-Info': 'tradeumdiary-web' },
  },
});

// Добавляем отладку подключения
supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('[Supabase Debug] Initial session:', session ? '✅ exists' : '❌ no session');
  if (session) {
    console.log('[Supabase Debug] User ID:', session.user.id);
    console.log('[Supabase Debug] Email:', session.user.email);
  }
});
