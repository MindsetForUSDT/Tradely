// hooks/useTradesOptimized.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { SYNC_COMPLETED_EVENT } from '@/lib/syncEvents';
import { numeric } from '@/lib/tradeAnalytics';
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

export function normalizeTrade(trade: Trade): Trade {
  const priceUsd = numeric(trade.price_usd, numeric(trade.price));
  const feeUsd = numeric(trade.fee_usd, numeric(trade.fee));
  return {
    ...trade,
    amount: numeric(trade.amount),
    price: numeric(trade.price, priceUsd),
    price_usd: priceUsd,
    value_usd: numeric(trade.value_usd),
    fee: numeric(trade.fee, feeUsd),
    fee_usd: feeUsd,
    pnl_realized: numeric(trade.pnl_realized),
    pnl_percent: trade.pnl_percent === undefined ? undefined : numeric(trade.pnl_percent),
    holding_time_minutes:
      trade.holding_time_minutes === undefined ? undefined : numeric(trade.holding_time_minutes),
  };
}

export function hasMoreTrades(offset: number, receivedCount: number, totalCount: number): boolean {
  return offset + receivedCount < totalCount;
}

export function useTradesOptimized(options: UseTradesOptions = {}): UseTradesResult {
  const { limit = 50, daysAgo, orderBy = 'timestamp', ascending = false, filters = {} } = options;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const offsetRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Стабильные фильтры — не пересоздаём объект
  const computedFilters = useMemo(() => {
    const f: typeof filters = {};
    if (filters.symbol) f.symbol = filters.symbol;
    if (filters.side) f.side = filters.side;
    if (filters.dateFrom) {
      f.dateFrom = filters.dateFrom;
    } else if (daysAgo && daysAgo > 0) {
      const from = new Date();
      from.setDate(from.getDate() - daysAgo);
      f.dateFrom = from.toISOString();
    }
    if (filters.dateTo) f.dateTo = filters.dateTo;
    if (filters.walletId) f.walletId = filters.walletId;
    return f;
  }, [daysAgo, filters.symbol, filters.side, filters.dateFrom, filters.dateTo, filters.walletId]);

  // Загрузка данных через API
  const fetchTrades = useCallback(
    async (append = false, silent = false) => {
      // Защита от параллельных запросов
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (append) {
        setIsFetchingMore(true);
      } else if (!silent) {
        setIsLoading(true);
      }
      if (!silent) setError(null);

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

        const normalizedTrades = (data.trades || []).map(normalizeTrade);
        if (append) setTrades((prev) => [...prev, ...normalizedTrades]);
        else setTrades(normalizedTrades);

        const receivedCount = data.trades?.length || 0;
        const nextOffset = offset + receivedCount;
        const nextTotalCount = data.total || 0;

        setTotalCount(nextTotalCount);
        offsetRef.current = nextOffset;
        setHasMore(hasMoreTrades(offset, receivedCount, nextTotalCount));
        setError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Ошибка загрузки сделок';
        console.error('[useTradesOptimized] Error:', e);
        setError(message);
        if (!append && !silent) {
          setTrades([]);
          setHasMore(false);
        }
      } finally {
        if (!silent) setIsLoading(false);
        setIsFetchingMore(false);
        isFetchingRef.current = false;
      }
    },
    [computedFilters, orderBy, ascending, limit]
  );

  // Обновляем выборку при изменении периода, сортировки или фильтров.
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    const refreshInBackground = () => {
      if (document.visibilityState === 'visible') void fetchTrades(false, true);
    };
    const timer = window.setInterval(refreshInBackground, 60_000);
    window.addEventListener(SYNC_COMPLETED_EVENT, refreshInBackground);
    window.addEventListener('focus', refreshInBackground);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(SYNC_COMPLETED_EVENT, refreshInBackground);
      window.removeEventListener('focus', refreshInBackground);
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
