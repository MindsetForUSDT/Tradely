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

// ✅ Ключ без вложенных массивов для лучшего кеширования
const PROFILE_QUERY_KEY = 'profile';

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const initialized = useRef(false);
  // ✅ Кешируем ID пользователя, чтобы не дёргать getSession()
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) {
        setSession(session);
        userIdRef.current = session.user.id;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        userIdRef.current = session?.user?.id ?? null;
        if (!session) {
          queryClient.clear();
          userIdRef.current = null;
        }
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
  } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, userIdRef.current],
    queryFn: async (): Promise<Profile | null> => {
      if (!userIdRef.current) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdRef.current)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userIdRef.current,
    // ✅ Данные профиля почти не меняются — кешируем надолго
    staleTime: 10 * 60 * 1000,  // 10 минут
    gcTime: 60 * 60 * 1000,     // 1 час
    retry: 2,
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    userIdRef.current = null;
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] });
  }, [queryClient]);

  return {
    user: user ?? null,
    // ✅ Не показываем загрузку, если просто обновляем данные в фоне
    isLoading: !user && !!session,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
  };
}