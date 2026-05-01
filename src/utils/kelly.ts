/**
 * Kelly Criterion для расчёта оптимального размера сделки
 *
 * @param winRate - процент выигрышных сделок (0-100)
 * @param avgWin - средняя прибыль на выигрышную сделку
 * @param avgLoss - средний убыток на проигрышную сделку (положительное число)
 * @returns доля капитала для ставки (0-1)
 */
export function kellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) return 0;
  if (avgWin <= 0) return 0;

  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;

  if (b <= 0) return 0;

  const f = (b * p - q) / b;

  if (f <= 0) return 0;
  if (f > 0.5) return 0.5;

  return parseFloat(f.toFixed(4));
}