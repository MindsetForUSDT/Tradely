// hooks/useMultiAccounts.ts — ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

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
    try {
      const response: any = await api.get('/wallets');
      setAccounts(response.wallets || []);
      if (response.wallets?.length) {
        setSelectedAccounts(new Set([response.wallets[0].id]));
      }
    } catch (error) {
      console.error('[useMultiAccounts] Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAggregatedStats = async () => {
    const ids = Array.from(selectedAccounts);
    if (!ids.length) return;

    try {
      const response: any = await api.get(`/trades?limit=10000`);
      const trades = (response.trades || []).filter((t: any) => ids.includes(t.wallet_id));

      const byAccount = accounts
        .filter((a) => selectedAccounts.has(a.id))
        .map((a) => {
          const accTrades = trades.filter((t: any) => t.wallet_id === a.id);
          return {
            walletId: a.id,
            label: a.label || a.address?.slice(0, 8) || a.exchange || 'Wallet',
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
    } catch (error) {
      console.error('[useMultiAccounts] Error loading aggregated stats:', error);
    }
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
