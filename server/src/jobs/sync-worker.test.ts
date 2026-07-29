import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawEventStore } from '../import/raw-ingestion.js';
import { BybitApiError, type BybitReader } from '../integrations/bybit/client.js';
import type { ClaimedSyncJob, SyncJobFailure, SyncJobStore } from './sync-job-store.js';
import { processNextSyncJob } from './sync-worker.js';

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

class MemoryJobStore implements SyncJobStore {
  claimed = false;
  phases: string[] = [];
  failure?: SyncJobFailure;

  constructor(
    readonly job: ClaimedSyncJob,
    readonly failureResult: 'RETRY_QUEUED' | 'FAILED' = 'FAILED'
  ) {}

  async claimNext() {
    if (this.claimed) return null;
    this.claimed = true;
    return this.job;
  }

  async updateProgress(_jobId: string, _workerId: string, phase: string) {
    this.phases.push(phase);
  }

  async heartbeat() {}

  async complete(_job: ClaimedSyncJob, _workerId: string, result: { warningCount: number }) {
    return result.warningCount ? ('PARTIAL' as const) : ('SUCCEEDED' as const);
  }

  async fail(
    _job: ClaimedSyncJob,
    _workerId: string,
    failure: SyncJobFailure
  ): Promise<'RETRY_QUEUED' | 'FAILED'> {
    this.failure = failure;
    return this.failureResult;
  }
}

const claimedJob = (partial: Partial<ClaimedSyncJob> = {}): ClaimedSyncJob => ({
  id: 'job-1',
  sourceId: 'source-1',
  userId: 'user-1',
  provider: 'BYBIT',
  importFrom: null,
  requestedFrom: new Date('2026-01-01T00:00:00.000Z'),
  requestedTo: new Date('2026-01-02T00:00:00.000Z'),
  attempt: 1,
  maxAttempts: 5,
  encryptedCredentials: null,
  credentialsIv: null,
  credentialsTag: null,
  ...partial,
});

async function* emptyPage() {
  yield { list: [] };
}

function successfulReader(): BybitReader {
  return {
    executionPages: () => emptyPage(),
    closedPnlPages: () => emptyPage(),
    transactionPages: () => emptyPage(),
    async getWalletBalance() {
      return { list: [{ totalEquity: '100' }] };
    },
    async getApiKeyInfo() {
      return { readOnly: 1, ips: [] };
    },
  };
}

test('claims a job, persists raw balance and completes the lease', async () => {
  const jobStore = new MemoryJobStore(claimedJob());
  const rawEventStore = new MemoryRawEventStore();
  const run = await processNextSyncJob('worker-1', {
    jobStore,
    rawEventStore,
    now: () => new Date('2026-01-02T00:00:01.000Z'),
    resolveCredentials: () => ({ apiKey: 'key', apiSecret: 'secret' }),
    createBybitClient: () => successfulReader(),
  });

  assert.equal(run?.status, 'SUCCEEDED');
  assert.equal(run?.result?.insertedCount, 1);
  assert.equal(rawEventStore.rows.size, 1);
  assert.equal(jobStore.phases.at(-1), 'COMPLETED');
});

test('queues a retry for a temporary Bybit failure', async () => {
  const jobStore = new MemoryJobStore(claimedJob(), 'RETRY_QUEUED');
  const failingReader = successfulReader();
  failingReader.getApiKeyInfo = async () => {
    throw new BybitApiError('Too many visits!', {
      code: 'BYBIT_10006',
      retCode: 10006,
      retryable: true,
      retryAfterMs: 2_000,
    });
  };

  const run = await processNextSyncJob('worker-1', {
    jobStore,
    rawEventStore: new MemoryRawEventStore(),
    resolveCredentials: () => ({ apiKey: 'key', apiSecret: 'secret' }),
    createBybitClient: () => failingReader,
  });

  assert.equal(run?.status, 'RETRY_QUEUED');
  assert.equal(jobStore.failure?.code, 'BYBIT_10006');
  assert.equal(jobStore.failure?.retryable, true);
  assert.equal(jobStore.failure?.retryAfterMs, 2_000);
});

test('fails permanently when the source has a write-enabled API key', async () => {
  const jobStore = new MemoryJobStore(claimedJob());
  const writeKeyReader = successfulReader();
  writeKeyReader.getApiKeyInfo = async () => ({ readOnly: 0 });

  const run = await processNextSyncJob('worker-1', {
    jobStore,
    rawEventStore: new MemoryRawEventStore(),
    resolveCredentials: () => ({ apiKey: 'key', apiSecret: 'secret' }),
    createBybitClient: () => writeKeyReader,
  });

  assert.equal(run?.status, 'FAILED');
  assert.equal(jobStore.failure?.code, 'BYBIT_WRITE_KEY');
  assert.equal(jobStore.failure?.retryable, false);
});
