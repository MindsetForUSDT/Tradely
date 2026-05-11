// Обновленный TaxReport.tsx
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import { calculateFIFOTax } from '@/lib/taxCalculator';

export function TaxReport() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [year, setYear] = useState(new Date().getFullYear());

  const report = useMemo(() => {
    return calculateFIFOTax(trades, year);
  }, [trades, year]);

  return (
    <Card padding="md" className="max-w-lg">
      <h3 className="text-sm font-semibold mb-4 inline-flex items-center gap-1.5">
        <Icon name="tax" size={18} className="text-accent-green" />
        Налоговый отчёт (РФ, FIFO)
      </h3>
      <select
        value={year}
        onChange={(e) => setYear(+e.target.value)}
        className="w-full px-4 py-2 mb-4 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white"
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
          <span>{report.trades}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Выручка</span>
          <span>{formatUSD(report.totalProceeds)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Затраты (FIFO)</span>
          <span>{formatUSD(report.totalCostBasis)}</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-surface-border pt-2">
          <span>Результат</span>
          <span className={report.netGain >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {formatUSD(report.netGain)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Ставка</span>
          <span>{report.taxRate}%</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-surface-border">
          <span>Налог к уплате</span>
          <span className="text-accent-green">{formatUSD(report.taxAmount)}</span>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-4">
        Расчёт по методу FIFO. Ознакомьтесь с актуальным законодательством.
      </p>
    </Card>
  );
}
