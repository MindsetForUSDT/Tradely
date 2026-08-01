import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWalletDataQuality } from './dataQuality.js';

const base = {
  processingStatus: 'completed',
  totalTrades: 12,
  finalTrades: 12,
  incompleteTrades: 0,
  lastTradeAt: new Date('2026-08-01T12:00:00.000Z'),
  lastSyncedAt: new Date('2026-08-01T12:05:00.000Z'),
  settings: '{"lastSync":{"completedAt":"2026-08-01T12:05:00.000Z","importedTrades":12}}',
};

test('marks a completed and internally consistent import as verified', () => {
  const report = buildWalletDataQuality(base);
  assert.equal(report.status, 'verified');
  assert.equal(report.final_trades, 12);
  assert.equal(report.last_sync_imported, 12);
  assert.ok(report.checks.every((check) => check.status === 'passed'));
});

test('reports incomplete persisted trades without inventing a quality score', () => {
  const report = buildWalletDataQuality({ ...base, incompleteTrades: 2 });
  assert.equal(report.status, 'needs_review');
  assert.equal(report.incomplete_trades, 2);
  assert.equal(report.checks.find((check) => check.id === 'completeness')?.status, 'warning');
  assert.equal('score' in report, false);
});

test('keeps an empty successful import distinct from a failed or active sync', () => {
  const empty = buildWalletDataQuality({
    ...base,
    totalTrades: 0,
    finalTrades: 0,
    lastTradeAt: null,
  });
  const syncing = buildWalletDataQuality({ ...base, processingStatus: 'processing' });
  const failed = buildWalletDataQuality({ ...base, processingStatus: 'failed' });

  assert.equal(empty.status, 'empty');
  assert.equal(syncing.status, 'syncing');
  assert.equal(failed.status, 'failed');
});
