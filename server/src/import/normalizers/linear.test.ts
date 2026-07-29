import assert from 'node:assert/strict';
import test from 'node:test';
import { linearFixtures } from './linear.fixtures.js';
import { normalizeLinearPositionCycles } from './linear.js';

for (const fixture of linearFixtures) {
  test(`linear fixture: ${fixture.name}`, () => {
    const cycles = normalizeLinearPositionCycles(fixture);
    assert.equal(cycles.length, fixture.expected.length);

    fixture.expected.forEach((expected, index) => {
      const cycle = cycles[index];
      assert.equal(cycle.direction, expected.direction);
      assert.equal(cycle.positionIndex, expected.positionIndex);
      assert.equal(cycle.quantity.toString(), expected.quantity);
      assert.equal(cycle.averageEntryPrice.toString(), expected.averageEntryPrice);
      assert.equal(cycle.averageExitPrice.toString(), expected.averageExitPrice);
      assert.equal(cycle.grossPnlUsd.toString(), expected.grossPnlUsd);
      assert.equal(cycle.tradingFeesUsd.toString(), expected.tradingFeesUsd);
      assert.equal(cycle.fundingUsd.toString(), expected.fundingUsd);
      assert.equal(cycle.adjustmentsUsd.toString(), expected.adjustmentsUsd);
      assert.equal(cycle.netPnlUsd.toString(), expected.netPnlUsd);
      assert.equal(cycle.dataQuality, expected.dataQuality);
      assert.deepEqual(cycle.qualityReasons, expected.qualityReasons ?? []);
      if (expected.eventRoles) {
        assert.deepEqual(
          cycle.events.map((event) => event.role),
          expected.eventRoles
        );
      }
    });
  });
}

test('conflicting executions with one external id fail loudly', () => {
  const occurredAt = new Date('2026-02-01T00:00:00.000Z');
  assert.throws(
    () =>
      normalizeLinearPositionCycles({
        executions: [
          {
            sourceId: 'source-1',
            externalId: 'conflict',
            orderId: 'order-1',
            symbol: 'BTCUSDT',
            positionIndex: 0,
            side: 'BUY',
            quantity: '1',
            price: '100',
            feeUsd: '0',
            occurredAt,
          },
          {
            sourceId: 'source-1',
            externalId: 'conflict',
            orderId: 'order-1',
            symbol: 'BTCUSDT',
            positionIndex: 0,
            side: 'BUY',
            quantity: '2',
            price: '100',
            feeUsd: '0',
            occurredAt,
          },
        ],
      }),
    /Conflicting execution payload/
  );
});
