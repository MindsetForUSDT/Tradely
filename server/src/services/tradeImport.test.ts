import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClosedSpotTrades,
  calculatePnlBreakdown,
  importWindows,
  type SpotExecution,
} from './tradeImport.js';

const execution = (
  partial: Partial<SpotExecution> & Pick<SpotExecution, 'side' | 'amount' | 'price' | 'orderId'>
): SpotExecution => ({
  symbol: 'BTCUSDT',
  feeUsd: partial.amount * 1,
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  executionId: `${partial.orderId}-${partial.amount}-${partial.price}`,
  ...partial,
});

test('aggregates partial fills and emits one final trade for the closing order', () => {
  const trades = buildClosedSpotTrades([
    execution({ side: 'buy', amount: 1, price: 100, orderId: 'buy-1' }),
    execution({
      side: 'buy',
      amount: 1,
      price: 110,
      orderId: 'buy-1',
      timestamp: new Date('2026-01-01T00:00:01.000Z'),
    }),
    execution({
      side: 'sell',
      amount: 1.5,
      price: 120,
      orderId: 'sell-1',
      feeUsd: 1.5,
      timestamp: new Date('2026-01-02T00:00:00.000Z'),
    }),
  ]);

  assert.equal(trades.length, 1);
  assert.equal(trades[0].amount, 1.5);
  assert.equal(trades[0].entryPrice, 105);
  assert.equal(trades[0].exitPrice, 120);
  assert.equal(trades[0].fee_usd, 3);
  assert.equal(trades[0].pnl_realized, 19.5);
  assert.equal(trades[0].tx_hash, 'bybit:spot:sell-1');
});

test('keeps remaining inventory and realizes it on the next sell', () => {
  const trades = buildClosedSpotTrades([
    execution({ side: 'buy', amount: 2, price: 100, orderId: 'buy-1', feeUsd: 2 }),
    execution({ side: 'sell', amount: 1, price: 120, orderId: 'sell-1', feeUsd: 1 }),
    execution({
      side: 'sell',
      amount: 1,
      price: 90,
      orderId: 'sell-2',
      feeUsd: 1,
      timestamp: new Date('2026-01-03T00:00:00.000Z'),
    }),
  ]);

  assert.deepEqual(
    trades.map((trade) => trade.pnl_realized),
    [18, -12]
  );
});

test('does not invent P&L for a sell without imported buy inventory', () => {
  const trades = buildClosedSpotTrades([
    execution({ side: 'sell', amount: 1, price: 120, orderId: 'sell-1' }),
  ]);
  assert.equal(trades.length, 0);
});

test('keeps Bybit import windows safely inside the two-year history boundary', () => {
  const now = Date.parse('2026-07-25T12:00:00.000Z');
  const requestedStart = new Date('2020-01-01T00:00:00.000Z');
  const windows = importWindows(requestedStart, now);
  const exactTwoYearBoundary = Date.parse('2024-07-25T12:00:00.000Z');

  assert.ok(windows.length > 0);
  assert.ok(windows[0].start > exactTwoYearBoundary);
  assert.ok(windows.every((window) => window.end - window.start < 7 * 24 * 60 * 60 * 1000));
  assert.equal(windows.at(-1)?.end, now);
});

test('reconciles gross movement, fees, funding adjustments and Bybit net P&L', () => {
  const result = calculatePnlBreakdown({
    side: 'buy',
    amount: 3.53,
    entryPrice: 60.06,
    exitPrice: 60.07,
    fees: 0.42,
    netPnl: -0.42,
  });

  assert.ok(Math.abs(result.grossPnl - 0.0353) < 1e-9);
  assert.ok(Math.abs(result.fundingAndAdjustments + 0.0353) < 1e-9);
  assert.ok(
    Math.abs(result.grossPnl - result.fees + result.fundingAndAdjustments - result.netPnl) < 1e-9
  );
});
