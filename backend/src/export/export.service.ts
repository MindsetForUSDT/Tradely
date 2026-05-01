import { Injectable } from '@nestjs/common';
import { TradesService } from '../trades/trades.service';

@Injectable()
export class ExportService {
  constructor(private readonly tradesService: TradesService) {}

  async exportCSV(userId: string): Promise<string> {
    const trades = await this.tradesService.findAll(userId, 10000, 0);

    const headers = ['Symbol', 'Side', 'Amount', 'Price', 'Value USD', 'Fee', 'P&L', 'Date', 'Exchange'];
    const rows = trades.map((t: any) => [
      t.symbol, t.side, t.amount, t.price, t.value_usd,
      t.fee, t.pnl_realized || 0,
      new Date(t.timestamp).toISOString(), t.exchange || '',
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  }

  async exportJSON(userId: string): Promise<any> {
    return this.tradesService.findAll(userId, 10000, 0);
  }
}