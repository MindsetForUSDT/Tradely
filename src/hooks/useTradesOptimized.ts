// hooks/useTradesOptimized.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserIdFromCache } from '@/lib/auth';
import type { Trade } from '@/types';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'pnl_realized' | 'value_usd';
  ascending?: boolean;
  filters?: {
    symbol?: string;
    side?: 'buy' | 'sell';
    dateFrom?: string;
    dateTo?: string;
    walletId?: string;
  };
}

// ✅ Добавлены дополнительные поля для совместимости
interface UseTradesResult {
  trades: Trade[];
  totalCount: number;
  isLoading: boolean;
  isFetchingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  optimisticUpdate: (tradeId: string, updates: Partial<Trade>) => void;
  // ✅ Дополнительные поля для графиков и аналитики
  pnlData: Array<{ date: string; pnl: number; cumulativePnl: number }>;
  tokenVolumes: Array<{ token: string; volume: number; percentage: number }>;
  totalVolume: number;
  totalTrades: number;
}

export function useTradesOptimized(options: UseTradesOptions = {}): UseTradesResult {
  const { limit = 50, daysAgo, orderBy = 'timestamp', ascending = false, filters = {} } = options;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Автоматически вычисляем dateFrom из daysAgo
  const computedFilters = useMemo(() => {
    const f = { ...filters };
    if (daysAgo && !f.dateFrom) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      f.dateFrom = d.toISOString();
    }
    return f;
  }, [filters, daysAgo]);

  // Построение запроса
  const buildQuery = useCallback(() => {
    const uid = getUserIdFromCache();
    if (!uid) return null;

    let query = supabase.from('trades').select('*', { count: 'exact' }).eq('user_id', uid);

    if (computedFilters.symbol) query = query.ilike('symbol', `%${computedFilters.symbol}%`);
    if (computedFilters.side) query = query.eq('side', computedFilters.side);
    if (computedFilters.dateFrom) query = query.gte('timestamp', computedFilters.dateFrom);
    if (computedFilters.dateTo) query = query.lte('timestamp', computedFilters.dateTo);
    if (computedFilters.walletId) query = query.eq('wallet_id', computedFilters.walletId);

    return query;
  }, [computedFilters]);

  // Загрузка данных
  const fetchTrades = useCallback(
    async (append = false) => {
      const query = buildQuery();
      if (!query) {
        setIsLoading(false);
        return;
      }

      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const offset = append ? offsetRef.current : 0;

        const {
          data,
          error: fetchError,
          count,
        } = await query.order(orderBy, { ascending }).range(offset, offset + limit - 1);

        if (fetchError) {
          console.error('[useTradesOptimized] Fetch error:', fetchError);
          throw fetchError;
        }

        if (append) {
          setTrades((prev) => [...prev, ...(data || [])]);
        } else {
          setTrades(data || []);
        }

        setTotalCount(count || 0);
        offsetRef.current = offset + (data?.length || 0);
        setHasMore((data?.length || 0) === limit);
      } catch (e: any) {
        console.error('[useTradesOptimized] Error:', e);
        setError(e.message || 'Ошибка загрузки сделок');
        setTrades([]); // Очистить данные при ошибке
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [buildQuery, orderBy, ascending, limit]
  );

  // Подписка на real-time обновления
  useEffect(() => {
    const uid = getUserIdFromCache();
    if (!uid) return;

    fetchTrades();

    // Если подписка уже есть, не создаём новую
    if (subscriptionRef.current) {
      console.log('[useTradesOptimized] Subscription already exists, skipping');
      return;
    }

    subscriptionRef.current = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const newTrade = payload.new as Trade;
          setTrades((prev) => [newTrade, ...prev]);
          setTotalCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as Trade;
          setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [fetchTrades]);

  // Пагинация
  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    await fetchTrades(true);
  }, [hasMore, isFetchingMore, fetchTrades]);

  // Полное обновление
  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchTrades(false);
  }, [fetchTrades]);

  // Оптимистичное обновление
  const optimisticUpdate = useCallback(
    (tradeId: string, updates: Partial<Trade>) => {
      setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, ...updates } : t)));

      supabase
        .from('trades')
        .update(updates)
        .eq('id', tradeId)
        .then(({ error }) => {
          if (error) {
            refresh();
          }
        });
    },
    [refresh]
  );

  // ✅ Производные данные для графиков и аналитики
  const pnlData = useMemo(() => {
    let cumulative = 0;
    return [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((t) => {
        cumulative += t.pnl_realized || 0;
        return {
          date: t.timestamp,
          pnl: t.pnl_realized || 0,
          cumulativePnl: cumulative,
        };
      });
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t) => {
      const token = t.symbol?.split('/')[0] || 'Unknown';
      map.set(token, (map.get(token) || 0) + (t.value_usd || 0));
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([token, volume]) => ({
        token,
        volume,
        percentage: total > 0 ? (volume / total) * 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [trades]);

  const totalVolume = useMemo(() => trades.reduce((s, t) => s + (t.value_usd || 0), 0), [trades]);

  const totalTrades = trades.length;

  return {
    trades,
    totalCount,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    optimisticUpdate,
    // ✅ Новые поля
    pnlData,
    tokenVolumes,
    totalVolume,
    totalTrades,
  };
}
