import { hostname } from 'node:os';
import { prisma } from '../db.js';
import { createPrismaRawEventStore } from '../import/raw-ingestion.js';
import { createPrismaSyncJobStore } from './sync-job-store.js';
import { processNextSyncJob, type SyncWorkerRun } from './sync-worker.js';

const PROCESS_WORKER_ID = `${hostname()}:${process.pid}`;

export async function runSyncWorkerBatch(limit = 3): Promise<SyncWorkerRun[]> {
  const workerCount = Math.max(1, Math.min(10, Math.floor(limit)));
  const jobStore = createPrismaSyncJobStore(prisma);
  const rawEventStore = createPrismaRawEventStore(prisma);
  const runs = await Promise.all(
    Array.from({ length: workerCount }, (_, index) =>
      processNextSyncJob(`${PROCESS_WORKER_ID}:${index}`, {
        jobStore,
        rawEventStore,
      })
    )
  );
  return runs.filter((run): run is SyncWorkerRun => run !== null);
}
