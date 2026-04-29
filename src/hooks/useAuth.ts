import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
  trial_started_at: string | null;
  created_at: string;
}

const PROFILE_QUERY_KEY = ['profile'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Защита от двойного вызова в StrictMode
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    // Получаем начальную сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
    });

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        if (!session) queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const {
    data: user,
    isLoading,
    refetch: refreshProfile,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async (): Promise<Profile | null> => {
      if (!session?.user?.id) return null;

      await supabase.rpc('activate_trial', {
        p_user_id: session.user.id,
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  return {
    user: user ?? null,
    isLoading: isLoading && !!session,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
  };
}