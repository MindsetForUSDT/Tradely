import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import type { Trade } from '@/types';

export function TaxReport() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [year, setYear] = useState(new Date().getFullYear());

  const report = useMemo(() => {
    const yearTrades = trades.filter((t: Trade) => new Date(t.timestamp).getFullYear() === year);
    const totalProceeds = yearTrades
      .filter((t: Trade) => t.side === 'sell')
      .reduce((s, t) => s + (t.value_usd || 0), 0);
    const totalCostBasis = yearTrades
      .filter((t: Trade) => t.side === 'buy')
      .reduce((s, t) => s + (t.value_usd || 0), 0);
    const net = totalProceeds - totalCostBasis;
    const taxRate = net > 5_000_000 ? 15 : 13;
    const tax = net > 0 ? net * (taxRate / 100) : 0;
    return { totalProceeds, totalCostBasis, net, taxRate, tax, count: yearTrades.length };
  }, [trades, year]);

  return (
    <Card padding="md" className="max-w-lg">
      <h3 className="text-sm font-semibold mb-4 inline-flex items-center gap-1.5">
        <Icon name="tax" size={18} className="text-accent-green" />
        Налоговый отчёт (РФ)
      </h3>
      <select
        value={year}
        onChange={(e) => setYear(+e.target.value)}
        className="w-full px-4 py-2 mb-4 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
      >
        {[2024, 2025, 2026].map((y) => (
          <option key={y} value={y}>
            {y} год
          </option>
        ))}
      </select>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Сделок</span>
          <span>{report.count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Выручка</span>
          <span>{formatUSD(report.totalProceeds)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Затраты</span>
          <span>{formatUSD(report.totalCostBasis)}</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-surface-border pt-2">
          <span>Результат</span>
          <span className={report.net >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {formatUSD(report.net)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Ставка</span>
          <span>{report.taxRate}%</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-surface-border">
          <span>Налог</span>
          <span className="text-accent-green">{formatUSD(report.tax)}</span>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-4">
        Расчёт по FIFO. Не является налоговой консультацией.
      </p>
      <button
        onClick={() => window.print()}
        className="mt-4 w-full py-2 text-xs rounded-lg bg-surface-overlay text-text-secondary hover:text-text-primary transition-colors inline-flex items-center justify-center gap-1.5"
      >
        <Icon name="export-pdf" size={14} /> Печать / PDF
      </button>
    </Card>
  );
}
