// components/dashboard/PnLChart.tsx — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatUSD, cn } from '@/lib/utils';
import type { PnLDataPoint } from '@/types';

interface PnLChartProps {
  data: PnLDataPoint[];
  isLoading?: boolean;
}

// ✅ Мемоизированный компонент тултипа
const CustomTooltip = ({ active, payload, label }: any) => {
  return useMemo(() => {
    if (!active || !payload?.length) return null;
    const pnl = payload[0]?.value ?? 0;
    const cumulative = payload[1]?.value ?? 0;

    return (
      <div className="glass-card p-4 text-xs shadow-xl border border-surface-border">
        <p className="text-text-muted mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span>Дневной P&L:</span>
            <span
              className={cn(
                'font-mono font-semibold',
                pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
              )}
            >
              {formatUSD(pnl)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Накопленный:</span>
            <span
              className={cn(
                'font-mono font-semibold',
                cumulative >= 0 ? 'text-accent-green' : 'text-accent-red'
              )}
            >
              {formatUSD(cumulative)}
            </span>
          </div>
        </div>
      </div>
    );
  }, [active, payload, label]);
};

// ✅ Константы вне компонента (не пересоздаются)
const CHART_MARGIN = { top: 5, right: 5, bottom: 5, left: 5 };
const GRADIENT_PROFIT = 'profitGradient';
const GRADIENT_LOSS = 'lossGradient';

export function PnLChart({ data, isLoading = false }: PnLChartProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // ✅ Мемоизированная фильтрация + агрегация
  const { filteredData, totalPnl } = useMemo(() => {
    if (!data?.length) return { filteredData: [], totalPnl: 0 };

    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Агрегация по дням для оптимизации
    const dailyMap = new Map<string, PnLDataPoint>();

    for (const point of data) {
      const date = new Date(point.date);
      if (date < since) continue;

      const dateKey = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const existing = dailyMap.get(dateKey);

      if (existing) {
        existing.pnl += point.pnl;
        existing.cumulativePnl = (existing.cumulativePnl || 0) + point.pnl;
      } else {
        dailyMap.set(dateKey, {
          ...point,
          date: dateKey,
          pnl: point.pnl,
          cumulativePnl: point.cumulativePnl,
        });
      }
    }

    const aggregated = Array.from(dailyMap.values());
    const total = aggregated.reduce((sum, d) => sum + d.pnl, 0);

    return { filteredData: aggregated, totalPnl: total };
  }, [data, timeframe]);

  // ✅ Мемоизированный форматтер для YAxis
  const yAxisFormatter = useCallback((v: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
    }).format(v);
  }, []);

  // Скелетон загрузки
  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface-border rounded" />
          <div className="h-64 bg-surface-border rounded-xl" />
        </div>
      </Card>
    );
  }

  // Нет данных
  if (!filteredData.length) {
    return (
      <Card padding="md">
        <div className="text-center py-8">
          <p className="text-text-muted">Нет данных за выбранный период</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">P&L (Прибыль/Убыток)</h3>
          <p
            className={cn(
              'text-lg font-bold font-mono mt-1',
              totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
            )}
          >
            {formatUSD(totalPnl)}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-all',
                timeframe === tf
                  ? 'bg-accent-green text-surface font-medium'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={CHART_MARGIN}>
            {/* ✅ Градиенты создаются один раз */}
            <defs>
              <linearGradient id={GRADIENT_PROFIT} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00FFA3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={GRADIENT_LOSS} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#FF3B5C" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#FF3B5C" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              dy={10}
              // ✅ Оптимизация: показываем не все тики
              interval="preserveStartEnd"
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={yAxisFormatter}
              dx={-10}
            />

            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#3A3A3A" strokeWidth={1} strokeDasharray="4 4" />

            {/* Область убытков */}
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill={`url(#${GRADIENT_LOSS})`}
              stroke="none"
              baseValue={0}
              fillOpacity={1}
              isAnimationActive={false} // ✅ Отключаем анимацию для больших данных
            />

            {/* Область прибыли */}
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill={`url(#${GRADIENT_PROFIT})`}
              stroke="none"
              baseValue={0}
              fillOpacity={1}
              isAnimationActive={false}
            />

            {/* Линия */}
            <Line
              type="monotone"
              dataKey="cumulativePnl"
              stroke="#00FFA3"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#00FFA3', stroke: '#0A0A0A', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
