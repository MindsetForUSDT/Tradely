import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SharpeResult {
  sharpeRatio: number;
  sortinoRatio: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  riskFreeRate: number;
  totalReturn: number;
}

interface DrawdownResult {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgDrawdown: number;
  currentDrawdown: number;
  maxDrawdownDuration: number; // в днях
  recoveryTime: number; // дней до восстановления
}

interface ExpectancyResult {
  avgTradeResult: number;
  expectancy: number;
  profitFactor: number;
  payoffRatio: number;
  avgHoldingPeriod: number; // в часах
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sharpe Ratio = (Rp - Rf) / σp
   *
   * Где:
   * Rp = Annualized Return
   * Rf = Risk-Free Rate (15% для РФ / 5% US)
   * σp = Standard Deviation of Returns (Annualized)
   *
   * Sortino Ratio = (Rp - Rf) / σd (Downside Deviation only)
   */
  async calculateSharpe(userId: string, riskFreeRate = 5): Promise<SharpeResult> {
    const trades = await this.prisma.trade.findMany({
      where: { user_id: userId, status: 'closed' },
      orderBy: { timestamp: 'asc' },
      select: { pnl_realized: true, timestamp: true, value_usd: true },
    });

    if (trades.length < 3) {
      return {
        sharpeRatio: 0, sortinoRatio: 0, annualizedReturn: 0,
        annualizedVolatility: 0, riskFreeRate, totalReturn: 0,
      };
    }

    // Дневные доходности
    const dailyReturns: number[] = [];
    let totalReturn = 0;

    for (const t of trades) {
      const pnl = Number(t.pnl_realized || 0);
      if (t.value_usd > 0) {
        dailyReturns.push(pnl / Number(t.value_usd));
      }
      totalReturn += pnl;
    }

    const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    // Downside deviation (только отрицательные доходности)
    const downsideReturns = dailyReturns.filter((r) => r < 0);
    const downsideAvg = downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + r, 0) / downsideReturns.length
      : 0;
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + Math.pow(r - downsideAvg, 2), 0) / downsideReturns.length
      : 0;
    const downsideDev = Math.sqrt(downsideVariance);

    // Аннуализация (252 торговых дня)
    const annualizedReturn = avgReturn * 252 * 100;
    const annualizedVolatility = stdDev * Math.sqrt(252) * 100;

    const sharpeRatio = annualizedVolatility > 0
      ? (annualizedReturn - riskFreeRate) / annualizedVolatility
      : 0;

    const sortinoRatio = downsideDev > 0
      ? (annualizedReturn - riskFreeRate) / (downsideDev * Math.sqrt(252) * 100)
      : 0;

    return {
      sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(4)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      annualizedVolatility: parseFloat(annualizedVolatility.toFixed(2)),
      riskFreeRate,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
    };
  }

  /**
   * Maximum Drawdown + Average Drawdown + Recovery Time
   */
  async calculateDrawdown(userId: string): Promise<DrawdownResult> {
    const trades = await this.prisma.trade.findMany({
      where: { user_id: userId, status: 'closed' },
      orderBy: { timestamp: 'asc' },
      select: { pnl_realized: true },
    });

    if (trades.length === 0) {
      return { maxDrawdown: 0, maxDrawdownPercent: 0, avgDrawdown: 0, currentDrawdown: 0, maxDrawdownDuration: 0, recoveryTime: 0 };
    }

    let peak = 0;
    let equity = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDrawdown = 0;
    const drawdowns: number[] = [];
    let drawdownStart: Date | null = null;
    let maxDrawdownDuration = 0;
    let recoveryTime = 0;

    for (const t of trades) {
      equity += Number(t.pnl_realized || 0);

      if (equity > peak) {
        peak = equity;
        if (drawdownStart) {
          recoveryTime = 0;
          drawdownStart = null;
        }
      }

      currentDrawdown = peak - equity;
      drawdowns.push(currentDrawdown);

      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
        maxDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;
      }

      if (currentDrawdown > 0 && !drawdownStart) {
        drawdownStart = new Date();
      }

      if (drawdownStart && currentDrawdown === 0) {
        recoveryTime++;
      }
    }

    return {
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
      avgDrawdown: parseFloat((drawdowns.reduce((s, d) => s + d, 0) / drawdowns.length).toFixed(2)),
      currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
      maxDrawdownDuration: maxDrawdownDuration,
      recoveryTime,
    };
  }

  /**
   * Expectancy = (WinRate * AvgWin) - (LossRate * AvgLoss)
   * Profit Factor = GrossProfit / GrossLoss
   */
  async calculateExpectancy(userId: string): Promise<ExpectancyResult> {
    const trades = await this.prisma.trade.findMany({
      where: { user_id: userId, status: 'closed' },
      select: { pnl_realized: true, timestamp: true, created_at: true },
    });

    const winning = trades.filter((t) => (t.pnl_realized || 0) > 0);
    const losing = trades.filter((t) => (t.pnl_realized || 0) < 0);

    const winRate = trades.length > 0 ? winning.length / trades.length : 0;
    const avgWin = winning.length > 0
      ? winning.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winning.length
      : 0;
    const avgLoss = losing.length > 0
      ? Math.abs(losing.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losing.length
      : 0;

    const grossProfit = winning.reduce((s, t) => s + (t.pnl_realized || 0), 0);
    const grossLoss = Math.abs(losing.reduce((s, t) => s + (t.pnl_realized || 0), 0));

    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      avgTradeResult: parseFloat(expectancy.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      profitFactor: parseFloat((profitFactor === Infinity ? 999 : profitFactor).toFixed(4)),
      payoffRatio: avgLoss > 0 ? parseFloat((avgWin / avgLoss).toFixed(4)) : 0,
      avgHoldingPeriod: 0, // TODO: рассчитать по реальным данным
    };
  }
}