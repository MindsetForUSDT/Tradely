import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { formatUSD } from '@/lib/utils';

interface QuickMetricsProps {
  trades: any[];
}

export function QuickMetrics({ trades }: QuickMetricsProps) {
  const metrics = useMemo(() => {
    const winners = trades.filter((t) => (t.pnl_realized || 0) > 0);
    const losers = trades.filter((t) => (t.pnl_realized || 0) < 0);
    const totalPnl = trades.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);

    const winRate = trades.length ? (winners.length / trades.length) * 100 : 0;
    const avgWin = winners.length
      ? winners.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winners.length
      : 0;
    const avgLoss = losers.length
      ? Math.abs(losers.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losers.length
      : 0;
    const maxDrawdown = calculateMaxDrawdown(trades);
    const profitFactor =
      losers.length && losers.reduce((s, t) => s + (t.pnl_realized || 0), 0) !== 0
        ? winners.reduce((s, t) => s + (t.pnl_realized || 0), 0) /
          Math.abs(losers.reduce((s, t) => s + (t.pnl_realized || 0), 0))
        : winners.length > 0
          ? 999
          : 0;

    return {
      winRate,
      avgWin,
      avgLoss,
      totalPnl,
      maxDrawdown,
      profitFactor,
      totalTrades: trades.length,
    };
  }, [trades]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%` },
        { label: 'Ср. выигрыш', value: formatUSD(metrics.avgWin), color: 'text-accent-green' },
        { label: 'Ср. проигрыш', value: formatUSD(metrics.avgLoss), color: 'text-accent-red' },
        {
          label: 'Total P&L',
          value: formatUSD(metrics.totalPnl),
          color: metrics.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
        },
        {
          label: 'Макс. просадка',
          value: formatUSD(metrics.maxDrawdown),
          color: 'text-accent-red',
        },
        {
          label: 'Profit Factor',
          value: metrics.profitFactor === 999 ? '∞' : metrics.profitFactor.toFixed(2),
        },
        { label: 'Сделок', value: metrics.totalTrades },
        {
          label: 'R/R средний',
          value: metrics.avgLoss > 0 ? `1:${(metrics.avgWin / metrics.avgLoss).toFixed(1)}` : '—',
        },
      ].map((m) => (
        <Card key={m.label} padding="sm">
          <p className="text-[10px] text-text-muted uppercase">{m.label}</p>
          <p className={`text-sm font-bold font-mono mt-0.5 ${m.color || 'text-text-primary'}`}>
            {m.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

function calculateMaxDrawdown(trades: any[]): number {
  let peak = 0;
  let maxDd = 0;
  let equity = 0;
  for (const t of trades) {
    equity += t.pnl_realized || 0;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}
