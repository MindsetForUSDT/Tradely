import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { VolumeByTokenChart } from '@/components/dashboard/VolumeByTokenChart';
import { WeekdayPerformanceChart } from '@/components/dashboard/WeekdayPerformanceChart';
import { formatUSD } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportCsv';
import { calculateSharpeRatio } from '@/lib/sharpe';

export function ProAnalytics() {
  const { trades, pnlData, tokenVolumes, weekdayPerformance, totalVolume, totalTrades } =
    useTradesOptimized({ limit: 500, daysAgo: 90 });
  const [activeTab, setActiveTab] = useState<'pnl' | 'volume' | 'weekday'>('pnl');

  const winningTrades = pnlData.filter((d: any) => d.pnl > 0).length;
  const winRate = pnlData.length ? ((winningTrades / pnlData.length) * 100).toFixed(1) : '0';
  const totalPnl = pnlData.reduce((s: number, d: any) => s + d.pnl, 0);

  const dailyReturns = pnlData.map((d: any) => d.pnl);
  const { sharpeRatio, sortinoRatio, annualizedReturn } = calculateSharpeRatio(dailyReturns);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PRO Аналитика</h1>
        <p className="text-text-muted text-sm">Расширенная статистика</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Sharpe Ratio', value: sharpeRatio.toFixed(2) },
          { label: 'Sortino Ratio', value: sortinoRatio.toFixed(2) },
          { label: 'Годовая доходность', value: `${annualizedReturn}%` },
          { label: 'Всего сделок', value: totalTrades },
          {
            label: 'Общий P&L',
            value: formatUSD(totalPnl),
            color: totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
          },
          { label: 'Общий объём', value: formatUSD(totalVolume) },
        ].map((m) => (
          <Card key={m.label} padding="md">
            <p className="text-xs text-text-muted mb-1">{m.label}</p>
            <p className={`text-xl font-bold font-mono ${m.color || 'text-text-primary'}`}>
              {m.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { key: 'pnl', label: 'P&L График' },
          { key: 'volume', label: 'Объёмы по токенам' },
          { key: 'weekday', label: 'По дням недели' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pnl' && <PnLChart data={pnlData} />}
      {activeTab === 'volume' && <VolumeByTokenChart data={tokenVolumes} />}
      {activeTab === 'weekday' && <WeekdayPerformanceChart data={weekdayPerformance} />}

      <Card padding="md">
        <h3 className="text-sm font-semibold mb-3">Экспорт данных</h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCsv(trades)}
            className="px-4 py-2 text-xs rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors font-medium"
          >
            📥 Скачать CSV
          </button>
          <button className="px-4 py-2 text-xs rounded-lg bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors">
            📄 PDF (скоро)
          </button>
        </div>
      </Card>
    </div>
  );
}
