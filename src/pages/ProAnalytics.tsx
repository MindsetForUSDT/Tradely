// pages/ProAnalytics.tsx — ПРЕМИУМ ВЕРСИЯ
import { useMemo } from 'react';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { VolumeByTokenChart } from '@/components/dashboard/VolumeByTokenChart';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { QuickMetrics } from '@/components/dashboard/QuickMetrics';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { Card } from '@/components/ui/Card';
import { SlideIn } from '@/components/ui/SlideIn';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Icon } from '@/components/ui/Icons';
import { formatUSD } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function ProAnalytics() {
  const { trades, pnlData, tokenVolumes, totalVolume, totalTrades } = useTradesOptimized({
    limit: 5000,
    daysAgo: 90,
  });

  const dailyReturns = useMemo(() => pnlData.map((d: { pnl: number }) => d.pnl), [pnlData]);

  const winRate = useMemo(() => {
    if (!pnlData.length) return '0';
    const rate = (pnlData.filter((d: { pnl: number }) => d.pnl > 0).length / pnlData.length) * 100;
    return Number(rate).toFixed(1);
  }, [pnlData]);

  const totalPnl = useMemo(
    () => pnlData.reduce((s: number, d: { pnl: number }) => s + d.pnl, 0),
    [pnlData]
  );

  // Генерация данных по дням недели
  const weekdayPerformance = useMemo(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const map = new Map<string, { profit: number; trades: number }>();
    days.forEach((d) => map.set(d, { profit: 0, trades: 0 }));

    trades.forEach((t) => {
      const day =
        days[new Date(t.timestamp).getDay() === 0 ? 6 : new Date(t.timestamp).getDay() - 1];
      const entry = map.get(day)!;
      entry.profit += t.pnl_realized || 0;
      entry.trades++;
    });

    return Array.from(map.entries()).map(([day, data]) => ({
      day,
      profit: Number(data.profit),
      trades: data.trades,
    }));
  }, [trades]);

  // Расчёт продвинутых метрик
  const advancedMetrics = useMemo(() => {
    const winners = trades.filter((t) => (t.pnl_realized || 0) > 0);
    const losers = trades.filter((t) => (t.pnl_realized || 0) < 0);

    const avgWin = winners.length
      ? winners.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winners.length
      : 0;
    const avgLoss = losers.length
      ? Math.abs(losers.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losers.length
      : 0;

    const profitFactor =
      losers.length && losers.reduce((s: number, t) => s + (t.pnl_realized || 0), 0) !== 0
        ? winners.reduce((s, t) => s + (t.pnl_realized || 0), 0) /
          Math.abs(losers.reduce((s, t) => s + (t.pnl_realized || 0), 0))
        : winners.length > 0
          ? 999
          : 0;

    // Sharpe Ratio (упрощённый)
    const returns = pnlData.map((d) => d.pnl);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Максимальная серия побед/поражений
    let maxWinStreak = 0,
      currentWinStreak = 0;
    let maxLossStreak = 0,
      currentLossStreak = 0;

    trades.forEach((t) => {
      const pnl = t.pnl_realized || 0;
      if (pnl > 0) {
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        currentLossStreak = 0;
      } else if (pnl < 0) {
        currentLossStreak++;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        currentWinStreak = 0;
      }
    });

    return {
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      maxWinStreak,
      maxLossStreak,
      totalFees: trades.reduce((s: number, t) => s + (t.fee_usd || 0), 0),
      avgHoldingTime: trades.length
        ? trades.reduce((s, t) => s + (t.holding_time_minutes || 60), 0) / trades.length
        : 0,
    };
  }, [trades, pnlData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
      {/* Header */}
      <SlideIn direction="down" delay={0}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/20 via-accent-cyan/20 to-accent-green/20 blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-r from-surface-100 to-surface-200 rounded-2xl p-6 md:p-8 border border-surface-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                  <span className="text-4xl">💎</span>
                  <span className="bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
                    Pro Аналитика
                  </span>
                </h1>
                <p className="text-text-muted mt-2">
                  Институциональный уровень аналитики вашей торговли
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted uppercase mb-1">Pro подписка</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 border border-accent-purple/30">
                  <Icon name="pro" size={14} className="text-accent-purple" />
                  <span className="text-sm font-medium text-accent-purple">Active</span>
                </div>
              </div>
            </div>

            {/* Key Metrics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-surface-100/50 rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Total P&L</p>
                <p
                  className={cn(
                    'text-2xl font-bold font-mono',
                    totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                  )}
                >
                  {totalPnl >= 0 ? '+' : ''}
                  {formatUSD(totalPnl)}
                </p>
              </div>
              <div className="p-4 bg-surface-100/50 rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Win Rate</p>
                <p className="text-2xl font-bold font-mono text-accent-cyan">{winRate}%</p>
              </div>
              <div className="p-4 bg-surface-100/50 rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Sharpe Ratio</p>
                <p
                  className={cn(
                    'text-2xl font-bold font-mono',
                    advancedMetrics.sharpeRatio >= 1 ? 'text-accent-green' : 'text-text-primary'
                  )}
                >
                  {Number(advancedMetrics.sharpeRatio).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-surface-100/50 rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Profit Factor</p>
                <p
                  className={cn(
                    'text-2xl font-bold font-mono',
                    advancedMetrics.profitFactor >= 1.5 ? 'text-accent-green' : 'text-text-primary'
                  )}
                >
                  {advancedMetrics.profitFactor === 999
                    ? '∞'
                    : Number(advancedMetrics.profitFactor).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* Main Charts */}
      <StaggerContainer className="space-y-6">
        <ScrollReveal delay={0}>
          <div className="grid lg:grid-cols-2 gap-6">
            <PnLChart data={pnlData} />
            <EquityCurveChart data={pnlData} />
          </div>
        </ScrollReveal>

        {/* Advanced Metrics Grid */}
        <ScrollReveal delay={0.05}>
          <Card padding="lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📊</span> Продвинутая статистика
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-overlay rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Ср. выигрыш</p>
                <p className="text-xl font-bold font-mono text-accent-green">
                  {formatUSD(advancedMetrics.avgWin)}
                </p>
              </div>
              <div className="p-4 bg-surface-overlay rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Ср. проигрыш</p>
                <p className="text-xl font-bold font-mono text-accent-red">
                  {formatUSD(advancedMetrics.avgLoss)}
                </p>
              </div>
              <div className="p-4 bg-surface-overlay rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Макс. серия побед</p>
                <p className="text-xl font-bold font-mono text-accent-cyan">
                  {advancedMetrics.maxWinStreak}
                </p>
              </div>
              <div className="p-4 bg-surface-overlay rounded-xl">
                <p className="text-xs text-text-muted uppercase mb-1">Макс. серия поражений</p>
                <p className="text-xl font-bold font-mono text-accent-red">
                  {advancedMetrics.maxLossStreak}
                </p>
              </div>
            </div>
          </Card>
        </ScrollReveal>

        {/* Secondary Charts */}
        <ScrollReveal delay={0.1}>
          <div className="grid lg:grid-cols-3 gap-6">
            <VolumeByTokenChart data={tokenVolumes} />
            <WeekdayPerformanceChart data={weekdayPerformance} />
            <Card padding="lg">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <span>🤖</span> AI Insights
              </h3>
              <AIInsights />
            </Card>
          </div>
        </ScrollReveal>

        {/* Heatmap */}
        <ScrollReveal delay={0.15}>
          <HeatmapChart trades={trades} />
        </ScrollReveal>
      </StaggerContainer>
    </div>
  );
}
