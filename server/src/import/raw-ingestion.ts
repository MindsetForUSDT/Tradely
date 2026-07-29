import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { RawExchangeEventInput } from './domain.js';

const QUERY_BATCH_SIZE = 250;
const INSERT_BATCH_SIZE = 500;

interface RawEventKey {
  sourceId: string;
  eventKind: string;
  externalId: string;
}

interface ExistingRawEvent extends RawEventKey {
  payloadHash: string;
}

interface PreparedRawEvent extends ExistingRawEvent {
  jobId: string | null;
  provider: 'BYBIT' | 'CSV' | 'MANUAL';
  symbol: string | null;
  marketType: 'SPOT' | 'LINEAR' | null;
  occurredAt: Date;
  payload: Prisma.InputJsonValue;
  schemaVersion: number;
}

export interface RawEventConflict extends RawEventKey {
  storedPayloadHash: string;
  incomingPayloadHash: string;
}

export interface RawIngestionResult {
  receivedCount: number;
  uniqueCount: number;
  insertedCount: number;
  duplicateCount: number;
  conflicts: RawEventConflict[];
}

export interface RawEventStore {
  findExisting(keys: RawEventKey[]): Promise<ExistingRawEvent[]>;
  insertMany(events: PreparedRawEvent[]): Promise<number>;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, nestedValue]) => nestedValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableJson(nestedValue)}`)
    .join(',')}}`;
}

export function hashRawPayload(payload: Prisma.InputJsonValue): string {
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}

function eventKey(event: RawEventKey) {
  return `${event.sourceId}\u0000${event.eventKind}\u0000${event.externalId}`;
}

function prepareEvent(event: RawExchangeEventInput): PreparedRawEvent {
  if (!event.externalId.trim()) throw new Error('Raw event externalId cannot be empty');
  if (!Number.isInteger(event.schemaVersion ?? 1) || (event.schemaVersion ?? 1) < 1) {
    throw new Error(`Raw event ${event.externalId} has invalid schemaVersion`);
  }
  if (Number.isNaN(event.occurredAt.getTime())) {
    throw new Error(`Raw event ${event.externalId} has invalid occurredAt`);
  }
  return {
    sourceId: event.sourceId,
    jobId: event.jobId ?? null,
    provider: event.provider,
    eventKind: event.eventKind,
    externalId: event.externalId,
    symbol: event.symbol ?? null,
    marketType: event.marketType ?? null,
    occurredAt: event.occurredAt,
    payload: event.payload,
    payloadHash: hashRawPayload(event.payload),
    schemaVersion: event.schemaVersion ?? 1,
  };
}

function detectConflicts(
  incoming: Map<string, PreparedRawEvent>,
  existing: ExistingRawEvent[]
): RawEventConflict[] {
  const conflicts: RawEventConflict[] = [];
  for (const stored of existing) {
    const prepared = incoming.get(eventKey(stored));
    if (prepared && prepared.payloadHash !== stored.payloadHash) {
      conflicts.push({
        sourceId: stored.sourceId,
        eventKind: stored.eventKind,
        externalId: stored.externalId,
        storedPayloadHash: stored.payloadHash,
        incomingPayloadHash: prepared.payloadHash,
      });
    }
  }
  return conflicts.sort((left, right) => eventKey(left).localeCompare(eventKey(right)));
}

export async function ingestRawEvents(
  store: RawEventStore,
  events: RawExchangeEventInput[]
): Promise<RawIngestionResult> {
  const preparedByKey = new Map<string, PreparedRawEvent>();
  const inBatchConflicts: RawEventConflict[] = [];

  for (const event of events) {
    const prepared = prepareEvent(event);
    const key = eventKey(prepared);
    const current = preparedByKey.get(key);
    if (current && current.payloadHash !== prepared.payloadHash) {
      inBatchConflicts.push({
        sourceId: prepared.sourceId,
        eventKind: prepared.eventKind,
        externalId: prepared.externalId,
        storedPayloadHash: current.payloadHash,
        incomingPayloadHash: prepared.payloadHash,
      });
      continue;
    }
    if (!current) preparedByKey.set(key, prepared);
  }

  const prepared = [...preparedByKey.values()];
  const keys = prepared.map(({ sourceId, eventKind, externalId }) => ({
    sourceId,
    eventKind,
    externalId,
  }));
  const before = await store.findExisting(keys);
  const beforeKeys = new Set(before.map(eventKey));
  const newEvents = prepared.filter((event) => !beforeKeys.has(eventKey(event)));

  let insertedCount = 0;
  for (let index = 0; index < newEvents.length; index += INSERT_BATCH_SIZE) {
    insertedCount += await store.insertMany(newEvents.slice(index, index + INSERT_BATCH_SIZE));
  }

  // Re-read after INSERT ... ON CONFLICT DO NOTHING so concurrent writers and
  // changed upstream payloads are detected without mutating immutable raw rows.
  const after = await store.findExisting(keys);
  const conflicts = [...inBatchConflicts, ...detectConflicts(preparedByKey, after)].filter(
    (conflict, index, all) =>
      all.findIndex(
        (candidate) =>
          eventKey(candidate) === eventKey(conflict) &&
          candidate.incomingPayloadHash === conflict.incomingPayloadHash
      ) === index
  );

  return {
    receivedCount: events.length,
    uniqueCount: prepared.length,
    insertedCount,
    duplicateCount: Math.max(0, events.length - insertedCount - conflicts.length),
    conflicts,
  };
}

type PrismaRawEventClient = Pick<PrismaClient, 'rawExchangeEvent'>;

export function createPrismaRawEventStore(client: PrismaRawEventClient): RawEventStore {
  return {
    async findExisting(keys) {
      const existing: ExistingRawEvent[] = [];
      for (let index = 0; index < keys.length; index += QUERY_BATCH_SIZE) {
        const batch = keys.slice(index, index + QUERY_BATCH_SIZE);
        if (!batch.length) continue;
        const rows = await client.rawExchangeEvent.findMany({
          where: {
            OR: batch.map((key) => ({
              source_id: key.sourceId,
              event_kind: key.eventKind,
              external_id: key.externalId,
            })),
          },
          select: {
            source_id: true,
            event_kind: true,
            external_id: true,
            payload_hash: true,
          },
        });
        existing.push(
          ...rows.map((row) => ({
            sourceId: row.source_id,
            eventKind: row.event_kind,
            externalId: row.external_id,
            payloadHash: row.payload_hash,
          }))
        );
      }
      return existing;
    },
    async insertMany(events) {
      if (!events.length) return 0;
      const result = await client.rawExchangeEvent.createMany({
        data: events.map((event) => ({
          source_id: event.sourceId,
          job_id: event.jobId,
          provider: event.provider,
          event_kind: event.eventKind,
          external_id: event.externalId,
          symbol: event.symbol,
          market_type: event.marketType,
          occurred_at: event.occurredAt,
          payload: event.payload,
          payload_hash: event.payloadHash,
          schema_version: event.schemaVersion,
        })),
        skipDuplicates: true,
      });
      return result.count;
    },
  };
}
