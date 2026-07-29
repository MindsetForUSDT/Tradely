# MVP data foundation rollback

This migration is intentionally add-only. Roll it back only before any production
reader or writer has switched to the new tables.

1. Stop API and worker processes.
2. Confirm that no data has been backfilled into `trading_sources`,
   `raw_exchange_events`, or `position_cycles`.
3. Restore the database backup taken immediately before the migration (preferred).
4. If a schema-only rollback is required, drop the new objects in this dependency
   order:

```sql
DROP TABLE IF EXISTS "legacy_trade_maps";
DROP TABLE IF EXISTS "cycle_events";
DROP TABLE IF EXISTS "trade_reviews";
DROP TABLE IF EXISTS "strategies";
DROP TABLE IF EXISTS "position_cycles";
DROP TABLE IF EXISTS "raw_exchange_events";
DROP TABLE IF EXISTS "sync_jobs";
DROP TABLE IF EXISTS "trading_sources";

DROP TYPE IF EXISTS "ReviewStatus";
DROP TYPE IF EXISTS "SyncJobStatus";
DROP TYPE IF EXISTS "DataQuality";
DROP TYPE IF EXISTS "PositionDirection";
DROP TYPE IF EXISTS "MarketType";
DROP TYPE IF EXISTS "SourceStatus";
DROP TYPE IF EXISTS "SourceProvider";
```

Do not run the schema-only rollback after backfill. Once real events or reviews exist,
restore from backup or migrate data forward instead.
