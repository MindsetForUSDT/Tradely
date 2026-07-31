import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SYNC_POLL_MS,
  findCompletedWalletSyncs,
  getWalletPollInterval,
  IDLE_SYNC_POLL_MS,
} from './syncEvents';

describe('getWalletPollInterval', () => {
  it('polls quickly while an import is active', () => {
    expect(getWalletPollInterval([{ id: 'wallet-1', processing_status: 'processing' }])).toBe(
      ACTIVE_SYNC_POLL_MS
    );
  });

  it('keeps a lightweight heartbeat after an import completes', () => {
    expect(
      getWalletPollInterval([
        {
          id: 'wallet-1',
          processing_status: 'completed',
          last_synced_at: '2026-07-31T08:00:00.000Z',
        },
      ])
    ).toBe(IDLE_SYNC_POLL_MS);
  });
});

describe('findCompletedWalletSyncs', () => {
  it('detects a new successful background completion without firing on first load', () => {
    const current = [
      {
        id: 'wallet-1',
        processing_status: 'completed',
        last_synced_at: '2026-07-31T09:00:00.000Z',
      },
    ];

    expect(findCompletedWalletSyncs(null, current)).toEqual([]);
    expect(
      findCompletedWalletSyncs(
        [
          {
            id: 'wallet-1',
            processing_status: 'processing',
            last_synced_at: '2026-07-31T08:00:00.000Z',
          },
        ],
        current
      )
    ).toEqual(['wallet-1']);
  });
});
