import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { VolumeByTokenChart } from '@/components/dashboard/VolumeByTokenChart';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { ExportPanel } from '@/components/dashboard/ExportPanel';
import { formatUSD } from '@/lib/utils';
import { calculateSharpeRatio } from '@/lib/sharpe';

export function ProAnalytics() {
  const { trades, pnlData, tokenVolumes, weekdayPerformance, totalVolume, totalTrades } =
    useTradesOptimized({ limit: 500, daysAgo: 90 });
  const [activeTab, setActiveTab] = useState<'pnl' | 'volume' | 'weekday' | 'equity' | 'heatmap'>(
    'pnl'
  );

  const dailyReturns = pnlData.map((d) => d.pnl);
  const { sharpeRatio, sortinoRatio, annualizedReturn } = calculateSharpeRatio(dailyReturns);
  const winRate = pnlData.length
    ? ((pnlData.filter((d) => d.pnl > 0).length / pnlData.length) * 100).toFixed(1)
    : '0';
  const totalPnl = pnlData.reduce((s, d) => s + d.pnl, 0);

  const proMetrics = [
    { label: 'Win Rate', tooltip: 'Процент прибыльных сделок за 90 дней.', value: `${winRate}%` },
    {
      label: 'Sharpe',
      tooltip: 'Коэффициент Шарпа: доходность на единицу риска. >1 — хорошо.',
      value: sharpeRatio.toFixed(2),
    },
    {
      label: 'Sortino',
      tooltip: 'Коэффициент Сортино: как Sharpe, но только downside-волатильность.',
      value: sortinoRatio.toFixed(2),
    },
    {
      label: 'Годовая дох.',
      tooltip: 'Аннуализированная доходность в процентах.',
      value: `${annualizedReturn}%`,
    },
    { label: 'Всего сделок', tooltip: 'Общее количество сделок за 90 дней.', value: totalTrades },
    {
      label: 'Общий P&L',
      tooltip: 'Суммарная прибыль/убыток за 90 дней.',
      value: formatUSD(totalPnl),
      color: totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'Общий объём',
      tooltip: 'Суммарный объём всех сделок в USD.',
      value: formatUSD(totalVolume),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PRO Аналитика</h1>
        <p className="text-text-muted text-sm">Расширенная статистика</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {proMetrics.map((m) => (
          <Card key={m.label} padding="md">
            <p className="text-xs text-text-muted mb-1 flex items-center">
              {m.label}
              <Tooltip content={m.tooltip} />
            </p>
            <p className={`text-xl font-bold font-mono ${m.color || 'text-text-primary'}`}>
              {m.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pnl' as const, label: 'P&L' },
          { key: 'volume' as const, label: 'Объёмы' },
          { key: 'weekday' as const, label: 'По дням' },
          { key: 'equity' as const, label: 'Equity' },
          { key: 'heatmap' as const, label: 'Тепловая карта' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pnl' && <PnLChart data={pnlData} />}
      {activeTab === 'volume' && <VolumeByTokenChart data={tokenVolumes} />}
      {activeTab === 'weekday' && <WeekdayPerformanceChart data={weekdayPerformance} />}
      {activeTab === 'equity' && <EquityCurveChart data={pnlData} />}
      {activeTab === 'heatmap' && <HeatmapChart trades={trades} />}

      <AIInsights />
      <ExportPanel />
    </div>
  );
}
