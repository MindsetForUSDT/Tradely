// lib/exportExcel.ts
import { exportToCsv } from './exportCsv';

export function exportToExcel(trades: any[], filename?: string): void {
  exportToCsv(trades, {
    filename: filename || `trades_${new Date().toISOString().split('T')[0]}.csv`,
    delimiter: ';',
    includeHeaders: true,
  });
}
