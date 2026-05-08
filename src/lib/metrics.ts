function safeDivide(a: number, b: number): number {
  if (b === 0) return 0;
  return +(a / b).toFixed(2);
}

export function calculateExpectancy(trades: any[]): number {
  const winners = trades.filter((t) => (t.pnl_realized || 0) > 0);
  const losers = trades.filter((t) => (t.pnl_realized || 0) < 0);
  if (!trades.length) return 0;
  const winRate = winners.length / trades.length;
  const avgWin = winners.length
    ? winners.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winners.length
    : 0;
  const avgLoss = losers.length
    ? Math.abs(losers.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losers.length
    : 0;
  return +(winRate * avgWin - (1 - winRate) * avgLoss).toFixed(2);
}

export function calculateProfitFactor(trades: any[]): number {
  const grossProfit = trades
    .filter((t) => (t.pnl_realized || 0) > 0)
    .reduce((s, t) => s + (t.pnl_realized || 0), 0);
  const grossLoss = Math.abs(
    trades.filter((t) => (t.pnl_realized || 0) < 0).reduce((s, t) => s + (t.pnl_realized || 0), 0)
  );
  return grossLoss > 0 ? +safeDivide(grossProfit, grossLoss).toFixed(2) : grossProfit > 0 ? 999 : 0;
}

export function calculateStreakAnalysis(trades: any[]): {
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number;
} {
  let maxWin = 0,
    maxLoss = 0,
    currentW = 0,
    currentL = 0,
    lastPnl = 0;
  for (const t of trades) {
    const pnl = t.pnl_realized || 0;
    if (pnl > 0) {
      currentW++;
      currentL = 0;
      maxWin = Math.max(maxWin, currentW);
      lastPnl = 1;
    } else if (pnl < 0) {
      currentL++;
      currentW = 0;
      maxLoss = Math.max(maxLoss, currentL);
      lastPnl = -1;
    }
  }
  return {
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    currentStreak: lastPnl > 0 ? currentW : -currentL,
  };
}
