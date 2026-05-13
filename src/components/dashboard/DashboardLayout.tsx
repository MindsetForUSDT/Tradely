// components/dashboard/DashboardLayout.tsx
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradeList } from './TradeList';
import { RequireWallet } from './RequireWallet';
import { SlideIn } from '@/components/ui/SlideIn';
import { useWallets } from '@/hooks/useWallets';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStore } from '@/store/useStore';

export function DashboardLayout() {
  const { wallets, isLoading: walletsLoading } = useWallets();

  if (walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#111318]">
        <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!wallets?.length) return <RequireWallet />;
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
      totalTrades: todayAnalytics?.total_trades ?? totalTrades,
      isLoading: tradesLoading || analyticsLoading,
    });
  }, [totalVolume, todayAnalytics, totalTrades, tradesLoading, analyticsLoading, setStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 relative">
      {/* Градиентные пятна для глубины */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-neon-magenta/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <SlideIn direction="down" delay={0.1}>
          <StatsOverview
            balance={totalVolume}
            pnl={todayAnalytics?.realized_pnl_usd ?? 0}
            trades={todayAnalytics?.total_trades ?? totalTrades}
            isLoading={tradesLoading || analyticsLoading}
          />
        </SlideIn>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <SlideIn direction="left" delay={0.2}>
            <PnLChart data={pnlData} isLoading={tradesLoading} />
          </SlideIn>
          <SlideIn direction="right" delay={0.3}>
            <VolumeByTokenChart data={tokenVolumes} isLoading={tradesLoading} />
          </SlideIn>
        </div>

        <SlideIn direction="up" delay={0.4} className="mt-8">
          <TradeList trades={trades} isLoading={tradesLoading} />
        </SlideIn>
      </div>
    </div>
  );
}
