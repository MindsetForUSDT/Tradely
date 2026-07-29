-- Add-only MVP data foundation.
-- Legacy wallets, trades, tags and daily_analytics remain unchanged.

CREATE TYPE "SourceProvider" AS ENUM ('BYBIT', 'CSV', 'MANUAL');
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'READY', 'SYNCING', 'DEGRADED', 'REVOKED');
CREATE TYPE "MarketType" AS ENUM ('SPOT', 'LINEAR');
CREATE TYPE "PositionDirection" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "DataQuality" AS ENUM ('VERIFIED', 'ESTIMATED', 'NEEDS_REVIEW', 'INCOMPLETE');
CREATE TYPE "SyncJobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'SUCCEEDED',
    'PARTIAL',
    'FAILED',
    'CANCELED'
);
CREATE TYPE "ReviewStatus" AS ENUM ('UNREVIEWED', 'REVIEWED');

CREATE TABLE "trading_sources" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "SourceProvider" NOT NULL,
    "external_account_hash" TEXT,
    "label" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "encrypted_credentials" TEXT,
    "credentials_iv" TEXT,
    "credentials_tag" TEXT,
    "encryption_version" INTEGER NOT NULL DEFAULT 1,
    "is_read_only" BOOLEAN,
    "is_ip_bound" BOOLEAN,
    "import_from" TIMESTAMPTZ(3),
    "sync_cursor" JSONB,
    "settings" JSONB,
    "last_sync_started_at" TIMESTAMPTZ(3),
    "last_sync_succeeded_at" TIMESTAMPTZ(3),
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "trading_sources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trading_sources_encryption_version_check" CHECK ("encryption_version" > 0)
);

CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "requested_from" TIMESTAMPTZ(3),
    "requested_to" TIMESTAMPTZ(3),
    "phase" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "cycle_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMPTZ(3),
    "next_attempt_at" TIMESTAMPTZ(3),
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sync_jobs_progress_check" CHECK ("progress" BETWEEN 0 AND 100),
    CONSTRAINT "sync_jobs_counts_check" CHECK (
        "fetched_count" >= 0
        AND "inserted_count" >= 0
        AND "cycle_count" >= 0
        AND "warning_count" >= 0
    ),
    CONSTRAINT "sync_jobs_attempts_check" CHECK (
        "attempt" >= 0
        AND "max_attempts" > 0
        AND "attempt" <= "max_attempts"
    ),
    CONSTRAINT "sync_jobs_requested_range_check" CHECK (
        "requested_from" IS NULL
        OR "requested_to" IS NULL
        OR "requested_from" <= "requested_to"
    )
);

CREATE TABLE "raw_exchange_events" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "job_id" TEXT,
    "provider" "SourceProvider" NOT NULL,
    "event_kind" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "symbol" TEXT,
    "market_type" "MarketType",
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "imported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raw_exchange_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "raw_exchange_events_schema_version_check" CHECK ("schema_version" > 0),
    CONSTRAINT "raw_exchange_events_external_id_check" CHECK (length("external_id") > 0),
    CONSTRAINT "raw_exchange_events_payload_hash_check" CHECK (length("payload_hash") = 64)
);

CREATE TABLE "position_cycles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "cycle_key" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market_type" "MarketType" NOT NULL,
    "direction" "PositionDirection" NOT NULL,
    "position_index" INTEGER,
    "opened_at" TIMESTAMPTZ(3) NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL,
    "quantity" DECIMAL(24,10) NOT NULL,
    "average_entry_price" DECIMAL(24,10) NOT NULL,
    "average_exit_price" DECIMAL(24,10) NOT NULL,
    "entry_value_usd" DECIMAL(24,8) NOT NULL,
    "exit_value_usd" DECIMAL(24,8) NOT NULL,
    "gross_pnl_usd" DECIMAL(24,8) NOT NULL,
    "trading_fees_usd" DECIMAL(24,8) NOT NULL,
    "funding_usd" DECIMAL(24,8) NOT NULL,
    "adjustments_usd" DECIMAL(24,8) NOT NULL,
    "net_pnl_usd" DECIMAL(24,8) NOT NULL,
    "data_quality" "DataQuality" NOT NULL,
    "quality_reasons" JSONB,
    "algorithm_version" INTEGER NOT NULL DEFAULT 1,
    "source_closed_pnl_usd" DECIMAL(24,8),
    "reconciliation_delta_usd" DECIMAL(24,8),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "position_cycles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "position_cycles_time_range_check" CHECK ("opened_at" <= "closed_at"),
    CONSTRAINT "position_cycles_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "position_cycles_prices_check" CHECK (
        "average_entry_price" > 0
        AND "average_exit_price" > 0
        AND "entry_value_usd" > 0
        AND "exit_value_usd" > 0
    ),
    CONSTRAINT "position_cycles_fees_check" CHECK ("trading_fees_usd" >= 0),
    CONSTRAINT "position_cycles_algorithm_version_check" CHECK ("algorithm_version" > 0)
);

CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C9BDA8',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "strategies_name_check" CHECK (length(trim("name")) > 0)
);

