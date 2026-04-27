import { useEffect, useState, useCallback } from 'react';
import { getToken, getUserId, clearSession, apiFetch } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
  trial_started_at: string | null;
  created_at: string;
}

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) return null;
    try {
      // Активируем триал при первом входе
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/activate_trial`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      });

      // Получаем профиль
      const data = await apiFetch(`/rest/v1/profiles?select=*&id=eq.${userId}`);
      return data?.[0] || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      loadProfile().then(p => { setUser(p); setIsLoading(false); });
    } else {
      setIsLoading(false);
    }
  }, [loadProfile]);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const p = await loadProfile();
    if (p) setUser(p);
  }, [loadProfile]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
  };
}