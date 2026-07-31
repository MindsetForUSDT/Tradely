import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '@prisma/client';
import { getWalletSyncState, requestWalletSync, syncDueWallets } from './walletSync.js';

test('does not start another sync while the source is already processing', async () => {
  let syncCalls = 0;
  let updateArgs: Prisma.WalletUpdateManyArgs | undefined;

  const result = await requestWalletSync('wallet-1', 'user-1', {
    updateMany: async (args) => {
      updateArgs = args;
      return { count: 0 };
    },
    sync: async () => {
      syncCalls += 1;
      return 0;
    },
  });

  assert.deepEqual(updateArgs?.where, {
    id: 'wallet-1',
    user_id: 'user-1',
    processing_status: { not: 'processing' },
  });
  assert.deepEqual(updateArgs?.data, {
    processing_status: 'processing',
    error_message: null,
  });
  assert.deepEqual(result, {
    started: false,
    processing_status: 'processing',
  });
  assert.equal(syncCalls, 0);
});

test('reports an automatic source as due when it has never completed a sync', () => {
  assert.deepEqual(getWalletSyncState('{"autoSync":true,"syncInterval":60}', null, 0), {
    enabled: true,
    interval_minutes: 60,
    next_sync_at: null,
    is_due: true,
  });
});

test('calculates the next automatic sync from the last successful completion', () => {
  const lastSyncedAt = new Date('2026-07-31T08:00:00.000Z');
  const schedule = getWalletSyncState(
    '{"autoSync":true,"syncInterval":60}',
    lastSyncedAt,
    new Date('2026-07-31T08:59:00.000Z').getTime()
  );

  assert.deepEqual(schedule, {
    enabled: true,
    interval_minutes: 60,
    next_sync_at: '2026-07-31T09:00:00.000Z',
    is_due: false,
  });
});

test('scheduler starts only due sources and ignores disabled automatic sync', async () => {
  const started: string[] = [];
  const result = await syncDueWallets({
    findWallets: async () => [
      {
        id: 'due-wallet',
        settings: '{"autoSync":true,"syncInterval":5}',
        last_synced_at: new Date(Date.now() - 6 * 60_000),
        processing_status: 'completed',
      },
      {
        id: 'fresh-wallet',
        settings: '{"autoSync":true,"syncInterval":60}',
        last_synced_at: new Date(),
        processing_status: 'completed',
      },
      {
        id: 'disabled-wallet',
        settings: '{"autoSync":false,"syncInterval":5}',
        last_synced_at: null,
        processing_status: 'completed',
      },
    ],
    sync: async (walletId) => {
      started.push(walletId);
      return 1;
    },
  });

  assert.deepEqual(started, ['due-wallet']);
  assert.deepEqual(result, { due: 1, started: 1 });
});
