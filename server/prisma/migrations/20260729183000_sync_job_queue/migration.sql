-- Keep at most one queued/running job per source without holding a database
-- transaction open while the worker talks to Bybit. Terminal jobs clear active_key.
ALTER TABLE "sync_jobs"
    ADD COLUMN "active_key" TEXT;

CREATE UNIQUE INDEX "sync_jobs_active_key_key"
    ON "sync_jobs"("active_key");

ALTER TABLE "sync_jobs"
    ADD CONSTRAINT "sync_jobs_active_key_check"
    CHECK ("active_key" IS NULL OR "active_key" = "source_id");
