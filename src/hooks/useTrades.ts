import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Trade {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_hash: string;
  timestamp: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  value_usd: number;
  is_buy: boolean;
}

interface UseTradesOptions {
  limit?: number;
  daysAgo?: number;
}

export function useTrades(options: UseTradesOptions = {}) {
  const { limit = 50, daysAgo = 30 } = options;
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysAgo);

    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', sinceDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);

    setTrades((data || []) as Trade[]);
    setIsLoading(false);
  }, [user, daysAgo, limit]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const pnlData = useMemo(() => {
    const map = new Map<string, { pnl: number }>();
    let cumulative = 0;
    return [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(t => {
      const date = new Date(t.timestamp).toISOString().split('T')[0];
      const pnl = t.is_buy ? -t.value_usd : t.value_usd;
      cumulative += pnl;
      return { date, pnl, cumulativePnl: cumulative };
    });
  }, [trades]);

  return { trades, isLoading, refresh: fetchTrades, pnlData, tokenVolumes: [], weekdayPerformance: [], totalVolume: trades.reduce((s, t) => s + t.value_usd, 0), totalTrades: trades.length };
}