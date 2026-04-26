// ============================================================
// TradeumDiary — Круговая диаграмма объёмов по токенам
// Интерактивная, с легендой и процентами
// ============================================================

import { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatUSD } from '@/lib/utils';
import type { TokenVolume } from '@/types';

interface VolumeByTokenChartProps {
  data: TokenVolume[];
  isLoading?: boolean;
}

// Цветовая палитра для токенов
const TOKEN_COLORS = [
  '#00FFA3', // Акцент-зелёный
  '#00CC82',
  '#00995F',
  '#00E090',
  '#00B875',
  '#33FFB8',
  '#66FFCD',
  '#99FFE1',
  '#CCFFF0',
  '#E5FFF8',
];

// Кастомный тултип
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="glass-card p-3 text-xs shadow-lg">
      <p className="font-semibold text-text-primary mb-1">{data.token}</p>
      <p className="text-text-secondary">
        Объём: {formatUSD(data.volume)}
      </p>
      <p className="text-accent-green">
        {data.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

// Кастомный рендер легенды
function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {payload?.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.payload.token}</span>
        </div>
      ))}
    </div>
  );
}

export function VolumeByTokenChart({ data, isLoading = false }: VolumeByTokenChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-surface-border rounded" />
          <div className="h-48 bg-surface-border rounded-full w-48 mx-auto" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="md">
        <h3 className="text-sm font-semibold mb-4">Объём по токенам</h3>
        <div className="flex flex-col items-center justify-center h-48 text-text-muted">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-50">
            <path d="M21 12V7H5a2 2 0 010-4h14v4" />
          </svg>
          <p className="text-sm">Нет данных для отображения</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-2">Объём торгов по токенам</h3>

      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="volume"
              nameKey="token"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.token}
                  fill={TOKEN_COLORS[index % TOKEN_COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  stroke="#0A0A0A"
                  strokeWidth={2}
                  style={{
                    transition: 'opacity 0.3s ease',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Pie>

            {/* Центральный текст */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-primary"
            >
              <tspan x="50%" dy="-0.5em" className="text-lg font-bold">
                {data.length}
              </tspan>
              <tspan x="50%" dy="1.5em" className="text-xs fill-text-muted">
                токенов
              </tspan>
            </text>

            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}