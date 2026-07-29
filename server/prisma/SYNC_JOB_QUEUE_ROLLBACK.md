# Sync job queue rollback

Apply only if the `20260729183000_sync_job_queue` migration must be reverted
before any later migration depends on `active_key`.

```sql
ALTER TABLE "sync_jobs"
    DROP CONSTRAINT IF EXISTS "sync_jobs_active_key_check";

DROP INDEX IF EXISTS "sync_jobs_active_key_key";

ALTER TABLE "sync_jobs"
    DROP COLUMN IF EXISTS "active_key";
```

This rollback removes queue-level duplicate protection. Stop every sync worker
before applying it.
