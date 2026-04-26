// ============================================================
// TradeumDiary — Хук для работы со сделками
// Получение, фильтрация и агрегация данных о трейдах
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Trade, PnLDataPoint, TokenVolume, WeekdayPerformance } from '@/types';
import { useAuth } from './useAuth';

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

interface UseTradesReturn {
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Агрегированные данные для графиков
  pnlData: PnLDataPoint[];
  tokenVolumes: TokenVolume[];
  weekdayPerformance: WeekdayPerformance[];
  totalVolume: number;
  totalTrades: number;
}

export function useTrades(options: UseTradesOptions = {}): UseTradesReturn {
  const { limit = 50, daysAgo = 30 } = options;
  const { user } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysAgo);

      const { data, error: supabaseError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', sinceDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (supabaseError) throw supabaseError;

      setTrades(data as Trade[]);
    } catch (err) {
      console.error('❌ Ошибка загрузки сделок:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки сделок');
    } finally {
      setIsLoading(false);
    }
  }, [user, daysAgo, limit]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Расчёт данных для графика P&L
  const pnlData = useMemo(() => {
    const dailyMap = new Map<string, { pnl: number; trades: number }>();

    [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach((trade) => {
        const date = new Date(trade.timestamp).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { pnl: 0, trades: 0 };

        // Упрощённый расчёт P&L: для sell — разница между выходом и входом
        if (!trade.is_buy) {
          existing.pnl += (trade.amount_out - trade.amount_in) * (trade.value_usd / trade.amount_in);
        }
        existing.trades += 1;
        dailyMap.set(date, existing);
      });

    let cumulative = 0;
    return Array.from(dailyMap.entries()).map(([date, data]) => {
      cumulative += data.pnl;
      return {
        date,
        pnl: data.pnl,
        cumulativePnl: cumulative,
      };
    });
  }, [trades]);

  // Расчёт объёмов по токенам
  const tokenVolumes = useMemo(() => {
    const tokenMap = new Map<string, number>();
    let totalVolume = 0;

    trades.forEach((trade) => {
      const token = trade.is_buy ? trade.token_in : trade.token_out;
      const current = tokenMap.get(token) || 0;
      tokenMap.set(token, current + trade.value_usd);
      totalVolume += trade.value_usd;
    });

    return Array.from(tokenMap.entries())
      .map(([token, volume]) => ({
        token,
        volume,
        percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8); // Топ-8 токенов
  }, [trades]);

  // Расчёт прибыли по дням недели
  const weekdayPerformance = useMemo(() => {
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayMap = new Map<number, { profit: number; trades: number }>();

    dayNames.forEach((_, i) => dayMap.set(i, { profit: 0, trades: 0 }));

    trades.forEach((trade) => {
      const day = new Date(trade.timestamp).getDay();
      const existing = dayMap.get(day)!;

      if (!trade.is_buy) {
        existing.profit += (trade.amount_out - trade.amount_in) * (trade.value_usd / trade.amount_in);
      }
      existing.trades += 1;
    });

    return dayNames.map((day, i) => {
      const data = dayMap.get(i)!;
      return { day, profit: data.profit, trades: data.trades };
    });
  }, [trades]);

  const totalVolume = useMemo(() => trades.reduce((sum, t) => sum + t.value_usd, 0), [trades]);
  const totalTrades = trades.length;

  return {
    trades,
    isLoading,
    error,
    refresh: fetchTrades,
    pnlData,
    tokenVolumes,
    weekdayPerformance,
    totalVolume,
    totalTrades,
  };
}