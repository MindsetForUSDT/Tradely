// lib/exportCsv.ts — УЛУЧШЕННЫЙ ЭКСПОРТ
function escapeCell(value: unknown): string {
  const str = String(value ?? '');

  // Если содержит разделители, кавычки или переносы строк
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: ',' | ';' | '\t';
}

export function exportToCsv(trades: any[], options: ExportOptions = {}): void {
  const {
    filename = `trades_${new Date().toISOString().split('T')[0]}.csv`,
    includeHeaders = true,
    delimiter = ',',
  } = options;

  const headers = [
    'Символ',
    'Тип',
    'Количество',
    'Цена',
    'Объём USD',
    'Комиссия',
    'P&L',
    'Дата',
    'TxHash',
  ];

  const rows = trades.map((t: any) => {
    const side = String(t.side ?? '').toLowerCase() === 'buy' ? 'Покупка' : 'Продажа';
    return [
      escapeCell(t.symbol ?? 'N/A'),
      side,
      Number(t.amount ?? 0),
      Number(t.price ?? 0),
      Number(t.value_usd ?? 0),
      Number(t.fee ?? 0),
      Number(t.pnl_realized ?? 0),
      t.timestamp ? new Date(t.timestamp).toLocaleDateString('ru-RU') : 'N/A',
      escapeCell(t.tx_hash ?? ''),
    ];
  });

  // Добавляем итоговую строку
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_realized ?? 0), 0);
  const totalVolume = trades.reduce((sum, t) => sum + (t.value_usd ?? 0), 0);

  const summaryRow = [
    'ИТОГО',
    '',
    `${trades.length} сделок`,
    '',
    Number(totalVolume.toFixed(2)),
    '',
    Number(totalPnl.toFixed(2)),
    '',
    '',
  ];

  const dataRows = includeHeaders ? [headers, ...rows, summaryRow] : [...rows, summaryRow];

  const csvContent = dataRows.map((r) => r.join(delimiter)).join('\n');

  // BOM для корректного открытия в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8',
  });

  // Используем современный подход с URL
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Добавляем в DOM для Firefox
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Очищаем URL через небольшую задержку
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Экспорт для Excel с авто-шириной
export function exportToExcel(trades: any[]): void {
  exportToCsv(trades, {
    filename: `trades_${new Date().toISOString().split('T')[0]}.csv`,
    delimiter: ';', // Европейский формат для Excel
    includeHeaders: true,
  });
}
