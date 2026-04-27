import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

export function useAuth(): AuthState {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      'apikey': key,
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    const data = await res.json();
    return data?.[0] || null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await loadProfile(session.user.id);
      setUser(profile);
    }
  }, [loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).then(setUser).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, isLoading, isAuthenticated: !!user, signOut, refreshProfile };
}