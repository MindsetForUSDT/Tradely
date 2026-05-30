// hooks/useTradesOptimized.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
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
  const isFetchingRef = useRef(false);

  // Стабильные фильтры — не пересоздаём объект
  const computedFilters = useMemo(() => {
    const f: typeof filters = {};
    if (filters.symbol) f.symbol = filters.symbol;
    if (filters.side) f.side = filters.side;
    if (filters.dateFrom) f.dateFrom = filters.dateFrom;
    if (filters.dateTo) f.dateTo = filters.dateTo;
    if (filters.walletId) f.walletId = filters.walletId;
    // Убираем автоматический фильтр daysAgo - пользователь должен явно указать dateFrom
    return f;
  }, [filters?.symbol, filters?.side, filters?.dateFrom, filters?.dateTo, filters?.walletId]);

  // Загрузка данных через API
  const fetchTrades = useCallback(
    async (append = false) => {
      // Защита от параллельных запросов
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const offset = append ? offsetRef.current : 0;

        const params: Record<string, string> = {
          limit: String(limit),
          offset: String(offset),
          orderBy,
          ascending: String(ascending),
        };

        if (computedFilters.symbol) params.symbol = computedFilters.symbol;
        if (computedFilters.side) params.side = computedFilters.side;
        if (computedFilters.dateFrom) params.dateFrom = computedFilters.dateFrom;
        if (computedFilters.dateTo) params.dateTo = computedFilters.dateTo;
        if (computedFilters.walletId) params.walletId = computedFilters.walletId;

        const data = await api.get<{ trades: Trade[]; total: number }>('/trades', params);

        if (append) {
          setTrades((prev) => [...prev, ...(data.trades || [])]);
        } else {
          setTrades(data.trades || []);
        }

        setTotalCount(data.total || 0);
        offsetRef.current = offset + (data.trades?.length || 0);
        setHasMore((data.trades?.length || 0) === limit);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Ошибка загрузки сделок';
        console.error('[useTradesOptimized] Error:', e);
        setError(message);
        if (!append) setTrades([]);
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
        isFetchingRef.current = false;
      }
    },
    [computedFilters, orderBy, ascending, limit]
  );

  // Загрузка при монтировании — только один раз
  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив — только при монтировании

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

      api.patch(`/trades/${tradeId}`, updates).catch(() => {
        refresh();
      });
    },
    [refresh]
  );

  // ✅ Производные данные для графиков и аналитики
  const pnlData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    let cumulative = 0;
    return [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((t) => {
        const pnl =
          typeof t.pnl_realized === 'number'
            ? t.pnl_realized
            : parseFloat(String(t.pnl_realized ?? '0'));
        cumulative += isNaN(pnl) ? 0 : pnl;
        return {
          date: t.timestamp,
          pnl: isNaN(pnl) ? 0 : pnl,
          cumulativePnl: cumulative,
        };
      });
  }, [trades]);

  const tokenVolumes = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    const map = new Map<string, number>();
    trades.forEach((t) => {
      const token = t.symbol?.split('/')[0] || 'Unknown';
      const value =
        typeof t.value_usd === 'number' ? t.value_usd : parseFloat(String(t.value_usd ?? '0'));
      map.set(token, (map.get(token) || 0) + (isNaN(value) ? 0 : value));
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

  const totalVolume = useMemo(() => {
    if (!trades || trades.length === 0) return 0;
    let sum = 0;
    trades.forEach((t) => {
      const value =
        typeof t.value_usd === 'number' ? t.value_usd : parseFloat(String(t.value_usd ?? '0'));
      sum += isNaN(value) ? 0 : value;
    });
    return sum;
  }, [trades]);

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