CREATE TABLE "trade_reviews" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "strategy_id" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "mistake_code" TEXT,
    "emotion_before" TEXT,
    "emotion_after" TEXT,
    "plan_score" INTEGER,
    "planned_stop" DECIMAL(24,10),
    "planned_risk_usd" DECIMAL(24,8),
    "notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "trade_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trade_reviews_plan_score_check" CHECK (
        "plan_score" IS NULL OR "plan_score" BETWEEN 0 AND 10
    ),
    CONSTRAINT "trade_reviews_planned_risk_check" CHECK (
        "planned_risk_usd" IS NULL OR "planned_risk_usd" >= 0
    )
);

CREATE TABLE "cycle_events" (
    "cycle_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "allocated_quantity" DECIMAL(24,10),
    "allocated_amount_usd" DECIMAL(24,8),
    CONSTRAINT "cycle_events_pkey" PRIMARY KEY ("cycle_id", "event_id", "role"),
    CONSTRAINT "cycle_events_quantity_check" CHECK (
        "allocated_quantity" IS NULL OR "allocated_quantity" >= 0
    )
);

CREATE TABLE "legacy_trade_maps" (
    "legacy_trade_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legacy_trade_maps_pkey" PRIMARY KEY ("legacy_trade_id")
);

CREATE UNIQUE INDEX "trading_sources_user_id_provider_external_account_hash_key"
    ON "trading_sources"("user_id", "provider", "external_account_hash");
CREATE INDEX "trading_sources_user_id_status_idx"
    ON "trading_sources"("user_id", "status");

CREATE INDEX "sync_jobs_status_next_attempt_at_idx"
    ON "sync_jobs"("status", "next_attempt_at");
CREATE INDEX "sync_jobs_source_id_created_at_idx"
    ON "sync_jobs"("source_id", "created_at");

CREATE UNIQUE INDEX "raw_exchange_events_source_id_event_kind_external_id_key"
    ON "raw_exchange_events"("source_id", "event_kind", "external_id");
CREATE INDEX "raw_exchange_events_source_id_occurred_at_idx"
    ON "raw_exchange_events"("source_id", "occurred_at");
CREATE INDEX "raw_exchange_events_source_id_symbol_occurred_at_idx"
    ON "raw_exchange_events"("source_id", "symbol", "occurred_at");
CREATE INDEX "raw_exchange_events_job_id_idx"
    ON "raw_exchange_events"("job_id");

CREATE UNIQUE INDEX "position_cycles_source_id_cycle_key_key"
    ON "position_cycles"("source_id", "cycle_key");
CREATE INDEX "position_cycles_user_id_closed_at_idx"
    ON "position_cycles"("user_id", "closed_at");
CREATE INDEX "position_cycles_user_id_symbol_closed_at_idx"
    ON "position_cycles"("user_id", "symbol", "closed_at");
CREATE INDEX "position_cycles_user_id_data_quality_closed_at_idx"
    ON "position_cycles"("user_id", "data_quality", "closed_at");

CREATE UNIQUE INDEX "strategies_user_id_name_key"
    ON "strategies"("user_id", "name");
CREATE UNIQUE INDEX "trade_reviews_cycle_id_key"
    ON "trade_reviews"("cycle_id");
CREATE INDEX "trade_reviews_strategy_id_idx"
    ON "trade_reviews"("strategy_id");
CREATE INDEX "cycle_events_event_id_idx"
    ON "cycle_events"("event_id");
CREATE INDEX "legacy_trade_maps_cycle_id_idx"
    ON "legacy_trade_maps"("cycle_id");

ALTER TABLE "trading_sources"
    ADD CONSTRAINT "trading_sources_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sync_jobs"
    ADD CONSTRAINT "sync_jobs_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "trading_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "raw_exchange_events"
    ADD CONSTRAINT "raw_exchange_events_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "trading_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "raw_exchange_events"
    ADD CONSTRAINT "raw_exchange_events_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "position_cycles"
    ADD CONSTRAINT "position_cycles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "position_cycles"
    ADD CONSTRAINT "position_cycles_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "trading_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategies"
    ADD CONSTRAINT "strategies_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_reviews"
    ADD CONSTRAINT "trade_reviews_cycle_id_fkey"
    FOREIGN KEY ("cycle_id") REFERENCES "position_cycles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_reviews"
    ADD CONSTRAINT "trade_reviews_strategy_id_fkey"
    FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cycle_events"
    ADD CONSTRAINT "cycle_events_cycle_id_fkey"
    FOREIGN KEY ("cycle_id") REFERENCES "position_cycles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_events"
    ADD CONSTRAINT "cycle_events_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "raw_exchange_events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "legacy_trade_maps"
    ADD CONSTRAINT "legacy_trade_maps_legacy_trade_id_fkey"
    FOREIGN KEY ("legacy_trade_id") REFERENCES "trades"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legacy_trade_maps"
    ADD CONSTRAINT "legacy_trade_maps_cycle_id_fkey"
    FOREIGN KEY ("cycle_id") REFERENCES "position_cycles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
