import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatUSD } from '@/lib/utils';
import type { PnLDataPoint } from '@/types';

interface EquityCurveChartProps {
  data: PnLDataPoint[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const equity = payload[0]?.value || 0;
  const drawdown = payload[1]?.value || 0;
  return (
    <div className="glass-card p-4 text-xs shadow-xl border border-surface-border">
      <p className="text-text-muted mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span>Капитал:</span>
          <span
            className={equity >= 0 ? 'text-accent-green font-mono' : 'text-accent-red font-mono'}
          >
            {formatUSD(equity)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Просадка:</span>
          <span className="text-accent-red font-mono">{drawdown}%</span>
        </div>
      </div>
    </div>
  );
}

export function EquityCurveChart({ data, isLoading = false }: EquityCurveChartProps) {
  const chartData = useMemo(() => {
    let peak = 0;
    let equity = 0;
    return data.map((point) => {
      equity += point.pnl;
      if (equity > peak) peak = equity;
      const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      return {
        date: new Date(point.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        equity,
        drawdown: +drawdown.toFixed(2),
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse h-64 bg-surface-border rounded-xl" />
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">Кривая капитала (Equity Curve)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00FFA3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 10 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 10 }}
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
            <ReferenceLine y={0} stroke="#3A3A3A" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#00FFA3"
              strokeWidth={2}
              fill="url(#equityGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
