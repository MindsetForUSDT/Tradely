import type { RawEventStore } from '../import/raw-ingestion.js';
import { ingestRawEvents } from '../import/raw-ingestion.js';
import {
  BybitApiError,
  BybitClient,
  type BybitClientOptions,
  type BybitReader,
} from '../integrations/bybit/client.js';
import {
  collectBybitRawEvents,
  type BybitRawCollectorResult,
} from '../integrations/bybit/raw-collector.js';
import type { BybitCredentials } from '../integrations/bybit/schemas.js';
import { decrypt } from '../services/crypto.js';
import type { ClaimedSyncJob, SyncJobFailure, SyncJobStore } from './sync-job-store.js';

const DEFAULT_LEASE_MS = 60_000;
const DEFAULT_IMPORT_DAYS = 30;

export interface SyncWorkerDependencies {
  jobStore: SyncJobStore;
  rawEventStore: RawEventStore;
  now?: () => Date;
  leaseMs?: number;
  resolveCredentials?: (job: ClaimedSyncJob) => Promise<BybitCredentials> | BybitCredentials;
  createBybitClient?: (credentials: BybitCredentials, options?: BybitClientOptions) => BybitReader;
}

export interface SyncWorkerRun {
  jobId: string;
  sourceId: string;
  status: 'SUCCEEDED' | 'PARTIAL' | 'RETRY_QUEUED' | 'FAILED' | 'LEASE_LOST';
  result?: BybitRawCollectorResult;
  errorCode?: string;
}

class SyncWorkerError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = 'SyncWorkerError';
  }
}

function defaultCredentialResolver(job: ClaimedSyncJob): BybitCredentials {
  if (!job.encryptedCredentials || !job.credentialsIv || !job.credentialsTag) {
    throw new SyncWorkerError('У источника отсутствуют API-ключи', 'SOURCE_CREDENTIALS_MISSING');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      decrypt({
        encrypted: job.encryptedCredentials,
        iv: job.credentialsIv,
        tag: job.credentialsTag,
      })
    );
  } catch {
    throw new SyncWorkerError(
      'Не удалось расшифровать API-ключи источника',
      'SOURCE_CREDENTIALS_INVALID'
    );
  }
  const credentials = parsed as Partial<BybitCredentials>;
  if (!credentials.apiKey?.trim() || !credentials.apiSecret?.trim()) {
    throw new SyncWorkerError(
      'В сохранённых данных отсутствует Bybit API key или secret',
      'SOURCE_CREDENTIALS_INVALID'
    );
  }
  return { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret };
}

function normalizeFailure(error: unknown): SyncJobFailure {
  if (error instanceof BybitApiError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs,
    };
  }
  if (error instanceof SyncWorkerError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  return {
    code: 'SYNC_UNEXPECTED',
    message: error instanceof Error ? error.message : 'Unknown sync worker error',
    retryable: false,
  };
}

export async function processNextSyncJob(
  workerId: string,
  dependencies: SyncWorkerDependencies
): Promise<SyncWorkerRun | null> {
  const now = dependencies.now ?? (() => new Date());
  const leaseMs = dependencies.leaseMs ?? DEFAULT_LEASE_MS;
  const job = await dependencies.jobStore.claimNext(workerId, now(), leaseMs);
  if (!job) return null;

  try {
    if (job.provider !== 'BYBIT') {
      throw new SyncWorkerError(
        `Provider ${job.provider} is not supported by this worker`,
        'SOURCE_PROVIDER_UNSUPPORTED'
      );
    }
    const credentials = await (dependencies.resolveCredentials ?? defaultCredentialResolver)(job);
    const client = (dependencies.createBybitClient ?? ((value) => new BybitClient(value)))(
      credentials
    );
    const requestedTo = job.requestedTo ?? now();
    const requestedFrom =
      job.requestedFrom ??
      job.importFrom ??
      new Date(requestedTo.getTime() - DEFAULT_IMPORT_DAYS * 24 * 60 * 60 * 1000);
    const leaseExpiry = () => new Date(now().getTime() + leaseMs);

    const result = await collectBybitRawEvents({
      client,
      sourceId: job.sourceId,
      jobId: job.id,
      from: requestedFrom,
      to: requestedTo,
      persist: (events) => ingestRawEvents(dependencies.rawEventStore, events),
      onPhase: (phase, progress) =>
        dependencies.jobStore.updateProgress(job.id, workerId, phase, progress, leaseExpiry()),
      onHeartbeat: (counters) =>
        dependencies.jobStore.heartbeat(job.id, workerId, leaseExpiry(), counters),
    });
    const status = await dependencies.jobStore.complete(job, workerId, result, now());
    return { jobId: job.id, sourceId: job.sourceId, status, result };
  } catch (error) {
    const failure = normalizeFailure(error);
    const status = await dependencies.jobStore.fail(job, workerId, failure, now());
    return {
      jobId: job.id,
      sourceId: job.sourceId,
      status,
      errorCode: failure.code,
    };
  }
}
