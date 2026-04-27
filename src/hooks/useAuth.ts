import { useEffect, useState, useCallback } from 'react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
  created_at: string;
}

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function getToken(): string | null {
  const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored).access_token || null;
  } catch {
    return null;
  }
}

function getUserId(): string | null {
  const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored).user?.id || null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getProfile = async () => {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return null;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${userId}`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const arr = await res.json();
    return arr?.[0] || null;
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      getProfile().then(setUser).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
    localStorage.removeItem(key);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const p = await getProfile();
    setUser(p);
  }, []);

  return { user, isLoading, isAuthenticated: !!user, signOut, refreshProfile };
}