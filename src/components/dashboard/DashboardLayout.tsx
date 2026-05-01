import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradeList } from './TradeList';
import { RequireWallet } from './RequireWallet';
import { useTrades } from '@/hooks/useTrades';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useWallets } from '@/hooks/useWallets';
import { useStore } from '@/store/useStore';

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardLayout() {
  const { trades, pnlData, tokenVolumes, totalVolume, totalTrades, isLoading: tradesLoading } = useTrades({
    limit: 100,
    daysAgo: 30,
  });
  const { todayAnalytics, isLoading: analyticsLoading } = useAnalytics();
  const { wallets } = useWallets();
  const setStats = useStore((s) => s.setStats);

  useEffect(() => {
    setStats({
      totalBalance: totalVolume,
      dailyPnl: todayAnalytics?.realized_pnl_usd ?? 0,
      dailyTrades: todayAnalytics?.total_trades ?? totalTrades,
      isLoading: tradesLoading || analyticsLoading,
    });
  }, [totalVolume, todayAnalytics, totalTrades, tradesLoading, analyticsLoading, setStats]);

  if (wallets.length === 0) {
    return <RequireWallet />;
  }

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