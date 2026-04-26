// ============================================================
// TradeumDiary — Хук для получения дневной аналитики
// Данные из таблицы daily_analytics (только для PRO)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyAnalytics } from '@/types';
import { useAuth } from './useAuth';

interface UseAnalyticsReturn {
  analytics: DailyAnalytics[];
  todayAnalytics: DailyAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAnalytics(days = 30): UseAnalyticsReturn {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user || user.subscription_tier !== 'pro') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const { data, error: supabaseError } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sinceDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (supabaseError) throw supabaseError;

      setAnalytics(data as DailyAnalytics[]);
    } catch (err) {
      console.error('❌ Ошибка загрузки аналитики:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки аналитики');
    } finally {
      setIsLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Аналитика за сегодня
  const todayAnalytics = analytics.length > 0 ? analytics[0] : null;

  return {
    analytics,
    todayAnalytics,
    isLoading,
    error,
    refresh: fetchAnalytics,
  };
}