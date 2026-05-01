import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchApi(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const get = useCallback(async (path: string) => { setLoading(true); try { return await fetchApi(path); } finally { setLoading(false); } }, []);
  const post = useCallback(async (path: string, body: any) => { setLoading(true); try { return await fetchApi(path, { method: 'POST', body: JSON.stringify(body) }); } finally { setLoading(false); } }, []);
  return { get, post, loading };
}