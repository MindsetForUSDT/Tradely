import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawExchangeEventInput } from '../../import/domain.js';
import { ingestRawEvents, type RawEventStore } from '../../import/raw-ingestion.js';
import type { BybitReader } from './client.js';
import { collectBybitRawEvents } from './raw-collector.js';
import type { BybitListResult } from './schemas.js';

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

async function* page<T>(result: BybitListResult<T>) {
  yield result;
}

function reader(): BybitReader {
  return {
    executionPages(category) {
      return category === 'linear'
        ? page({
            list: [
              {
                execId: 'exec-1',
                orderId: 'order-1',
                symbol: 'BTCUSDT',
                execTime: '1767225600000',
                execType: 'Trade',
              },
              {
                execId: 'broken-exec',
                symbol: 'BTCUSDT',
                execTime: '',
              },
            ],
          })
        : page({ list: [] });
    },
    closedPnlPages() {
      return page({
        list: [
          {
            orderId: 'close-1',
            symbol: 'BTCUSDT',
            updatedTime: '1767229200000',
            closedPnl: '18.4',
          },
        ],
      });
    },
    transactionPages() {
      return page({
        list: [
          {
            id: 'transaction-1',
            category: 'linear',
            symbol: 'BTCUSDT',
            transactionTime: '1767227400000',
            type: 'SETTLEMENT',
            funding: '-0.2',
          },
        ],
      });
    },
    async getWalletBalance() {
      return { list: [{ accountType: 'UNIFIED', totalEquity: '123.45' }] };
    },
    async getApiKeyInfo() {
      return { readOnly: 1, ips: ['203.0.113.10'] };
    },
  };
}

test('streams Bybit pages into immutable raw events and remains idempotent', async () => {
  const store = new MemoryRawEventStore();
  const phases: string[] = [];
  const input = {
    client: reader(),
    sourceId: 'source-1',
    jobId: 'job-1',
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: new Date('2026-01-02T00:00:00.000Z'),
    persist: (events: RawExchangeEventInput[]) => ingestRawEvents(store, events),
    onPhase: (phase: string) => {
      phases.push(phase);
    },
  };

  const first = await collectBybitRawEvents(input);
  const second = await collectBybitRawEvents(input);

  assert.equal(first.fetchedCount, 5);
  assert.equal(first.insertedCount, 4);
  assert.equal(first.warningCount, 1);
  assert.equal(first.balance, 123.45);
  assert.equal(first.ipBound, true);
  assert.equal(second.insertedCount, 0);
  assert.equal(second.duplicateCount, 4);
  assert.equal(store.rows.size, 4);
  assert.ok(
    [...store.rows.values()].some(
      (row) => row.eventKind === 'EXECUTION' && row.externalId === 'linear:exec-1'
    )
  );
  assert.ok(
    [...store.rows.values()].some(
      (row) =>
        row.eventKind === 'CLOSED_PNL' && row.externalId === 'linear:BTCUSDT:close-1:1767229200000'
    )
  );
  assert.deepEqual(phases.slice(0, 2), ['VALIDATING_SOURCE', 'FETCHING_EXECUTIONS']);
  assert.equal(phases.at(-1), 'COMPLETED');
});
