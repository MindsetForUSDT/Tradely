import { describe, it, expect } from 'vitest';
import { kellyFraction } from '../kelly';

describe('Kelly Criterion', () => {
  it('should return 0.2 for 60% win rate, 2:1 odds', () => {
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
});