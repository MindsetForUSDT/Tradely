import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
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
  const dr = pnlData.map((d) => d.pnl);
  const { sharpeRatio, sortinoRatio, annualizedReturn } = calculateSharpeRatio(dr);
  const winRate = pnlData.length
    ? ((pnlData.filter((d) => d.pnl > 0).length / pnlData.length) * 100).toFixed(1)
    : '0';
  const totalPnl = pnlData.reduce((s, d) => s + d.pnl, 0);

  const metrics = [
    { label: 'Win Rate', tooltip: 'Прибыльных сделок за 90 дней.', value: `${winRate}%` },
    { label: 'Sharpe', tooltip: 'Доходность на единицу риска.', value: sharpeRatio.toFixed(2) },
    { label: 'Sortino', tooltip: 'Sharpe только по downside.', value: sortinoRatio.toFixed(2) },
    {
      label: 'Годовая дох.',
      tooltip: 'Аннуализированная доходность.',
      value: `${annualizedReturn}%`,
    },
    { label: 'Всего сделок', tooltip: 'За 90 дней.', value: totalTrades },
    {
      label: 'Общий P&L',
      tooltip: 'Суммарный результат.',
      value: formatUSD(totalPnl),
      color: totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    { label: 'Общий объём', tooltip: 'Суммарный объём.', value: formatUSD(totalVolume) },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <ScrollReveal>
        <h1 className="text-2xl font-bold">PRO Аналитика</h1>
        <p className="text-text-muted text-sm">Расширенная статистика</p>
      </ScrollReveal>

      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <ScrollReveal key={m.label} delay={i * 0.06}>
            <Card interactive padding="md">
              <p className="text-xs text-text-muted mb-1 flex items-center">
                {m.label}
                <Tooltip content={m.tooltip} />
              </p>
              <p className={`text-xl font-bold font-mono ${m.color || 'text-text-primary'}`}>
                {m.value}
              </p>
            </Card>
          </ScrollReveal>
        ))}
      </StaggerContainer>

      <div className="flex gap-2 flex-wrap">
        {(['pnl', 'volume', 'weekday', 'equity', 'heatmap'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            {t === 'pnl'
              ? 'P&L'
              : t === 'volume'
                ? 'Объёмы'
                : t === 'weekday'
                  ? 'По дням'
                  : t === 'equity'
                    ? 'Equity'
                    : 'Тепловая карта'}
          </button>
        ))}
      </div>

      {activeTab === 'pnl' && <PnLChart data={pnlData} />}
      {activeTab === 'volume' && <VolumeByTokenChart data={tokenVolumes} />}
      {activeTab === 'weekday' && <WeekdayPerformanceChart data={weekdayPerformance} />}
      {activeTab === 'equity' && <EquityCurveChart data={pnlData} />}
      {activeTab === 'heatmap' && <HeatmapChart trades={trades} />}

      <ScrollReveal>
        <AIInsights />
      </ScrollReveal>
      <ScrollReveal>
        <ExportPanel />
      </ScrollReveal>
    </div>
  );
}
