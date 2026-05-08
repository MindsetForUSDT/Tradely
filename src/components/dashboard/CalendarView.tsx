import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  trades: any[];
}

export function CalendarView({ trades }: CalendarViewProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 0).getDay();

  const tradesByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    trades.forEach((t) => {
      const d = new Date(t.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [trades, year, month]);

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (month === 0) {
              setMonth(11);
              setYear((y) => y - 1);
            } else setMonth((m) => m - 1);
          }}
          className="text-text-muted hover:text-text-primary"
        >
          ←
        </button>
        <h3 className="text-sm font-semibold">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() => {
            if (month === 11) {
              setMonth(0);
              setYear((y) => y + 1);
            } else setMonth((m) => m + 1);
          }}
          className="text-text-muted hover:text-text-primary"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted mb-2">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayTrades = tradesByDay[day] || [];
          const pnl = dayTrades.reduce((s: number, t: any) => s + (t.pnl_realized || 0), 0);
          return (
            <div
              key={day}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center text-xs border border-surface-border hover:bg-surface-overlay transition-colors cursor-default',
                pnl > 0 ? 'bg-accent-green/5' : pnl < 0 ? 'bg-accent-red/5' : ''
              )}
              title={`Сделок: ${dayTrades.length}, P&L: $${pnl.toFixed(2)}`}
            >
              <span className="font-medium">{day}</span>
              {dayTrades.length > 0 && (
                <span
                  className={cn('text-[9px]', pnl >= 0 ? 'text-accent-green' : 'text-accent-red')}
                >
                  {dayTrades.length}сд
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
