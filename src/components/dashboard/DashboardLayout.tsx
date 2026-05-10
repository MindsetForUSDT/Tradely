import { useEffect } from 'react';
import { DataCard } from './DataCard';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Icon } from '@/components/ui/Icons';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradeList } from './TradeList';
import { RequireWallet } from './RequireWallet';
import { EmptyState } from './EmptyState';
import { DashboardShell } from './DashboardShell';
import { useWallets } from '@/hooks/useWallets';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStore } from '@/store/useStore';
import { formatUSD } from '@/lib/utils';
import { GlowButton } from '@/components/ui/GlowButton';
import { Link } from 'react-router-dom';

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

  const dailyPnl = todayAnalytics?.realized_pnl_usd ?? 0;

  return (
    <DashboardShell
      title="Торговый терминал"
      subtitle="Обзор вашей торговой активности"
      actions={
        <Link to="/dashboard/journal">
          <GlowButton size="sm" variant="outline">
            <Icon name="journal" size={14} />
            Журнал
          </GlowButton>
        </Link>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard
          label="Общий баланс"
          tooltip="Сумма объёмов всех сделок"
          value={formatUSD(totalVolume)}
          icon={<Icon name="wallet" size={16} className="text-neon-cyan" />}
          accent="cyan"
        />
        <DataCard
          label="P&L сегодня"
          tooltip="Прибыль/убыток за сегодня"
          value={`${dailyPnl >= 0 ? '+' : ''}${formatUSD(dailyPnl)}`}
          icon={
            <Icon
              name="chart"
              size={16}
              className={dailyPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}
            />
          }
          color={dailyPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}
          accent={dailyPnl >= 0 ? 'green' : 'red'}
        />
        <DataCard
          label="Сделок сегодня"
          tooltip="Количество сделок"
          value={todayAnalytics?.total_trades ?? totalTrades}
          icon={<Icon name="trades" size={16} className="text-white" />}
        />
      </div>

      {/* Charts */}
      {totalTrades > 0 ? (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <AnimatedCard delay={0}>
              <PnLChart data={pnlData} isLoading={tradesLoading} />
            </AnimatedCard>
            <AnimatedCard delay={1}>
              <VolumeByTokenChart data={tokenVolumes} isLoading={tradesLoading} />
            </AnimatedCard>
          </div>
          <AnimatedCard delay={2}>
            <TradeList trades={trades} isLoading={tradesLoading} compact />
          </AnimatedCard>
        </>
      ) : (
        <EmptyState
          icon="journal"
          title="Нет данных для отображения"
          description="Добавьте кошелёк или создайте первую сделку в журнале, чтобы увидеть графики и аналитику."
          action={{ label: 'Добавить кошелёк', to: '/dashboard/wallets' }}
        />
      )}
    </DashboardShell>
  );
}

export function DashboardLayout() {
  const { wallets, isLoading: walletsLoading } = useWallets();

  if (walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-950">
        <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!wallets?.length) return <RequireWallet />;
  return <DashboardContent />;
}
