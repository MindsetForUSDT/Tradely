import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TaxReportResult {
  taxYear: number;
  jurisdiction: string;
  calculationMethod: 'FIFO' | 'LIFO';
  totalTrades: number;
  totalProceeds: number;
  totalCostBasis: number;
  netResult: number;
  taxableAmount: number;
  taxRate: number;
  estimatedTax: number;
  trades: any[];
}

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Расчёт налога по методу FIFO (First In, First Out)
   * Ставка НДФЛ РФ: 13% до 5 млн, 15% свыше 5 млн
   */
  async calculateTax(userId: string, year: number, method: 'FIFO' | 'LIFO' = 'FIFO'): Promise<TaxReportResult> {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const trades = await this.prisma.trade.findMany({
      where: {
        user_id: userId,
        status: 'closed',
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: method === 'FIFO' ? 'asc' : 'desc' },
      select: {
        id: true,
        symbol: true,
        side: true,
        amount: true,
        price: true,
        value_usd: true,
        pnl_realized: true,
        fee: true,
        timestamp: true,
      },
    });

    let totalProceeds = 0;  // Выручка от продаж
    let totalCostBasis = 0; // Затраты на покупку
    let totalFees = 0;

    const taxableEvents: any[] = [];

    for (const trade of trades) {
      if (trade.side === 'sell') {
        totalProceeds += Number(trade.value_usd);
        // По FIFO: cost basis = первая покупка
        totalCostBasis += Number(trade.value_usd) - Number(trade.pnl_realized || 0);
        taxableEvents.push({
          date: trade.timestamp,
          symbol: trade.symbol,
          proceeds: Number(trade.value_usd),
          costBasis: Number(trade.value_usd) - Number(trade.pnl_realized || 0),
          gain: Number(trade.pnl_realized || 0),
        });
      }
      totalFees += Number(trade.fee || 0);
    }

    const netResult = totalProceeds - totalCostBasis - totalFees;

    // Прогрессивная шкала НДФЛ РФ (2025)
    let taxRate = 13;
    if (netResult > 5_000_000) taxRate = 15;
    if (netResult > 50_000_000) taxRate = 18;

    const taxableAmount = netResult > 0 ? netResult : 0;
    const estimatedTax = taxableAmount * (taxRate / 100);

    // Сохраняем отчёт в БД
    await this.prisma.taxReport.create({
      data: {
        user_id: userId,
        tax_year: year,
        jurisdiction: 'RU',
        calculation_method: method,
        total_trades: trades.length,
        total_proceeds: totalProceeds,
        total_cost_basis: totalCostBasis,
        total_gains: trades.filter(t => (t.pnl_realized || 0) > 0).reduce((s, t) => s + Number(t.pnl_realized || 0), 0),
        total_losses: Math.abs(trades.filter(t => (t.pnl_realized || 0) < 0).reduce((s, t) => s + Number(t.pnl_realized || 0), 0)),
        net_result: netResult,
        taxable_amount: taxableAmount,
        tax_rate: taxRate,
        estimated_tax: estimatedTax,
        report_data: { taxableEvents },
      },
    });

    return {
      taxYear: year,
      jurisdiction: 'RU',
      calculationMethod: method,
      totalTrades: trades.length,
      totalProceeds: parseFloat(totalProceeds.toFixed(2)),
      totalCostBasis: parseFloat(totalCostBasis.toFixed(2)),
      netResult: parseFloat(netResult.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      taxRate,
      estimatedTax: parseFloat(estimatedTax.toFixed(2)),
      trades: taxableEvents,
    };
  }
}