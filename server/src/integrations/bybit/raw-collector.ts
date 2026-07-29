import type { Prisma } from '@prisma/client';
import type { RawExchangeEventInput } from '../../import/domain.js';
import {
  hashRawPayload,
  type RawEventConflict,
  type RawIngestionResult,
} from '../../import/raw-ingestion.js';
import { BybitApiError, type BybitReader } from './client.js';
import { bybitHistoryWindows } from './history.js';
import type { BybitCategory, BybitClosedPnl, BybitExecution, BybitTransaction } from './schemas.js';

export type BybitSyncPhase =
  | 'VALIDATING_SOURCE'
  | 'FETCHING_EXECUTIONS'
  | 'FETCHING_CLOSED_PNL'
  | 'FETCHING_TRANSACTIONS'
  | 'FETCHING_BALANCE'
  | 'PERSISTING_RAW'
  | 'COMPLETED';

export interface BybitCollectorWarning {
  code: 'INVALID_EVENT' | 'RAW_CONFLICT';
  eventKind: RawExchangeEventInput['eventKind'];
  externalId?: string;
  message: string;
}

export interface BybitRawCollectorResult {
  fetchedCount: number;
  insertedCount: number;
  duplicateCount: number;
  warningCount: number;
  conflictCount: number;
  warnings: BybitCollectorWarning[];
  balance: number;
  readOnly: boolean;
  ipBound: boolean;
}

export interface BybitRawCollectorInput {
  client: BybitReader;
  sourceId: string;
  jobId: string;
  from: Date;
  to: Date;
  persist: (events: RawExchangeEventInput[]) => Promise<RawIngestionResult>;
  onPhase?: (phase: BybitSyncPhase, progress: number) => Promise<void> | void;
  onHeartbeat?: (counters: {
    fetchedCount: number;
    insertedCount: number;
    warningCount: number;
  }) => Promise<void> | void;
}

const MAX_REPORTED_WARNINGS = 100;

function jsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stableFallbackId(prefix: string, payload: Prisma.InputJsonValue): string {
  return `${prefix}:hash:${hashRawPayload(payload)}`;
}

function executionEvent(
  sourceId: string,
  jobId: string,
  category: BybitCategory,
  record: BybitExecution
): RawExchangeEventInput | undefined {
  const payload = jsonPayload(record);
  const occurredAt = validDate(record.execTime);
  if (!occurredAt) return undefined;
  const execId = String(record.execId ?? '').trim();
  return {
    sourceId,
    jobId,
    provider: 'BYBIT',
    eventKind: 'EXECUTION',
    externalId: execId
      ? `${category}:${execId}`
      : stableFallbackId(`execution:${category}`, payload),
    symbol: String(record.symbol ?? '').trim() || undefined,
    marketType: category === 'linear' ? 'LINEAR' : 'SPOT',
    occurredAt,
    payload,
  };
}

function closedPnlEvent(
  sourceId: string,
  jobId: string,
  record: BybitClosedPnl
): RawExchangeEventInput | undefined {
  const payload = jsonPayload(record);
  const occurredAt = validDate(record.updatedTime);
  if (!occurredAt) return undefined;
  const symbol = String(record.symbol ?? '').trim();
  const orderId = String(record.orderId ?? '').trim();
  const updatedTime = String(record.updatedTime ?? '').trim();
  const externalId =
    symbol && orderId && updatedTime
      ? `linear:${symbol}:${orderId}:${updatedTime}`
      : stableFallbackId('closed-pnl:linear', payload);
  return {
    sourceId,
    jobId,
    provider: 'BYBIT',
    eventKind: 'CLOSED_PNL',
    externalId,
    symbol: symbol || undefined,
    marketType: 'LINEAR',
    occurredAt,
    payload,
  };
}

function transactionEvent(
  sourceId: string,
  jobId: string,
  record: BybitTransaction
): RawExchangeEventInput | undefined {
  const payload = jsonPayload(record);
  const occurredAt = validDate(record.transactionTime);
  if (!occurredAt) return undefined;
  const category = String(record.category ?? 'linear').toLowerCase();
  const transactionId = String(record.id ?? '').trim();
  return {
    sourceId,
    jobId,
    provider: 'BYBIT',
    eventKind: 'TRANSACTION',
    externalId: transactionId
      ? `${category}:${transactionId}`
      : stableFallbackId(`transaction:${category}`, payload),
    symbol: String(record.symbol ?? '').trim() || undefined,
    marketType: category === 'spot' ? 'SPOT' : 'LINEAR',
    occurredAt,
    payload,
  };
}

