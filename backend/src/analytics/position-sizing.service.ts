import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface KellyResult {
  optimalFraction: number;
  kellyValue: number;
  halfKelly: number;
  recommendation: string;
  inputs: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    oddsRatio: number;
  };
}

interface PositionSizeResult {
  positionSize: number;
  riskAmount: number;
  stopLossDistance: number;
  method: 'kelly' | 'fixed_fractional' | 'atr_adjusted';
  details: Record<string, number>;
}

@Injectable()
export class PositionSizingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kelly Criterion: f* = (bp - q) / b
   *
   * Где:
   * b = avgWin / avgLoss (odds ratio)
   * p = winRate / 100 (вероятность выигрыша)
   * q = 1 - p (вероятность проигрыша)
   */
  async calculateKelly(userId: string, days = 90): Promise<KellyResult> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const trades = await this.prisma.trade.findMany({
      where: {
        user_id: userId,
        status: 'closed',
        timestamp: { gte: since },
      },
      select: { pnl_realized: true },
    });

    const winning = trades.filter((t) => (t.pnl_realized || 0) > 0);
    const losing = trades.filter((t) => (t.pnl_realized || 0) < 0);

    const winRate = trades.length > 0 ? winning.length / trades.length : 0;
    const avgWin = winning.length > 0
      ? winning.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winning.length
      : 0;
    const avgLoss = losing.length > 0
      ? Math.abs(losing.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losing.length
      : 1;

    const b = avgLoss > 0 ? avgWin / avgLoss : 0;
    const p = winRate;
    const q = 1 - p;

    let kellyValue = 0;
    if (b > 0) {
      kellyValue = (b * p - q) / b;
    }

    // Edge-case protection
    if (kellyValue < 0) kellyValue = 0;
    if (kellyValue > 0.5) kellyValue = 0.5; // Half-Kelly cap

    return {
      optimalFraction: parseFloat(kellyValue.toFixed(4)),
      kellyValue: parseFloat(kellyValue.toFixed(4)),
      halfKelly: parseFloat((kellyValue / 2).toFixed(4)),
      recommendation: this.getKellyRecommendation(kellyValue),
      inputs: {
        winRate: parseFloat((winRate * 100).toFixed(2)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        oddsRatio: parseFloat(b.toFixed(4)),
      },
    };
  }

  /**
   * Fixed Fractional Position Sizing
   * Position = (AccountBalance * RiskPercent) / StopLossDistance
   */
  calculateFixedFractional(
    accountBalance: number,
    riskPercent: number,
    stopLossPercent: number
  ): PositionSizeResult {
    const riskAmount = accountBalance * (riskPercent / 100);
    const positionSize = stopLossPercent > 0 ? riskAmount / (stopLossPercent / 100) : 0;

    return {
      positionSize: parseFloat(positionSize.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      stopLossDistance: parseFloat((accountBalance * stopLossPercent / 100).toFixed(2)),
      method: 'fixed_fractional',
      details: {
        accountBalance,
        riskPercent,
        stopLossPercent,
        maxLoss: riskAmount,
      },
    };
  }

  /**
   * ATR-Adjusted Position Sizing
   * Position = (AccountBalance * RiskPercent) / (ATR * Multiplier)
   */
  calculateATRAdjusted(
    accountBalance: number,
    riskPercent: number,
    atr: number,
    multiplier: number = 2
  ): PositionSizeResult {
    const riskAmount = accountBalance * (riskPercent / 100);
    const stopDistance = atr * multiplier;
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

    return {
      positionSize: parseFloat(positionSize.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      stopLossDistance: parseFloat(stopDistance.toFixed(2)),
      method: 'atr_adjusted',
      details: {
        accountBalance,
        riskPercent,
        atr,
        multiplier,
        stopDistance,
      },
    };
  }

  /**
   * Risk of Ruin проверка
   * RoR = ((1 - Edge) / (1 + Edge)) ^ CapitalUnits
   * CapitalUnits = AccountBalance / RiskPerTrade
   */
  calculateRiskOfRuin(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    accountBalance: number,
    riskPerTrade: number
  ): { probability: number; safe: boolean; capitalUnits: number } {
    const edge = winRate * avgWin - (1 - winRate) * avgLoss;
    const capitalUnits = riskPerTrade > 0 ? accountBalance / riskPerTrade : 0;

    let probability = 0;
    if (capitalUnits > 0 && edge !== 0) {
      probability = Math.pow((1 - edge) / (1 + edge), capitalUnits);
    }

    return {
      probability: parseFloat(probability.toFixed(6)),
      safe: probability < 0.01, // Менее 1% риск разорения
      capitalUnits: parseFloat(capitalUnits.toFixed(2)),
    };
  }

  private getKellyRecommendation(f: number): string {
    if (f <= 0) return 'Не торгуйте — отрицательное математическое ожидание';
    if (f < 0.05) return 'Очень консервативно — риск < 5% на сделку';
    if (f < 0.15) return 'Консервативно — риск 5-15% на сделку';
    if (f < 0.25) return 'Умеренно — риск 15-25% на сделку';
    if (f <= 0.5) return 'Агрессивно — риск 25-50% (Half-Kelly)';
    return 'Максимально агрессивно';
  }
}