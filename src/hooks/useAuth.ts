// ============================================================
// TradeumDiary — Хук аутентификации с кешированием
// React Query гарантирует, что профиль загружается один раз
// и доступен всем компонентам без повторных запросов
// ============================================================

import { useEffect, useState, useCallback } from 'react';
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

// Уникальный ключ для кеша React Query
const PROFILE_QUERY_KEY = ['profile'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(() => null);

  // Отслеживаем изменения сессии
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // При выходе — сбрасываем весь кеш
      if (!session) {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Загрузка профиля через React Query
  const {
    data: user,
    isLoading,
    error,
    refetch: refreshProfile
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async (): Promise<Profile | null> => {
      if (!session?.user?.id) return null;

      // Активируем триал при первом входе
      await supabase.rpc('activate_trial', {
        p_user_id: session.user.id,
      });

      // Получаем профиль через SDK, а не fetch()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,    // Запрос только при наличии сессии
    staleTime: 5 * 60 * 1000,        // 5 минут считаем данные свежими
    gcTime: 30 * 60 * 1000,           // 30 минут храним в кеше после unmount
    retry: 2,                         // 2 ретрая при ошибке
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  return {
    user: user ?? null,
    isLoading: isLoading && !!session, // Не показываем загрузку, если нет сессии
    isAuthenticated: !!user,
    error,
    signOut,
    refreshProfile,
  };
}