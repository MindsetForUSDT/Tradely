import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { exportToCsv } from '@/lib/exportCsv';
import { exportToExcel } from '@/lib/exportExcel';
import toast from 'react-hot-toast';

export function ExportPanel() {
  const { trades } = useTradesOptimized({ limit: 5000, daysAgo: 365 });
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const getFilteredTrades = () => {
    let result = [...trades];
    const now = new Date();
    if (dateRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((t: any) => new Date(t.timestamp) >= start);
    } else if (dateRange === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      result = result.filter((t: any) => new Date(t.timestamp) >= start);
    } else if (dateRange === 'custom' && from && to) {
      result = result.filter((t: any) => {
        const d = new Date(t.timestamp);
        return d >= new Date(from) && d <= new Date(to + 'T23:59:59');
      });
    }
    return result;
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const filtered = getFilteredTrades();
    if (!filtered.length) {
      toast.error('Нет сделок за выбранный период');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    switch (format) {
      case 'csv':
        exportToCsv(filtered);
        break;
      case 'excel':
        exportToExcel(filtered, `trades_${dateStr}.xlsx`);
        break;
      case 'pdf':
        window.print();
        break;
    }
    toast.success(`Экспортировано ${filtered.length} сделок`);
  };

  return (
    <Card padding="md" className="space-y-4 max-w-md">
      <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
        <Icon name="export-csv" size={18} className="text-accent-green" />
        Экспорт сделок
      </h3>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'month', 'week', 'custom'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${dateRange === r ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
          >
            {r === 'all'
              ? 'Всё время'
              : r === 'month'
                ? 'Месяц'
                : r === 'week'
                  ? 'Неделя'
                  : 'Период'}
          </button>
        ))}
      </div>
      {dateRange === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => handleExport('csv')}
          size="sm"
          variant="outline"
          className="flex-1 inline-flex items-center justify-center gap-1.5"
        >
          <Icon name="export-csv" size={14} /> CSV
        </Button>
        <Button
          onClick={() => handleExport('excel')}
          size="sm"
          variant="outline"
          className="flex-1 inline-flex items-center justify-center gap-1.5"
        >
          <Icon name="export-excel" size={14} /> Excel
        </Button>
        <Button
          onClick={() => handleExport('pdf')}
          size="sm"
          variant="outline"
          className="flex-1 inline-flex items-center justify-center gap-1.5"
        >
          <Icon name="export-pdf" size={14} /> PDF
        </Button>
      </div>
      <div className="text-xs text-text-muted mt-2">Доступно сделок: {trades.length}</div>
    </Card>
  );
}

/* ✅ Исправлено: все эмодзи заменены на Icon, добавлены transition */
