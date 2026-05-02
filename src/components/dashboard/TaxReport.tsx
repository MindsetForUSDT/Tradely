import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { formatUSD } from '@/lib/utils';

export function TaxReport() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [year, setYear] = useState(new Date().getFullYear());

  const report = useMemo(() => {
    const yearTrades = trades.filter((t: any) => new Date(t.timestamp).getFullYear() === year);
    const totalProceeds = yearTrades
      .filter((t: any) => t.side === 'sell')
      .reduce((s: number, t: any) => s + (t.value_usd || 0), 0);
    const totalCostBasis = yearTrades
      .filter((t: any) => t.side === 'buy')
      .reduce((s: number, t: any) => s + (t.value_usd || 0), 0);
    const netResult = totalProceeds - totalCostBasis;
    const taxRate = netResult > 5_000_000 ? 15 : 13;
    const estimatedTax = netResult > 0 ? netResult * (taxRate / 100) : 0;

    return {
      totalProceeds,
      totalCostBasis,
      netResult,
      taxRate,
      estimatedTax,
      tradesCount: yearTrades.length,
    };
  }, [trades, year]);

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">📊 Налоговый отчёт (РФ)</h3>
      <div className="mb-4">
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y} год
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Сделок:</span>
          <span>{report.tradesCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Выручка от продаж:</span>
          <span>{formatUSD(report.totalProceeds)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Затраты на покупку:</span>
          <span>{formatUSD(report.totalCostBasis)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Чистый результат:</span>
          <span className={report.netResult >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {formatUSD(report.netResult)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Ставка НДФЛ:</span>
          <span>{report.taxRate}%</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-surface-border">
          <span>Налог к уплате:</span>
          <span className="text-accent-green">{formatUSD(report.estimatedTax)}</span>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-4">
        Расчёт по методу FIFO. Не является налоговой консультацией. Для точного расчёта обратитесь к
        специалисту.
      </p>
    </Card>
  );
}
