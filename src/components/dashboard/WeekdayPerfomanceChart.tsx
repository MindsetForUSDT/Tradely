// ============================================================
// TradeumDiary — Столбчатая диаграмма "Прибыль по дням недели"
// Показывает, в какие дни трейдер зарабатывает больше
// ============================================================

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatUSD } from '@/lib/utils';
import type { WeekdayPerformance } from '@/types';

interface WeekdayPerformanceChartProps {
  data: WeekdayPerformance[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="glass-card p-3 text-xs shadow-lg">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      <p className={data.profit >= 0 ? 'text-accent-green' : 'text-accent-red'}>
        P&L: {formatUSD(data.profit)}
      </p>
      <p className="text-text-muted">
        Сделок: {data.trades}
      </p>
    </div>
  );
}

export function WeekdayPerformanceChart({ data, isLoading = false }: WeekdayPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-48 bg-surface-border rounded" />
          <div className="h-48 bg-surface-border rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">Прибыль по дням недели</h3>

      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2A2A2A"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
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
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />

            <Bar
              dataKey="profit"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.profit >= 0 ? '#00FFA3' : '#FF3B5C'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}