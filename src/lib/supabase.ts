import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

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

export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${supabaseUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}