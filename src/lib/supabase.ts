import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================
// ВАЛИДАЦИЯ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
// ============================================
const isDev = import.meta.env.DEV;
const hasCredentials = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (isDev && !hasCredentials) {
  console.warn(
    '⚠️ Supabase credentials missing. ' +
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

// ============================================
// CUSTOM STORAGE С FALLBACK
// ============================================
const createStorage = () => {
  const prefix = 'tradeumdiary-auth::';

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const value = localStorage.getItem(prefix + key);
        if (isDev) {
          console.log('[Storage] GET', { key, found: !!value });
        }
        return value;
      } catch (error) {
        console.error('[Storage] GET error:', error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        localStorage.setItem(prefix + key, value);
        if (isDev) {
          console.log('[Storage] SET', { key });
        }
      } catch (error) {
        console.error('[Storage] SET error:', error);
        throw error;
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        localStorage.removeItem(prefix + key);
        if (isDev) {
          console.log('[Storage] REMOVE', { key });
        }
      } catch (error) {
        console.error('[Storage] REMOVE error:', error);
      }
    },
  };
};

// ============================================
// КОНФИГУРАЦИЯ CLIENT
// ============================================
const options: SupabaseClientOptions<'public'> = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tradeumdiary-auth',
    storage: createStorage(),
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'tradeumdiary-web',
      Accept: 'application/json',
    },
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('[Supabase API] Error:', {
            url,
            status: response.status,
            statusText: response.statusText,
          });
        }

        return response;
      } catch (error) {
        console.error('[Supabase API] Network error:', {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// ============================================
// СОЗДАНИЕ CLIENT С HEALTH CHECK
// ============================================
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || '',
  options
);

// ============================================
// HEALTH CHECK ПРИ ИНИЦИАЛИЗАЦИИ
// ============================================
if (isDev) {
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('[Supabase Health] Session check failed:', error);
    } else if (session) {
      const expiresAt = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : 'N/A';
      console.log('[Supabase Health] ✅ Session active', {
        userId: session.user.id,
        email: session.user.email,
        expiresAt,
      });
    } else {
      console.log('[Supabase Health] ℹ️ No session (expected for logged out users)');
    }
  });
}