function conflictWarning(conflict: RawEventConflict): BybitCollectorWarning {
  return {
    code: 'RAW_CONFLICT',
    eventKind: conflict.eventKind as RawExchangeEventInput['eventKind'],
    externalId: conflict.externalId,
    message: 'Bybit returned a changed payload for an immutable external event',
  };
}

export async function collectBybitRawEvents({
  client,
  sourceId,
  jobId,
  from,
  to,
  persist,
  onPhase,
  onHeartbeat,
}: BybitRawCollectorInput): Promise<BybitRawCollectorResult> {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    throw new Error('Invalid Bybit sync time range');
  }

  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;
  let warningCount = 0;
  let conflictCount = 0;
  const warnings: BybitCollectorWarning[] = [];

  const reportWarning = (warning: BybitCollectorWarning) => {
    warningCount += 1;
    if (warnings.length < MAX_REPORTED_WARNINGS) warnings.push(warning);
  };

  const persistPage = async <T>(
    eventKind: RawExchangeEventInput['eventKind'],
    records: T[],
    mapper: (record: T) => RawExchangeEventInput | undefined
  ) => {
    fetchedCount += records.length;
    const events: RawExchangeEventInput[] = [];
    for (const record of records) {
      const event = mapper(record);
      if (event) {
        events.push(event);
      } else {
        reportWarning({
          code: 'INVALID_EVENT',
          eventKind,
          message: `Skipped Bybit ${eventKind} without a valid timestamp`,
        });
      }
    }
    if (!events.length) return;

    const result = await persist(events);
    insertedCount += result.insertedCount;
    duplicateCount += result.duplicateCount;
    conflictCount += result.conflicts.length;
    result.conflicts.forEach((conflict) => reportWarning(conflictWarning(conflict)));
    await onHeartbeat?.({ fetchedCount, insertedCount, warningCount });
  };

  await onPhase?.('VALIDATING_SOURCE', 5);
  const keyInfo = await client.getApiKeyInfo();
  if (Number(keyInfo.readOnly) !== 1) {
    throw new BybitApiError(
      'Ключ имеет права записи. Создайте отдельный Bybit API-ключ в режиме Read-Only.',
      { code: 'BYBIT_WRITE_KEY' }
    );
  }

  const windows = bybitHistoryWindows(from, to.getTime());

  await onPhase?.('FETCHING_EXECUTIONS', 15);
  for (const category of ['linear', 'spot'] as const) {
    for (const window of windows) {
      for await (const page of client.executionPages(category, window.start, window.end)) {
        await persistPage('EXECUTION', page.list ?? [], (record: BybitExecution) =>
          executionEvent(sourceId, jobId, category, record)
        );
      }
    }
  }

  await onPhase?.('FETCHING_CLOSED_PNL', 50);
  for (const window of windows) {
    for await (const page of client.closedPnlPages(window.start, window.end)) {
      await persistPage('CLOSED_PNL', page.list ?? [], (record: BybitClosedPnl) =>
        closedPnlEvent(sourceId, jobId, record)
      );
    }
  }

  await onPhase?.('FETCHING_TRANSACTIONS', 70);
  for (const window of windows) {
    for await (const page of client.transactionPages(window.start, window.end)) {
      await persistPage('TRANSACTION', page.list ?? [], (record: BybitTransaction) =>
        transactionEvent(sourceId, jobId, record)
      );
    }
  }

  await onPhase?.('FETCHING_BALANCE', 85);
  const balanceResult = await client.getWalletBalance();
  const balance = (balanceResult.list ?? []).reduce(
    (sum, account) => sum + Number(account.totalEquity ?? 0),
    0
  );
  const capturedAt = new Date(to);
  const balancePayload = jsonPayload({
    capturedAt: capturedAt.toISOString(),
    accounts: balanceResult.list ?? [],
  });
  await persistPage(
    'BALANCE',
    [
      {
        externalId: `balance:${capturedAt.getTime()}`,
        payload: balancePayload,
        occurredAt: capturedAt,
      },
    ],
    (record: {
      externalId: string;
      payload: Prisma.InputJsonValue;
      occurredAt: Date;
    }): RawExchangeEventInput => ({
      sourceId,
      jobId,
      provider: 'BYBIT',
      eventKind: 'BALANCE',
      externalId: record.externalId,
      occurredAt: record.occurredAt,
      payload: record.payload,
    })
  );

  await onPhase?.('PERSISTING_RAW', 95);
  await onPhase?.('COMPLETED', 100);
  return {
    fetchedCount,
    insertedCount,
    duplicateCount,
    warningCount,
    conflictCount,
    warnings,
    balance: Number.isFinite(balance) ? balance : 0,
    readOnly: true,
    ipBound: Array.isArray(keyInfo.ips) && keyInfo.ips.length > 0,
  };
}
