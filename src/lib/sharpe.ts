// lib/sharpe.ts — АДАПТИРОВАНО ДЛЯ КРИПТЫ
const TRADING_DAYS_PER_YEAR = 365; // Крипта торгуется каждый день
const DEFAULT_RISK_FREE_RATE = 5; // 5% годовых

export function calculateSharpeRatio(
  dailyReturns: number[],
  riskFreeRate = DEFAULT_RISK_FREE_RATE
): {
  sharpeRatio: number;
  sortinoRatio: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  calmarRatio: number;
} {
  if (!dailyReturns?.length || dailyReturns.length < 3) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      annualizedReturn: 0,
      annualizedVolatility: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
    };
  }

  // Средняя доходность
  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;

  // Стандартное отклонение
  const variance = dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  // Только отрицательные доходности для Sortino
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideVariance = downsideReturns.length
    ? downsideReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / downsideReturns.length
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);

  // Аннуализация (365 дней для крипты)
  const annualizedReturn = avgReturn * TRADING_DAYS_PER_YEAR * 100;
  const annualizedVol = stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;

  // Коэффициенты
  const sharpeRatio = annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0;

  const sortinoRatio =
    downsideDev > 0
      ? (annualizedReturn - riskFreeRate) / (downsideDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100)
      : 0;

  // Максимальная просадка
  let peak = -Infinity;
  let maxDrawdown = 0;
  let cumulative = 0;

  for (const ret of dailyReturns) {
    cumulative += ret;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }

  // Calmar Ratio = Annualized Return / Max Drawdown
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / (maxDrawdown * 100) : 0;

  return {
    sharpeRatio: isFinite(sharpeRatio) ? +sharpeRatio.toFixed(4) : 0,
    sortinoRatio: isFinite(sortinoRatio) ? +sortinoRatio.toFixed(4) : 0,
    annualizedReturn: isFinite(annualizedReturn) ? +annualizedReturn.toFixed(2) : 0,
    annualizedVolatility: isFinite(annualizedVol) ? +annualizedVol.toFixed(2) : 0,
    maxDrawdown: +maxDrawdown.toFixed(4),
    calmarRatio: isFinite(calmarRatio) ? +calmarRatio.toFixed(4) : 0,
  };
}
