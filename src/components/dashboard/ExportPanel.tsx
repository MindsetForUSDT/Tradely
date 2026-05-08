import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { exportToCsv } from '@/lib/exportCsv';
import { exportToExcel } from '@/lib/exportExcel';
import { exportToPdf } from '@/lib/exportPdf';
import { ProFeature } from '@/components/guards/ProFeature';
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
        // PDF экспорт через печать (браузерный)
        window.print();
        break;
    }
    toast.success(`Экспортировано ${filtered.length} сделок`);
  };

  return (
    <Card padding="md" className="space-y-4 max-w-md">
      <h3 className="text-sm font-semibold">📤 Экспорт сделок</h3>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'month', 'week', 'custom'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${dateRange === r ? 'bg-accent-green text-surface' : 'bg-surface-overlay text-text-secondary'}`}
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
          <div>
            <span className="text-xs text-text-muted block mb-1">С</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">По</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => handleExport('csv')} size="sm" variant="outline" className="flex-1">
          📄 CSV
        </Button>
        <Button
          onClick={() => handleExport('excel')}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          📊 Excel
        </Button>
        <Button onClick={() => handleExport('pdf')} size="sm" variant="outline" className="flex-1">
          🖨️ PDF
        </Button>
      </div>

      <div className="text-xs text-text-muted mt-2">Доступно сделок: {trades.length}</div>
    </Card>
  );
}
