import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawExchangeEventInput } from './domain.js';
import { hashRawPayload, ingestRawEvents, type RawEventStore } from './raw-ingestion.js';

type RawEventKey = Parameters<RawEventStore['findExisting']>[0][number];
type PreparedRawEvent = Parameters<RawEventStore['insertMany']>[0][number];

const keyOf = (event: RawEventKey) =>
  `${event.sourceId}\u0000${event.eventKind}\u0000${event.externalId}`;

class MemoryRawEventStore implements RawEventStore {
  readonly rows = new Map<string, PreparedRawEvent>();

  async findExisting(keys: RawEventKey[]) {
    return keys.flatMap((key) => {
      const row = this.rows.get(keyOf(key));
      return row
        ? [
            {
              sourceId: row.sourceId,
              eventKind: row.eventKind,
              externalId: row.externalId,
              payloadHash: row.payloadHash,
            },
          ]
        : [];
    });
  }

  async insertMany(events: PreparedRawEvent[]) {
    let inserted = 0;
    for (const event of events) {
      const key = keyOf(event);
      if (this.rows.has(key)) continue;
      this.rows.set(key, event);
      inserted += 1;
    }
    return inserted;
  }
}

const rawEvent = (payload: RawExchangeEventInput['payload']): RawExchangeEventInput => ({
  sourceId: 'source-1',
  jobId: 'job-1',
  provider: 'BYBIT',
  eventKind: 'EXECUTION',
  externalId: 'linear:exec-1',
  symbol: 'BTCUSDT',
  marketType: 'LINEAR',
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  payload,
});

test('canonical payload hash ignores object key order', () => {
  assert.equal(
    hashRawPayload({ a: 1, nested: { x: true, y: 'value' } }),
    hashRawPayload({ nested: { y: 'value', x: true }, a: 1 })
  );
});

test('raw ingestion is idempotent for duplicate pages', async () => {
  const store = new MemoryRawEventStore();
  const event = rawEvent({ execId: 'exec-1', qty: '1' });
  const first = await ingestRawEvents(store, [event, event]);
  const second = await ingestRawEvents(store, [event]);

  assert.deepEqual(first, {
    receivedCount: 2,
    uniqueCount: 1,
    insertedCount: 1,
    duplicateCount: 1,
    conflicts: [],
  });
  assert.deepEqual(second, {
    receivedCount: 1,
    uniqueCount: 1,
    insertedCount: 0,
    duplicateCount: 1,
    conflicts: [],
  });
  assert.equal(store.rows.size, 1);
});

test('changed upstream payload is reported and immutable row is preserved', async () => {
  const store = new MemoryRawEventStore();
  await ingestRawEvents(store, [rawEvent({ execId: 'exec-1', qty: '1' })]);
  const originalHash = [...store.rows.values()][0].payloadHash;

  const result = await ingestRawEvents(store, [rawEvent({ execId: 'exec-1', qty: '2' })]);

  assert.equal(result.insertedCount, 0);
  assert.equal(result.conflicts.length, 1);
  assert.equal([...store.rows.values()][0].payloadHash, originalHash);
});
