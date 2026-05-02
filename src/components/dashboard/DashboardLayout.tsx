import { useEffect } from 'react';
import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradeList } from './TradeList';
import { RequireWallet } from './RequireWallet';
import { useTradesOptimized as useTrades } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useWallets } from '@/hooks/useWallets';
import { useStore } from '@/store/useStore';

export function DashboardLayout() {
  const {
    trades,
    pnlData,
    tokenVolumes,
    totalVolume,
    totalTrades,
    isLoading: tradesLoading,
  } = useTrades({ limit: 100, daysAgo: 30 });
  const { wallets, isLoading: walletsLoading } = useWallets();
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

  if (walletsLoading) return null;
  if (wallets.length === 0) return <RequireWallet />;

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
      <TradeList trades={trades.slice(0, 5)} isLoading={tradesLoading} compact />
    </div>
  );
}
