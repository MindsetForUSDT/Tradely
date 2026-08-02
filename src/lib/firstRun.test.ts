import { describe, expect, it } from 'vitest';
import { getFirstRunState, type FirstRunSource } from '@/lib/firstRun';

function source(overrides: Partial<FirstRunSource> = {}): FirstRunSource {
  return {
    id: 'source-1',
    processing_status: 'completed',
    ...overrides,
  };
}

describe('first-run journey', () => {
  it('starts with a real source connection', () => {
    expect(getFirstRunState([])).toMatchObject({ stage: 'connect', action: 'connect' });
  });

  it('keeps a running import separate from a failed import', () => {
    expect(getFirstRunState([source({ processing_status: 'processing' })]).stage).toBe('syncing');
    expect(getFirstRunState([source({ processing_status: 'failed' })])).toMatchObject({
      stage: 'failed',
      action: 'sync',
      sourceId: 'source-1',
    });
  });

  it('does not open analytics while incomplete records need review', () => {
    expect(
      getFirstRunState([
        source({
          data_quality: {
            status: 'needs_review',
            total_trades: 8,
            final_trades: 6,
            incomplete_trades: 2,
            last_trade_at: null,
            last_sync_imported: 8,
            checks: [],
          },
        }),
      ])
    ).toMatchObject({ stage: 'review', action: 'review', activeStep: 2 });
  });

  it('finishes only with verified final trades', () => {
    expect(
      getFirstRunState([
        source({
          data_quality: {
            status: 'verified',
            total_trades: 12,
            final_trades: 12,
            incomplete_trades: 0,
            last_trade_at: '2026-08-01T10:00:00.000Z',
            last_sync_imported: 12,
            checks: [],
          },
        }),
      ])
    ).toMatchObject({ stage: 'ready', action: 'report', activeStep: 3 });
  });
});
