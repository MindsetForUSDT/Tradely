export function exportToExcel(trades: any[], filename = 'trades.xlsx') {
  // Создаём CSV с BOM для Excel (UTF-8)
  const headers = [
    'Дата',
    'Инструмент',
    'Тип',
    'Количество',
    'Цена',
    'Объём USD',
    'Комиссия',
    'P&L',
    'Стратегия',
    'Таймфрейм',
    'Источник',
    'Заметки',
  ];

  const rows = trades.map((t: any) => [
    new Date(t.timestamp).toLocaleDateString('ru-RU'),
    t.symbol || '',
    t.side === 'buy' ? 'Покупка' : 'Продажа',
    t.amount || 0,
    t.price || 0,
    t.value_usd || 0,
    t.fee || 0,
    t.pnl_realized || 0,
    t.strategy_tag || '',
    t.timeframe || '',
    t.import_source || 'manual',
    (t.notes || '').replace(/"/g, '""'),
  ]);

  const csv = ['\uFEFF' + headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
