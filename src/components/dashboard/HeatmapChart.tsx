import { useMemo } from 'react';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface HeatmapChartProps {
  trades: any[];
  isLoading?: boolean;
}

export function HeatmapChart({ trades, isLoading = false }: HeatmapChartProps) {
  const heatmapData = useMemo(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const grid: Record<string, Record<number, { pnl: number; count: number }>> = {};
    days.forEach((d) => {
      grid[d] = {};
      hours.forEach((h) => {
        grid[d][h] = { pnl: 0, count: 0 };
      });
    });

    trades.forEach((t: any) => {
      const d = new Date(t.timestamp);
      const day = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const hour = d.getHours();
      if (grid[day] && grid[day][hour] !== undefined) {
        grid[day][hour].pnl += Number(t.pnl_realized || 0);
        grid[day][hour].count++;
      }
    });

    let maxAbs = 0;
    days.forEach((d) =>
      hours.forEach((h) => {
        const abs = Math.abs(grid[d][h].pnl);
        if (abs > maxAbs) maxAbs = abs;
      })
    );

    return { days, hours, grid, maxAbs: maxAbs || 1 };
  }, [trades]);

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="animate-pulse h-64 bg-surface-border rounded-xl" />
      </Card>
    );
  }

  if (!heatmapData.days.length) {
    return (
      <Card padding="md">
        <div className="text-center py-12 text-text-muted">
          <p>Нет данных для отображения</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold mb-4">Тепловая карта активности (P&L по дням/часам)</h3>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-[1px] text-[10px] min-w-[600px]">
          <div />
          {heatmapData.hours.map((h) => (
            <div key={h} className="text-center text-text-muted py-1">
              {h}
            </div>
          ))}
          {heatmapData.days.map((day) => (
            <React.Fragment key={day}>
              <div className="text-text-muted pr-2 py-1 text-right">{day}</div>
              {heatmapData.hours.map((h) => {
                const cell = heatmapData.grid[day]?.[h] || { pnl: 0, count: 0 };
                const intensity = heatmapData.maxAbs > 0 ? cell.pnl / heatmapData.maxAbs : 0;
                const isPositive = cell.pnl > 0;
                const isNegative = cell.pnl < 0;
                const bgOpacity = Math.abs(intensity) * 0.8;
                return (
                  <div
                    key={`${day}-${h}`}
                    className={cn(
                      'aspect-square rounded-sm flex items-center justify-center text-[8px] font-mono cursor-default',
                      isPositive && 'bg-accent-green',
                      isNegative && 'bg-accent-red',
                      !isPositive && !isNegative && 'bg-surface-border'
                    )}
                    style={{ opacity: cell.count > 0 ? 0.3 + bgOpacity : 0.1 }}
                    title={`${day} ${h}:00\nP&L: $${Number(cell.pnl).toFixed(2)}\nСделок: ${cell.count}`}
                  >
                    {cell.count > 0 ? cell.count : ''}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-accent-green" /> Прибыль
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-accent-red" /> Убыток
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-surface-border" /> Нет сделок
        </span>
      </div>
    </Card>
  );
}
