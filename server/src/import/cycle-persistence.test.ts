import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCycleUpsert,
  persistNormalizedCycles,
  type PositionCycleStore,
} from './cycle-persistence.js';
import { linearFixtures } from './normalizers/linear.fixtures.js';
import { normalizeLinearPositionCycles } from './normalizers/linear.js';

type CycleUpsertArgs = Parameters<PositionCycleStore['upsert']>[0];

test('cycle reprocessing updates derived values without overwriting review', async () => {
  const cycle = normalizeLinearPositionCycles(linearFixtures[0])[0];
  const review = {
    status: 'REVIEWED',
    notes: 'Не увеличивать риск после первого убытка',
    emotion_before: 'CALM',
  };
  const stored: Record<string, unknown> = {
    id: 'cycle-row-1',
    cycle_key: cycle.cycleKey,
    review,
  };
  let latestArgs: CycleUpsertArgs | undefined;

  const store: PositionCycleStore = {
    async upsert(args) {
      latestArgs = args;
      Object.assign(stored, args.update);
      return { id: String(stored.id) };
    },
  };

  await persistNormalizedCycles(store, 'user-1', [cycle]);

  assert.deepEqual(stored.review, review);
  assert.ok(latestArgs);
  assert.equal('review' in latestArgs.update, false);
  assert.equal('tags' in latestArgs.update, false);
  assert.equal(stored.net_pnl_usd?.toString(), '18');
});

test('cycle upsert uses stable source and cycle key', () => {
  const cycle = normalizeLinearPositionCycles(linearFixtures[0])[0];
  const mutation = buildCycleUpsert('user-1', cycle);

  assert.deepEqual(mutation.where.source_id_cycle_key, {
    source_id: 'source-1',
    cycle_key: cycle.cycleKey,
  });
  assert.equal(mutation.create.user_id, 'user-1');
  assert.equal(mutation.create.source_id, 'source-1');
});
