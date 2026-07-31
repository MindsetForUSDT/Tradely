import { describe, expect, it } from 'vitest';
import { formatUSD, formatUSDPrice } from './utils';

describe('formatUSDPrice', () => {
  it('keeps enough precision for low-priced instruments', () => {
    expect(formatUSDPrice(0.01679)).toBe('$0.016790');
  });

  it('does not add unnecessary precision to large prices', () => {
    expect(formatUSDPrice(64_000.5)).toBe('$64,000.50');
  });

  it('does not change the shared P&L formatter', () => {
    expect(formatUSD(4.86074266)).toBe('$4.86');
  });
});
