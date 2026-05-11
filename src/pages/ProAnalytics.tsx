// pages/ProAnalytics.tsx — ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useMemo } from 'react';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { VolumeByTokenChart } from '@/components/dashboard/VolumeByTokenChart';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { QuickMetrics } from '@/components/dashboard/QuickMetrics';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

export function ProAnalytics() {
  const { trades, pnlData, tokenVolumes, totalVolume, totalTrades } = useTradesOptimized({
    limit: 5000,
    daysAgo: 90,
  });

  const dailyReturns = useMemo(() => pnlData.map((d: { pnl: number }) => d.pnl), [pnlData]);

  const winRate = useMemo(() => {
    if (!pnlData.length) return '0';
    return (
      (pnlData.filter((d: { pnl: number }) => d.pnl > 0).length / pnlData.length) *
      100
    ).toFixed(1);
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
      profit: +data.profit.toFixed(2),
      trades: data.trades,
    }));
  }, [trades]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <QuickMetrics trades={trades} />

      <div className="grid lg:grid-cols-2 gap-6">
        <PnLChart data={pnlData} />
        <EquityCurveChart data={pnlData} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <VolumeByTokenChart data={tokenVolumes} />
        <WeekdayPerformanceChart data={weekdayPerformance} />
        <AIInsights />
      </div>

      <HeatmapChart trades={trades} />
    </div>
  );
}
