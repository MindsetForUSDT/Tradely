export function exportToCsv(trades: any[]) {
  const headers = ['Символ', 'Тип', 'Количество', 'Цена', 'Объём USD', 'P&L', 'Дата'];
  const rows = trades.map((t: any) => [
    t.symbol,
    t.side === 'buy' ? 'Покупка' : 'Продажа',
    t.amount,
    t.price,
    t.value_usd,
    t.pnl_realized || 0,
    new Date(t.timestamp).toLocaleDateString('ru-RU'),
  ]);

  const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trades.csv';
  a.click();
  URL.revokeObjectURL(url);
}
