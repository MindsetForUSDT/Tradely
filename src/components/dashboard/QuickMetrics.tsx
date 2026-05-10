import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatUSD } from '@/lib/utils';

interface QuickMetricsProps {
  trades: any[];
}

export function QuickMetrics({ trades }: QuickMetricsProps) {
  const m = useMemo(() => {
    const winners = trades.filter((t: any) => (t.pnl_realized || 0) > 0);
    const losers = trades.filter((t: any) => (t.pnl_realized || 0) < 0);
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
      eq = 0;
    for (const t of trades) {
      eq += t.pnl_realized || 0;
      if (eq > peak) peak = eq;
      const dd = peak - eq;
      if (dd > maxDd) maxDd = dd;
    }
    const pf =
      losers.length && losers.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0) !== 0
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
      profitFactor: pf,
      totalTrades: trades.length,
    };
  }, [trades]);

  const items = [
    { label: 'Win Rate', tooltip: 'Процент прибыльных сделок.', value: `${m.winRate.toFixed(1)}%` },
    {
      label: 'Ср. выигрыш',
      tooltip: 'Средняя прибыль по выигрышным.',
      value: formatUSD(m.avgWin),
      color: 'text-accent-green',
    },
    {
      label: 'Ср. проигрыш',
      tooltip: 'Средний убыток по убыточным.',
      value: formatUSD(m.avgLoss),
      color: 'text-accent-red',
    },
    {
      label: 'Total P&L',
      tooltip: 'Общая прибыль/убыток.',
      value: formatUSD(m.totalPnl),
      color: m.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'Макс. просадка',
      tooltip: 'Максимальное падение капитала.',
      value: formatUSD(m.maxDrawdown),
      color: 'text-accent-red',
    },
    {
      label: 'Profit Factor',
      tooltip: 'Отношение прибыли к убыткам.',
      value: m.profitFactor === 999 ? '∞' : m.profitFactor.toFixed(2),
    },
    { label: 'Сделок', tooltip: 'Общее количество.', value: m.totalTrades },
    {
      label: 'R/R средний',
      tooltip: 'Соотношение риск/вознаграждение.',
      value: m.avgLoss > 0 ? `1:${(m.avgWin / m.avgLoss).toFixed(1)}` : '—',
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <ScrollReveal key={it.label} delay={i * 0.04}>
          <Card interactive padding="sm">
            <p className="text-[10px] text-text-muted uppercase flex items-center">
              {it.label}
              <Tooltip content={it.tooltip} />
            </p>
            <p className={`text-sm font-bold font-mono mt-0.5 ${it.color || 'text-text-primary'}`}>
              {it.value}
            </p>
          </Card>
        </ScrollReveal>
      ))}
    </StaggerContainer>
  );
}
