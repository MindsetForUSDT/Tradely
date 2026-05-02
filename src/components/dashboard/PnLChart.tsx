import { useMemo, useState } from 'react';
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

function CustomTooltip({ active, payload, label }: any) {
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
}

export function PnLChart({ data, isLoading = false }: PnLChartProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const filteredData = useMemo(() => {
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const since = new Date(now.setDate(now.getDate() - days));
    return data
      .filter((point) => new Date(point.date) >= since)
      .map((point) => ({
        ...point,
        date: new Date(point.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      }));
  }, [data, timeframe]);

  const totalPnl = useMemo(() => filteredData.reduce((sum, d) => sum + d.pnl, 0), [filteredData]);

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
          <ComposedChart data={filteredData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00FFA3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
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
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  style: 'currency',
                  currency: 'USD',
                }).format(v)
              }
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#3A3A3A" strokeWidth={1} strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill="url(#lossGradient)"
              stroke="none"
              baseValue={0}
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill="url(#profitGradient)"
              stroke="none"
              baseValue={0}
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="cumulativePnl"
              stroke="#00FFA3"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#00FFA3', stroke: '#0A0A0A', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
