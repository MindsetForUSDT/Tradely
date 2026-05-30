import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StaggerContainer } from '@/components/ui/StaggerContainer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatUSD } from '@/lib/utils';
import { ProFeature } from '@/components/guards/ProFeature';
import { Icon } from '@/components/ui/Icons';

interface QuickMetricsProps {
  trades: any[];
  showProOnly?: boolean;
}

export function QuickMetrics({ trades, showProOnly = false }: QuickMetricsProps) {
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

    // Расчёт просадки
    let peak = 0,
      maxDd = 0,
      eq = 0;
    for (const t of trades) {
      eq += t.pnl_realized || 0;
      if (eq > peak) peak = eq;
      const dd = peak - eq;
      if (dd > maxDd) maxDd = dd;
    }

    // Profit Factor
    const totalLoss = losers.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);
    const totalWin = winners.reduce((s, t) => s + (t.pnl_realized || 0), 0);
    const pf = totalLoss !== 0 ? totalWin / Math.abs(totalLoss) : totalWin > 0 ? 999 : 0;

    // Средняя длительность сделки (время до фиксации)
    const avgHoldingTime = trades.length
      ? trades.reduce((s, t) => s + (t.holding_time_minutes || 60), 0) / trades.length
      : 0;

    // Impulsivity Score (сделки < 5 минут)
    const impulsiveTrades = trades.filter((t: any) => (t.holding_time_minutes || 60) < 5).length;
    const impulsivityScore = trades.length ? (impulsiveTrades / trades.length) * 100 : 0;

    // DCA Probability (усреднение)
    const dcaTrades = trades.filter((t: any) => t.type === 'dca' || t.note?.includes('avg')).length;
    const dcaProbability = trades.length ? (dcaTrades / trades.length) * 100 : 0;

    // Fee Loss Ratio
    const totalFees = trades.reduce((s: number, t: any) => s + (t.fee_usd || 0), 0);
    const feeLossRatio = totalPnl !== 0 ? (totalFees / Math.abs(totalPnl)) * 100 : 0;

    // Концентрация (упрощённо по объёму)
    const volumes = trades.map((t: any) => t.value_usd || 0);
    const maxVolume = Math.max(...volumes, 1);
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const concentration = (maxVolume / totalVolume) * 100;

    return {
      winRate,
      avgWin,
      avgLoss,
      totalPnl,
      maxDrawdown: maxDd,
      profitFactor: pf,
      totalTrades: trades.length,
      avgHoldingTime,
      impulsivityScore,
      dcaProbability,
      feeLossRatio,
      concentration,
      totalFees,
      winners: winners.length,
      losers: losers.length,
    };
  }, [trades]);

  // Базовые метрики (Free)
  const freeMetrics = [
    {
      label: 'Win Rate',
      value: `${m.winRate.toFixed(1)}%`,
      tooltip: 'Процент прибыльных сделок.',
      icon: 'chart',
      color: m.winRate >= 50 ? 'text-accent-green' : 'text-accent-red',
      pro: false,
    },
    {
      label: 'Total P&L',
      value: formatUSD(m.totalPnl),
      tooltip: 'Общая прибыль/убыток.',
      icon: 'chart',
      color: m.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
      pro: true,
    },
    {
      label: 'Сделок всего',
      value: m.totalTrades.toString(),
      tooltip: 'Общее количество сделок.',
      icon: 'trades',
      color: 'text-text-primary',
      pro: false,
    },
    {
      label: 'Прибыльных',
      value: m.winners.toString(),
      tooltip: 'Количество прибыльных сделок.',
      icon: 'trades',
      color: 'text-accent-green',
      pro: true,
    },
  ];

  // Продвинутые метрики (Pro)
  const proMetrics = [
    {
      label: 'Ср. выигрыш',
      value: formatUSD(m.avgWin),
      tooltip: 'Средняя прибыль по выигрышным сделкам.',
      icon: 'chart',
      color: 'text-accent-green',
      pro: true,
    },
    {
      label: 'Ср. проигрыш',
      value: formatUSD(m.avgLoss),
      tooltip: 'Средний убыток по убыточным сделкам.',
      icon: 'chart',
      color: 'text-accent-red',
      pro: true,
    },
    {
      label: 'Profit Factor',
      value: m.profitFactor === 999 ? '∞' : m.profitFactor.toFixed(2),
      tooltip: 'Отношение общей прибыли к общим убыткам (>1.5 хорошо).',
      icon: 'chart',
      color:
        m.profitFactor >= 1.5
          ? 'text-accent-green'
          : m.profitFactor >= 1
            ? 'text-text-primary'
            : 'text-accent-red',
      pro: true,
    },
    {
      label: 'Макс. просадка',
      value: formatUSD(m.maxDrawdown),
      tooltip: 'Максимальное падение капитала от пика.',
      icon: 'chart',
      color: 'text-accent-red',
      pro: true,
    },
    {
      label: 'Ср. удержание',
      value: `${Math.round(m.avgHoldingTime)} мин`,
      tooltip: 'Среднее время удержания позиции.',
      icon: 'chart',
      color: 'text-text-primary',
      pro: true,
    },
    {
      label: 'Импульсивность',
      value: `${m.impulsivityScore.toFixed(1)}%`,
      tooltip: '% сделок закрытых за <5 минут (риск тильта).',
      icon: 'chart',
      color:
        m.impulsivityScore < 20
          ? 'text-accent-green'
          : m.impulsivityScore < 40
            ? 'text-text-primary'
            : 'text-accent-red',
      pro: true,
    },
    {
      label: 'DCA вероятность',
      value: `${m.dcaProbability.toFixed(1)}%`,
      tooltip: '% сделок с усреднением вместо стопа.',
      icon: 'chart',
      color:
        m.dcaProbability < 10
          ? 'text-accent-green'
          : m.dcaProbability < 25
            ? 'text-text-primary'
            : 'text-accent-red',
      pro: true,
    },
    {
      label: 'Fee Ratio',
      value: `${m.feeLossRatio.toFixed(1)}%`,
      tooltip: 'Комиссии / |P&L|. >30% съедает всю альфу.',
      icon: 'chart',
      color:
        m.feeLossRatio < 20
          ? 'text-accent-green'
          : m.feeLossRatio < 40
            ? 'text-text-primary'
            : 'text-accent-red',
      pro: true,
    },
    {
      label: 'Концентрация',
      value: `${m.concentration.toFixed(1)}%`,
      tooltip: 'Доля самой крупной сделки в объёме.',
      icon: 'chart',
      color:
        m.concentration < 20
          ? 'text-accent-green'
          : m.concentration < 40
            ? 'text-text-primary'
            : 'text-accent-red',
      pro: true,
    },
    {
      label: 'Всего комиссий',
      value: formatUSD(m.totalFees),
      tooltip: 'Сумма всех комиссий.',
      icon: 'chart',
      color: 'text-text-muted',
      pro: true,
    },
  ];

  const allMetrics = showProOnly
    ? proMetrics
    : [...freeMetrics, ...proMetrics.filter((m) => m.pro)];

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {allMetrics.map((it, i) => (
        <ScrollReveal key={it.label} delay={i * 0.04}>
          <ProFeature
            fallback={
              <Card interactive padding="sm" className="opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                    {it.label}
                    <Tooltip content="Доступно для Pro" />
                  </p>
                  <Icon name="shield" size={10} className="text-text-muted" />
                </div>
                <p className="text-sm font-bold font-mono mt-0.5 text-text-muted">***</p>
              </Card>
            }
          >
            <Card interactive padding="sm">
              <p className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                {it.label}
                <Tooltip content={it.tooltip} />
              </p>
              <p
                className={`text-sm font-bold font-mono mt-0.5 ${it.color || 'text-text-primary'}`}
              >
                {it.value}
              </p>
            </Card>
          </ProFeature>
        </ScrollReveal>
      ))}
    </StaggerContainer>
  );
}
