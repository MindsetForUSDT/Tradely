import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClosedSpotTrades, type SpotExecution } from './tradeImport.js';

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
