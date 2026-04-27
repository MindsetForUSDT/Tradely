import { useState, useEffect, useCallback, useMemo } from 'react';

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

function getToken(): string | null {
  const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try { return JSON.parse(stored).access_token || null; } catch { return null; }
}

function getUserId(): string | null {
  const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try { return JSON.parse(stored).user?.id || null; } catch { return null; }
}

export function useTrades(options?: { limit?: number; daysAgo?: number }) {
  const { limit = 50, daysAgo = 30 } = options || {};
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) { setIsLoading(false); return; }

    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trades?user_id=eq.${userId}&timestamp=gte.${since.toISOString()}&order=timestamp.desc&limit=${limit}`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    setTrades(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [daysAgo, limit]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const pnlData = useMemo(() => {
    let cumulative = 0;
    return [...trades]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((t) => {
        const pnl = t.is_buy ? -t.value_usd : t.value_usd;
        cumulative += pnl;
        return { date: new Date(t.timestamp).toISOString().split('T')[0], pnl, cumulativePnl: cumulative };
      });
  }, [trades]);

  return {
    trades,
    isLoading,
    refresh: fetchTrades,
    pnlData,
    tokenVolumes: [],
    weekdayPerformance: [],
    totalVolume: trades.reduce((s, t) => s + t.value_usd, 0),
    totalTrades: trades.length,
  };
}