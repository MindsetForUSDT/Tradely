// ============================================================
// TradeumDiary — График P&L (прибыль/убыток)
// Интерактивный линейный график с зонами прибыли/убытка
// ============================================================

import { useMemo } from 'react';
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
import { formatUSD } from '@/lib/utils';
import type { PnLDataPoint } from '@/types';

interface PnLChartProps {
  data: PnLDataPoint[];
  isLoading?: boolean;
}

// Кастомный тултип
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const pnl = payload[0]?.value ?? 0;
  const cumulative = payload[1]?.value ?? 0;

  return (
    <div className="glass-card p-3 text-xs shadow-lg">
      <p className="text-text-muted mb-1">{label}</p>
      <p className={pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
        P&L: {formatUSD(pnl)}
      </p>
      <p className="text-text-secondary">
        Накоп.: {formatUSD(cumulative)}
      </p>
    </div>
  );
}

export function PnLChart({ data, isLoading = false }: PnLChartProps) {
  // Форматируем данные для графика
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface-border rounded" />
          <div className="h-48 bg-surface-border rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">P&L (Прибыль/Убыток)</h3>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            Прибыль
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-red" />
            Убыток
          </span>
        </div>
      </div>

      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              {/* Градиент для зоны прибыли */}
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00FFA3" stopOpacity={0} />
              </linearGradient>
              {/* Градиент для зоны убытка */}
              <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#FF3B5C" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#FF3B5C" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2A2A2A"
              vertical={false}
            />

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

            {/* Нулевая линия */}
            <ReferenceLine
              y={0}
              stroke="#3A3A3A"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Зона убытка (ниже нуля) */}
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill="url(#lossGradient)"
              stroke="none"
              baseValue={0}
              fillOpacity={1}
            />

            {/* Зона прибыли (выше нуля) */}
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              fill="url(#profitGradient)"
              stroke="none"
              baseValue={0}
              fillOpacity={1}
            />

            {/* Линия накопленного P&L */}
            <Line
              type="monotone"
              dataKey="cumulativePnl"
              stroke="#00FFA3"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#00FFA3',
                stroke: '#0A0A0A',
                strokeWidth: 2,
              }}
            />

            {/* Столбцы дневного P&L */}
            <Area
              type="monotone"
              dataKey="pnl"
              fill="none"
              stroke="#A0AEC0"
              strokeWidth={1}
              strokeOpacity={0.3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}