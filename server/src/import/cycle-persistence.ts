import type { Prisma, PrismaClient } from '@prisma/client';
import type { NormalizedPositionCycle } from './domain.js';

type CycleUpsertArgs = {
  where: {
    source_id_cycle_key: {
      source_id: string;
      cycle_key: string;
    };
  };
  create: Prisma.PositionCycleUncheckedCreateInput;
  update: Prisma.PositionCycleUncheckedUpdateInput;
};

export interface PositionCycleStore {
  upsert(args: CycleUpsertArgs): Promise<{ id: string }>;
}

type PrismaPositionCycleClient = Pick<PrismaClient, 'positionCycle'>;

export function buildCycleUpsert(userId: string, cycle: NormalizedPositionCycle): CycleUpsertArgs {
  const derived = {
    symbol: cycle.symbol,
    market_type: 'LINEAR' as const,
    direction: cycle.direction,
    position_index: cycle.positionIndex,
    opened_at: cycle.openedAt,
    closed_at: cycle.closedAt,
    quantity: cycle.quantity,
    average_entry_price: cycle.averageEntryPrice,
    average_exit_price: cycle.averageExitPrice,
    entry_value_usd: cycle.entryValueUsd,
    exit_value_usd: cycle.exitValueUsd,
    gross_pnl_usd: cycle.grossPnlUsd,
    trading_fees_usd: cycle.tradingFeesUsd,
    funding_usd: cycle.fundingUsd,
    adjustments_usd: cycle.adjustmentsUsd,
    net_pnl_usd: cycle.netPnlUsd,
    data_quality: cycle.dataQuality,
    quality_reasons: cycle.qualityReasons,
    algorithm_version: cycle.algorithmVersion,
    source_closed_pnl_usd: cycle.sourceClosedPnlUsd ?? null,
    reconciliation_delta_usd: cycle.reconciliationDeltaUsd ?? null,
  };

  return {
    where: {
      source_id_cycle_key: {
        source_id: cycle.sourceId,
        cycle_key: cycle.cycleKey,
      },
    },
    create: {
      user_id: userId,
      source_id: cycle.sourceId,
      cycle_key: cycle.cycleKey,
      ...derived,
    },
    // Deliberately update derived columns only. Review and tag relations are not
    // nested here, so reprocessing cannot overwrite user-authored context.
    update: derived,
  };
}

export async function persistNormalizedCycles(
  store: PositionCycleStore,
  userId: string,
  cycles: NormalizedPositionCycle[]
) {
  const persisted: Array<{ id: string; cycleKey: string }> = [];
  for (const cycle of cycles) {
    const row = await store.upsert(buildCycleUpsert(userId, cycle));
    persisted.push({ id: row.id, cycleKey: cycle.cycleKey });
  }
  return persisted;
}

export function createPrismaPositionCycleStore(
  client: PrismaPositionCycleClient
): PositionCycleStore {
  return {
    upsert: (args) => client.positionCycle.upsert(args),
  };
}
