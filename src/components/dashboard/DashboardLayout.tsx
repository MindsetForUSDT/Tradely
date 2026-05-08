import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradeList } from './TradeList';
import { RequireWallet } from './RequireWallet';
import { useWallets } from '@/hooks/useWallets';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';

export function DashboardLayout() {
  const { wallets, isLoading: walletsLoading } = useWallets();

  if (walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!wallets || wallets.length === 0) {
    return <RequireWallet />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const {
    trades,
    pnlData,
    tokenVolumes,
    totalVolume,
    totalTrades,
    isLoading: tradesLoading,
  } = useTradesOptimized({ limit: 100, daysAgo: 30 });
  const { todayAnalytics, isLoading: analyticsLoading } = useAnalytics();
  const setStats = useStore((s) => s.setStats);

  useEffect(() => {
    setStats({
      totalBalance: totalVolume,
      dailyPnl: todayAnalytics?.realized_pnl_usd ?? 0,
      dailyTrades: todayAnalytics?.total_trades ?? totalTrades,
      isLoading: tradesLoading || analyticsLoading,
    });
  }, [totalVolume, todayAnalytics, totalTrades, tradesLoading, analyticsLoading, setStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <StatsOverview
        balance={totalVolume}
        pnl={todayAnalytics?.realized_pnl_usd ?? 0}
        trades={todayAnalytics?.total_trades ?? totalTrades}
        isLoading={tradesLoading || analyticsLoading}
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <PnLChart data={pnlData} isLoading={tradesLoading} />
        <VolumeByTokenChart data={tokenVolumes} isLoading={tradesLoading} />
      </div>
      <TradeList trades={trades as any} isLoading={tradesLoading} compact />
    </div>
  );
}
