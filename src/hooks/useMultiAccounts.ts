import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { Trade } from '@/types';

interface WalletAccount {
  id: string;
  address: string;
  label?: string;
  cex_provider?: string;
}

interface AggregatedStats {
  totalVolume: number;
  totalTrades: number;
  totalPnl: number;
  byAccount: Array<{
    walletId: string;
    label: string;
    volume: number;
    trades: number;
    pnl: number;
  }>;
}

export function useMultiAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isPro = user?.subscription_tier === 'pro';
  const maxAccounts = isPro ? 5 : 1;

  useEffect(() => {
    let active = true;
    api
      .get<WalletAccount[]>('/wallets')
      .then((wallets) => {
        if (!active) return;
        setAccounts(wallets);
        if (wallets.length) setSelectedAccounts(new Set([wallets[0].id]));
      })
      .catch((error) => console.error('[useMultiAccounts] Error loading accounts:', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadAggregatedStats = useCallback(async () => {
    const ids = Array.from(selectedAccounts);
    if (!ids.length) {
      setAggregated(null);
      return;
    }

    try {
      const response = await api.get<{ trades: Trade[]; total: number }>('/trades', {
        limit: '500',
      });
      const trades = response.trades.filter((trade) =>
        trade.wallet_id ? ids.includes(trade.wallet_id) : false
      );
      const byAccount = accounts
        .filter((account) => selectedAccounts.has(account.id))
        .map((account) => {
          const accountTrades = trades.filter((trade) => trade.wallet_id === account.id);
          return {
            walletId: account.id,
            label:
              account.label ||
              account.cex_provider?.toUpperCase() ||
              account.address.slice(0, 8) ||
              'Источник',
            volume: accountTrades.reduce((sum, trade) => sum + Number(trade.value_usd || 0), 0),
            trades: accountTrades.length,
            pnl: accountTrades.reduce((sum, trade) => sum + Number(trade.pnl_realized || 0), 0),
          };
        });
      setAggregated({
        totalVolume: byAccount.reduce((sum, account) => sum + account.volume, 0),
        totalTrades: byAccount.reduce((sum, account) => sum + account.trades, 0),
        totalPnl: byAccount.reduce((sum, account) => sum + account.pnl, 0),
        byAccount,
      });
    } catch (error) {
      console.error('[useMultiAccounts] Error loading aggregated stats:', error);
    }
  }, [accounts, selectedAccounts]);

  useEffect(() => {
    void loadAggregatedStats();
  }, [loadAggregatedStats]);

  const toggleAccount = (walletId: string) => {
    setSelectedAccounts((current) => {
      const next = new Set(current);
      if (next.has(walletId)) {
        if (next.size > 1) next.delete(walletId);
      } else if (next.size < maxAccounts) {
        next.add(walletId);
      }
      return next;
    });
  };

  return { accounts, selectedAccounts, toggleAccount, aggregated, loading, maxAccounts, isPro };
}
