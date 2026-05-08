function escapeCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(trades: any[]): void {
  const headers = ['Символ', 'Тип', 'Количество', 'Цена', 'Объём USD', 'P&L', 'Дата'];

  const rows = trades.map((t: any) => {
    const side = String(t.side ?? '').toLowerCase();
    return [
      escapeCell(t.symbol ?? 'N/A'),
      side === 'buy' ? 'Покупка' : 'Продажа',
      t.amount ?? 0,
      t.price ?? 0,
      t.value_usd ?? 0,
      t.pnl_realized ?? 0,
      new Date(t.timestamp ?? Date.now()).toLocaleDateString('ru-RU'),
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trades.csv';
  a.click();
  URL.revokeObjectURL(url);
}
