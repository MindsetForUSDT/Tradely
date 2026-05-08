export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number
): {
  positionSize: number;
  riskAmount: number;
  stopDistancePercent: number;
} {
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePercent = (stopDistance / entryPrice) * 100;
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

  return {
    positionSize: +positionSize.toFixed(4),
    riskAmount: +riskAmount.toFixed(2),
    stopDistancePercent: +stopDistancePercent.toFixed(2),
  };
}

export function calculateRiskOfRuin(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  accountBalance: number,
  riskPerTrade: number
): number {
  const edge = winRate * avgWin - (1 - winRate) * avgLoss;
  const capitalUnits = riskPerTrade > 0 ? accountBalance / riskPerTrade : 0;
  if (capitalUnits <= 0 || edge <= 0) return 1;
  const ror = Math.pow((1 - edge) / (1 + edge), capitalUnits);
  return +ror.toFixed(6);
}

export function checkRiskLimits(
  currentPnl: number,
  dailyLossLimit: number,
  weeklyLossLimit: number
): { dailyBreached: boolean; weeklyBreached: boolean } {
  return {
    dailyBreached: dailyLossLimit > 0 && currentPnl < -dailyLossLimit,
    weeklyBreached: weeklyLossLimit > 0 && currentPnl < -weeklyLossLimit,
  };
}
