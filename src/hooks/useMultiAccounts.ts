import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

interface AggregatedStats {
  totalVolume: number;
  totalTrades: number;
  totalPnl: number;
  byAccount: {
    walletId: string;
    label: string;
    volume: number;
    trades: number;
    pnl: number;
  }[];
}

export function useMultiAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isPro = user?.subscription_tier === 'pro';
  const maxAccounts = isPro ? 5 : 1;

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccounts.size > 0) {
      loadAggregatedStats();
    }
  }, [selectedAccounts]);

  const loadAccounts = async () => {
    const uid = getUserId();
    if (!uid) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('added_at', { ascending: false })
      .limit(maxAccounts);
    setAccounts(data || []);
    if (data?.length) {
      setSelectedAccounts(new Set([data[0].id]));
    }
    setLoading(false);
  };

  const loadAggregatedStats = async () => {
    const ids = Array.from(selectedAccounts);
    if (!ids.length) return;

    const { data: trades } = await supabase
      .from('trades')
      .select('wallet_id, value_usd, pnl_realized')
      .in('wallet_id', ids);

    const byAccount = accounts
      .filter((a) => selectedAccounts.has(a.id))
      .map((a) => {
        const accTrades = (trades || []).filter((t: any) => t.wallet_id === a.id);
        return {
          walletId: a.id,
          label: a.label || a.address.slice(0, 8),
          volume: accTrades.reduce((s: number, t: any) => s + (t.value_usd || 0), 0),
          trades: accTrades.length,
          pnl: accTrades.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0),
        };
      });

    setAggregated({
      totalVolume: byAccount.reduce((s, a) => s + a.volume, 0),
      totalTrades: byAccount.reduce((s, a) => s + a.trades, 0),
      totalPnl: byAccount.reduce((s, a) => s + a.pnl, 0),
      byAccount,
    });
  };

  const toggleAccount = (walletId: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(walletId)) {
      if (next.size > 1) next.delete(walletId);
    } else {
      if (next.size < maxAccounts) next.add(walletId);
    }
    setSelectedAccounts(next);
  };

  return { accounts, selectedAccounts, toggleAccount, aggregated, loading, maxAccounts, isPro };
}
