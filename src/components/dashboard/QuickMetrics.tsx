import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
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

    let peak = 0,
      maxDd = 0,
      equity = 0;
    for (const t of trades) {
      equity += t.pnl_realized || 0;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDd) maxDd = dd;
    }

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
      maxDrawdown: maxDd,
      profitFactor,
      totalTrades: trades.length,
    };
  }, [trades]);

  const items = [
    {
      label: 'Win Rate',
      tooltip: 'Процент прибыльных сделок от общего количества.',
      value: `${metrics.winRate.toFixed(1)}%`,
      color: '',
    },
    {
      label: 'Ср. выигрыш',
      tooltip: 'Средняя прибыль по всем выигрышным сделкам.',
      value: formatUSD(metrics.avgWin),
      color: 'text-accent-green',
    },
    {
      label: 'Ср. проигрыш',
      tooltip: 'Средний убыток по всем убыточным сделкам.',
      value: formatUSD(metrics.avgLoss),
      color: 'text-accent-red',
    },
    {
      label: 'Total P&L',
      tooltip: 'Общая реализованная прибыль/убыток за выбранный период.',
      value: formatUSD(metrics.totalPnl),
      color: metrics.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'Макс. просадка',
      tooltip: 'Максимальное падение капитала от пика.',
      value: formatUSD(metrics.maxDrawdown),
      color: 'text-accent-red',
    },
    {
      label: 'Profit Factor',
      tooltip: 'Отношение прибыли к убыткам. >1 — хорошо.',
      value: metrics.profitFactor === 999 ? '∞' : metrics.profitFactor.toFixed(2),
      color: '',
    },
    { label: 'Сделок', tooltip: 'Общее количество сделок.', value: metrics.totalTrades, color: '' },
    {
      label: 'R/R средний',
      tooltip: 'Среднее соотношение риск/вознаграждение.',
      value: metrics.avgLoss > 0 ? `1:${(metrics.avgWin / metrics.avgLoss).toFixed(1)}` : '—',
      color: '',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((m) => (
        <Card key={m.label} padding="sm">
          <p className="text-[10px] text-text-muted uppercase flex items-center">
            {m.label}
            <Tooltip content={m.tooltip} />
          </p>
          <p className={`text-sm font-bold font-mono mt-0.5 ${m.color || 'text-text-primary'}`}>
            {m.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
