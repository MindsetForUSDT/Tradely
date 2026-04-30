// src/utils/kelly.ts

/**
 * Kelly Criterion для расчёта оптимального размера сделки
 *
 * @param winRate - процент выигрышных сделок (0-100)
 * @param avgWin - средняя прибыль на выигрышную сделку
 * @param avgLoss - средний убыток на проигрышную сделку (положительное число)
 * @returns доля капитала для ставки (0-1)
 */
export function kellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) return 0; // Edge-case: нет данных об убытках
  if (avgWin <= 0) return 0; // Edge-case: нет прибыльных сделок

  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;

  if (b <= 0) return 0; // Edge-case: некорректный коэффициент

  const f = (b * p - q) / b;

  if (f <= 0) return 0; // Отрицательное матожидание
  if (f > 0.5) return 0.5; // Half Kelly — защита от переоценки

  return parseFloat(f.toFixed(4));
}

// src/utils/__tests__/kelly.test.ts
import { describe, it, expect } from 'vitest';
import { kellyFraction } from '../kelly';

describe('Kelly Criterion', () => {
  it('should return 0.2 for 60% win rate, 2:1 odds', () => {
    // b = 2, p = 0.6, q = 0.4
    // f = (2*0.6 - 0.4) / 2 = 0.8 / 2 = 0.4 → но half-Kelly капит на 0.4 (не превышает 0.5)
    const result = kellyFraction(60, 200, 100);
    expect(result).toBe(0.4);
  });

  it('should cap at 0.5 for very high edge', () => {
    const result = kellyFraction(80, 500, 100);
    expect(result).toBe(0.5);
  });

  it('should return 0 for negative expectancy', () => {
    const result = kellyFraction(40, 100, 200);
    expect(result).toBe(0);
  });

  it('should return 0 when avgLoss is 0', () => {
    const result = kellyFraction(60, 100, 0);
    expect(result).toBe(0);
  });

  it('should return 0 when avgWin is 0', () => {
    const result = kellyFraction(0, 0, 100);
    expect(result).toBe(0);
  });

  it('should handle 50% win rate with equal win/loss', () => {
    // b = 1, p = 0.5, q = 0.5
    // f = (1*0.5 - 0.5) / 1 = 0
    const result = kellyFraction(50, 100, 100);
    expect(result).toBe(0);
  });
});