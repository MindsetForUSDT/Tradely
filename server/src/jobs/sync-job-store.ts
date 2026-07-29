import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  BybitRawCollectorResult,
  BybitSyncPhase,
} from '../integrations/bybit/raw-collector.js';

export interface EnqueueSyncJobInput {
  sourceId: string;
  requestedBy: string;
  from?: Date;
  to?: Date;
  now?: Date;
}

export interface EnqueuedSyncJob {
  id: string;
  sourceId: string;
  status: 'QUEUED' | 'RUNNING';
  existing: boolean;
}

export interface ClaimedSyncJob {
  id: string;
  sourceId: string;
  userId: string;
  provider: 'BYBIT' | 'CSV' | 'MANUAL';
  importFrom: Date | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  attempt: number;
  maxAttempts: number;
  encryptedCredentials: string | null;
  credentialsIv: string | null;
  credentialsTag: string | null;
}

export interface SyncJobFailure {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export interface SyncJobCounters {
  fetchedCount: number;
  insertedCount: number;
  warningCount: number;
}

export interface SyncJobStore {
  claimNext(workerId: string, now: Date, leaseMs: number): Promise<ClaimedSyncJob | null>;
  updateProgress(
    jobId: string,
    workerId: string,
    phase: BybitSyncPhase,
    progress: number,
    leaseExpiresAt: Date
  ): Promise<void>;
  heartbeat(
    jobId: string,
    workerId: string,
    leaseExpiresAt: Date,
    counters: SyncJobCounters
  ): Promise<void>;
  complete(
    job: ClaimedSyncJob,
    workerId: string,
    result: BybitRawCollectorResult,
    finishedAt: Date
  ): Promise<'SUCCEEDED' | 'PARTIAL'>;
  fail(
    job: ClaimedSyncJob,
    workerId: string,
    failure: SyncJobFailure,
    failedAt: Date
  ): Promise<'RETRY_QUEUED' | 'FAILED' | 'LEASE_LOST'>;
}

interface ClaimedJobRow {
  id: string;
  source_id: string;
  requested_from: Date | null;
  requested_to: Date | null;
  attempt: number;
  max_attempts: number;
}

function cleanErrorText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export async function enqueueSyncJob(
  client: PrismaClient,
  input: EnqueueSyncJobInput
): Promise<EnqueuedSyncJob> {
  const now = input.now ?? new Date();
  try {
    const created = await client.syncJob.create({
      data: {
        id: randomUUID(),
        source_id: input.sourceId,
        active_key: input.sourceId,
        requested_by: input.requestedBy,
        requested_from: input.from,
        requested_to: input.to ?? now,
        status: 'QUEUED',
        next_attempt_at: now,
      },
      select: { id: true, source_id: true, status: true },
    });
    return {
      id: created.id,
      sourceId: created.source_id,
      status: created.status as 'QUEUED' | 'RUNNING',
      existing: false,
    };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
    const existing = await client.syncJob.findUnique({
      where: { active_key: input.sourceId },
      select: { id: true, source_id: true, status: true },
    });
    if (!existing || !['QUEUED', 'RUNNING'].includes(existing.status)) throw error;
    return {
      id: existing.id,
      sourceId: existing.source_id,
      status: existing.status as 'QUEUED' | 'RUNNING',
      existing: true,
    };
  }
}

export function createPrismaSyncJobStore(client: PrismaClient): SyncJobStore {
  const assertLease = async (
    jobId: string,
    workerId: string,
    data: Prisma.SyncJobUpdateManyMutationInput
  ) => {
    const updated = await client.syncJob.updateMany({
      where: { id: jobId, status: 'RUNNING', lease_owner: workerId },
      data,
    });
    if (updated.count !== 1) {
      throw new Error(`Sync job ${jobId} lease was lost`);
    }
  };

  return {
    claimNext(workerId, now, leaseMs) {
      return client.$transaction(async (tx) => {
        // A worker can die during its last permitted attempt. Reap that row before
        // claiming more work so active_key cannot block the source forever.
        await tx.$executeRaw`
          WITH exhausted AS (
            UPDATE "sync_jobs"
            SET
              "status" = 'FAILED',
              "active_key" = NULL,
              "phase" = 'FAILED',
              "error_code" = 'SYNC_ATTEMPTS_EXHAUSTED',
              "error_message" = 'Worker lease expired after the final attempt',
              "lease_owner" = NULL,
              "lease_expires_at" = NULL,
              "finished_at" = ${now}
            WHERE "status" = 'RUNNING'
              AND "lease_expires_at" <= ${now}
              AND "attempt" >= "max_attempts"
            RETURNING "source_id"
          )
          UPDATE "trading_sources"
          SET
            "status" = 'DEGRADED',
            "last_error_code" = 'SYNC_ATTEMPTS_EXHAUSTED',
            "last_error_message" = 'Worker lease expired after the final attempt',
            "updated_at" = ${now}
          WHERE "id" IN (SELECT "source_id" FROM exhausted)
        `;

        const leaseExpiresAt = new Date(now.getTime() + leaseMs);
        const rows = await tx.$queryRaw<ClaimedJobRow[]>`
          WITH candidate AS (
            SELECT "id"
            FROM "sync_jobs"
            WHERE "attempt" < "max_attempts"
              AND (
                (
                  "status" = 'QUEUED'
                  AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= ${now})
                )
                OR (
                  "status" = 'RUNNING'
                  AND "lease_expires_at" <= ${now}
                )
              )
            ORDER BY COALESCE("next_attempt_at", "created_at"), "created_at", "id"
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "sync_jobs" AS job
          SET
            "status" = 'RUNNING',
            "phase" = 'VALIDATING_SOURCE',
            "progress" = 0,
            "attempt" = job."attempt" + 1,
            "lease_owner" = ${workerId},
            "lease_expires_at" = ${leaseExpiresAt},
            "next_attempt_at" = NULL,
            "started_at" = COALESCE(job."started_at", ${now}),
            "finished_at" = NULL,
            "error_code" = NULL,
            "error_message" = NULL
          FROM candidate
          WHERE job."id" = candidate."id"
          RETURNING
            job."id",
            job."source_id",
            job."requested_from",
            job."requested_to",
            job."attempt",
            job."max_attempts"
        `;
        const row = rows[0];
        if (!row) return null;

        const source = await tx.tradingSource.findUnique({
          where: { id: row.source_id },
          select: {
            user_id: true,
            provider: true,
            import_from: true,
            encrypted_credentials: true,
            credentials_iv: true,
            credentials_tag: true,
          },
        });
        if (!source) return null;
        await tx.tradingSource.update({
          where: { id: row.source_id },
          data: {
            status: 'SYNCING',
            last_sync_started_at: now,
            last_error_code: null,
            last_error_message: null,
          },
        });

        return {
          id: row.id,
          sourceId: row.source_id,
          userId: source.user_id,
          provider: source.provider,
          importFrom: source.import_from,
          requestedFrom: row.requested_from,
          requestedTo: row.requested_to,
          attempt: row.attempt,
          maxAttempts: row.max_attempts,
          encryptedCredentials: source.encrypted_credentials,
          credentialsIv: source.credentials_iv,
          credentialsTag: source.credentials_tag,
        };
      });
    },

    updateProgress(jobId, workerId, phase, progress, leaseExpiresAt) {
      return assertLease(jobId, workerId, {
        phase,
        progress: Math.max(0, Math.min(100, Math.round(progress))),
        lease_expires_at: leaseExpiresAt,
      });
    },

    heartbeat(jobId, workerId, leaseExpiresAt, counters) {
      return assertLease(jobId, workerId, {
        lease_expires_at: leaseExpiresAt,
        fetched_count: counters.fetchedCount,
        inserted_count: counters.insertedCount,
        warning_count: counters.warningCount,
      });
    },

    async complete(job, workerId, result, finishedAt) {
      const status = result.warningCount > 0 ? 'PARTIAL' : 'SUCCEEDED';
      await client.$transaction(async (tx) => {
        const updated = await tx.syncJob.updateMany({
          where: { id: job.id, status: 'RUNNING', lease_owner: workerId },
          data: {
            active_key: null,
            status,
            phase: 'COMPLETED',
            progress: 100,
            fetched_count: result.fetchedCount,
            inserted_count: result.insertedCount,
            warning_count: result.warningCount,
            lease_owner: null,
            lease_expires_at: null,
            error_code: result.warningCount ? 'RAW_EVENT_WARNINGS' : null,
            error_message: result.warningCount
              ? `${result.warningCount} raw event warning(s) require review`
              : null,
            finished_at: finishedAt,
          },
        });
        if (updated.count !== 1) throw new Error(`Sync job ${job.id} lease was lost`);

        await tx.tradingSource.update({
          where: { id: job.sourceId },
          data: {
            status: status === 'SUCCEEDED' ? 'READY' : 'DEGRADED',
            is_read_only: result.readOnly,
            is_ip_bound: result.ipBound,
            last_sync_succeeded_at: status === 'SUCCEEDED' ? finishedAt : undefined,
            last_error_code: status === 'PARTIAL' ? 'RAW_EVENT_WARNINGS' : null,
            last_error_message:
              status === 'PARTIAL'
                ? `${result.warningCount} raw event warning(s) require review`
                : null,
          },
        });
      });
      return status;
    },

    fail(job, workerId, failure, failedAt) {
      const retry = failure.retryable && job.attempt < job.maxAttempts;
      const retryDelay = Math.max(1_000, failure.retryAfterMs ?? 2 ** job.attempt * 1_000);
      return client.$transaction(async (tx) => {
        const updated = await tx.syncJob.updateMany({
          where: { id: job.id, status: 'RUNNING', lease_owner: workerId },
          data: {
            active_key: retry ? job.sourceId : null,
            status: retry ? 'QUEUED' : 'FAILED',
            phase: retry ? 'RETRY_WAIT' : 'FAILED',
            lease_owner: null,
            lease_expires_at: null,
            next_attempt_at: retry ? new Date(failedAt.getTime() + retryDelay) : null,
            error_code: cleanErrorText(failure.code, 100),
            error_message: cleanErrorText(failure.message, 1_000),
            finished_at: retry ? null : failedAt,
          },
        });
        if (updated.count !== 1) return 'LEASE_LOST';

        await tx.tradingSource.update({
          where: { id: job.sourceId },
          data: {
            status: 'DEGRADED',
            last_error_code: cleanErrorText(failure.code, 100),
            last_error_message: cleanErrorText(failure.message, 1_000),
          },
        });
        return retry ? 'RETRY_QUEUED' : 'FAILED';
      });
    },
  };
}
