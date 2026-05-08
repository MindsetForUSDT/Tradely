/**
 * Расчёт Sharpe Ratio и Sortino Ratio.
 * Все значения в процентах (%).
 * riskFreeRate по умолчанию 5% (ключевая ставка ЦБ РФ).
 */
export function calculateSharpeRatio(
  dailyReturns: number[],
  riskFreeRate = 5
): {
  sharpeRatio: number;
  sortinoRatio: number;
  annualizedReturn: number;
} {
  if (dailyReturns.length < 3) {
    return { sharpeRatio: 0, sortinoRatio: 0, annualizedReturn: 0 };
  }

  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideAvg =
    downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + r, 0) / downsideReturns.length
      : 0;
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + Math.pow(r - downsideAvg, 2), 0) /
        downsideReturns.length
      : 0;
  const downsideDev = Math.sqrt(downsideVariance);

  const annualizedReturn = avgReturn * 252 * 100;
  const annualizedVol = stdDev * Math.sqrt(252) * 100;

  const sharpeRatio = annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0;
  const sortinoRatio =
    downsideDev > 0 ? (annualizedReturn - riskFreeRate) / (downsideDev * Math.sqrt(252) * 100) : 0;

  return {
    sharpeRatio: +sharpeRatio.toFixed(4),
    sortinoRatio: +sortinoRatio.toFixed(4),
    annualizedReturn: +annualizedReturn.toFixed(2),
  };
}
