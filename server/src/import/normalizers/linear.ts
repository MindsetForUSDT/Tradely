import { Prisma } from '@prisma/client';
import {
  DECIMAL_ZERO,
  decimal,
  decimalMax,
  decimalMin,
  decimalSign,
} from '../../domain/decimal.js';
import type {
  CycleDataQuality,
  LinearCashEvent,
  LinearClosedPnl,
  LinearExecution,
  NormalizedCycleEvent,
  NormalizedPositionCycle,
  PositionDirection,
} from '../domain.js';

export const LINEAR_ALGORITHM_VERSION = 1;

const ABSOLUTE_RECONCILIATION_TOLERANCE = new Prisma.Decimal('0.01');
const RELATIVE_RECONCILIATION_TOLERANCE = new Prisma.Decimal('0.001');

interface OpenCycleState {
  sourceId: string;
  symbol: string;
  positionIndex: number;
  directionSign: -1 | 1;
  openedAt: Date;
  openingExternalId: string;
  signedQuantity: Prisma.Decimal;
  openCostValue: Prisma.Decimal;
  closedQuantity: Prisma.Decimal;
  realizedEntryValue: Prisma.Decimal;
  exitValue: Prisma.Decimal;
  grossPnl: Prisma.Decimal;
  tradingFees: Prisma.Decimal;
  events: NormalizedCycleEvent[];
}

interface MutableCycle extends NormalizedPositionCycle {
  qualityReasonSet: Set<string>;
  reconciliationCount: number;
}

export interface NormalizeLinearInput {
  executions: LinearExecution[];
  cashEvents?: LinearCashEvent[];
  closedPnl?: LinearClosedPnl[];
}

function streamKey(event: Pick<LinearExecution, 'sourceId' | 'symbol' | 'positionIndex'>) {
  return `${event.sourceId}\u0000${event.symbol}\u0000${event.positionIndex}`;
}

function cycleKey(state: OpenCycleState) {
  return [
    'linear',
    encodeURIComponent(state.symbol),
    state.positionIndex,
    encodeURIComponent(state.openingExternalId),
  ].join(':');
}

function compareEvents(
  left: Pick<LinearExecution, 'occurredAt' | 'externalId'>,
  right: Pick<LinearExecution, 'occurredAt' | 'externalId'>
) {
  return (
    left.occurredAt.getTime() - right.occurredAt.getTime() ||
    left.externalId.localeCompare(right.externalId)
  );
}

function executionFingerprint(execution: LinearExecution) {
  return [
    execution.sourceId,
    execution.externalId,
    execution.orderId,
    execution.symbol,
    execution.positionIndex,
    execution.side,
    decimal(execution.quantity).toString(),
    decimal(execution.price).toString(),
    decimal(execution.feeUsd).abs().toString(),
    execution.occurredAt.toISOString(),
  ].join('\u0000');
}

function deduplicateExecutions(executions: LinearExecution[]) {
  const unique = new Map<string, { execution: LinearExecution; fingerprint: string }>();
  for (const execution of executions) {
    const key = `${execution.sourceId}\u0000${execution.externalId}`;
    const fingerprint = executionFingerprint(execution);
    const current = unique.get(key);
    if (current && current.fingerprint !== fingerprint) {
      throw new Error(`Conflicting execution payload for ${execution.externalId}`);
    }
    if (!current) unique.set(key, { execution, fingerprint });
  }
  return [...unique.values()].map(({ execution }) => execution).sort(compareEvents);
}

function openCycle(
  execution: LinearExecution,
  signedQuantity: Prisma.Decimal,
  allocatedFee: Prisma.Decimal,
  role: 'OPEN' | 'FLIP_OPEN'
): OpenCycleState {
  const quantity = signedQuantity.abs();
  const price = decimal(execution.price);
  return {
    sourceId: execution.sourceId,
    symbol: execution.symbol,
    positionIndex: execution.positionIndex,
    directionSign: decimalSign(signedQuantity) as -1 | 1,
    openedAt: execution.occurredAt,
    openingExternalId: execution.externalId,
    signedQuantity,
    openCostValue: quantity.mul(price),
    closedQuantity: DECIMAL_ZERO,
    realizedEntryValue: DECIMAL_ZERO,
    exitValue: DECIMAL_ZERO,
    grossPnl: DECIMAL_ZERO,
    tradingFees: allocatedFee,
    events: [
      {
        externalId: execution.externalId,
        orderId: execution.orderId,
        eventKind: 'EXECUTION',
        role,
        allocatedQuantity: quantity,
        allocatedAmountUsd: allocatedFee,
      },
    ],
  };
}

function finalizeCycle(state: OpenCycleState, closedAt: Date): MutableCycle {
  if (state.closedQuantity.lte(0)) {
    throw new Error(`Cannot close empty cycle ${state.openingExternalId}`);
  }
  const averageEntryPrice = state.realizedEntryValue.div(state.closedQuantity);
  const averageExitPrice = state.exitValue.div(state.closedQuantity);
  const netPnl = state.grossPnl.minus(state.tradingFees);
  return {
    sourceId: state.sourceId,
    cycleKey: cycleKey(state),
    symbol: state.symbol,
    positionIndex: state.positionIndex,
    direction: (state.directionSign > 0 ? 'LONG' : 'SHORT') satisfies PositionDirection,
    openedAt: state.openedAt,
    closedAt,
    quantity: state.closedQuantity,
    averageEntryPrice,
    averageExitPrice,
    entryValueUsd: state.realizedEntryValue,
    exitValueUsd: state.exitValue,
    grossPnlUsd: state.grossPnl,
    tradingFeesUsd: state.tradingFees,
    fundingUsd: DECIMAL_ZERO,
    adjustmentsUsd: DECIMAL_ZERO,
    netPnlUsd: netPnl,
    dataQuality: 'ESTIMATED',
    qualityReasons: [],
    qualityReasonSet: new Set<string>(),
    algorithmVersion: LINEAR_ALGORITHM_VERSION,
    events: state.events,
    reconciliationCount: 0,
  };
}

function matchesCycle(
  cycle: NormalizedPositionCycle,
  event: {
    sourceId: string;
    symbol: string;
    positionIndex?: number;
    occurredAt: Date;
  }
) {
  return (
    cycle.sourceId === event.sourceId &&
    cycle.symbol === event.symbol &&
    (event.positionIndex === undefined || cycle.positionIndex === event.positionIndex) &&
    event.occurredAt >= cycle.openedAt &&
    event.occurredAt <= cycle.closedAt
  );
}

function applyCashEvents(cycles: MutableCycle[], cashEvents: LinearCashEvent[]) {
  for (const cashEvent of [...cashEvents].sort(compareEvents)) {
    const candidates = cycles.filter((cycle) => matchesCycle(cycle, cashEvent));
    if (!candidates.length) continue;
    const amount = decimal(cashEvent.amountUsd);
    const allocatedAmount = amount.div(candidates.length);
    for (const cycle of candidates) {
      if (cashEvent.kind === 'FUNDING') {
        cycle.fundingUsd = cycle.fundingUsd.plus(allocatedAmount);
      } else {
        cycle.adjustmentsUsd = cycle.adjustmentsUsd.plus(allocatedAmount);
      }
      cycle.events.push({
        externalId: cashEvent.externalId,
        eventKind: 'TRANSACTION',
        role: cashEvent.kind,
        allocatedAmountUsd: allocatedAmount,
      });
      if (candidates.length > 1) cycle.qualityReasonSet.add('AMBIGUOUS_CASH_ALLOCATION');
    }
  }
}

function applyClosedPnl(cycles: MutableCycle[], records: LinearClosedPnl[]) {
  for (const record of [...records].sort(compareEvents)) {
    let candidates = cycles.filter((cycle) => matchesCycle(cycle, record));
    if (record.closingOrderId) {
      candidates = candidates.filter((cycle) =>
        cycle.events.some(
          (event) =>
            event.orderId === record.closingOrderId &&
            (event.role === 'REDUCE' || event.role === 'CLOSE' || event.role === 'FLIP_CLOSE')
        )
      );
    }
    if (candidates.length !== 1) {
      for (const cycle of candidates) cycle.qualityReasonSet.add('AMBIGUOUS_CLOSED_PNL');
      continue;
    }
    const cycle = candidates[0];
    const amount = decimal(record.netPnlUsd);
    cycle.sourceClosedPnlUsd = (cycle.sourceClosedPnlUsd || DECIMAL_ZERO).plus(amount);
    cycle.reconciliationCount += 1;
    cycle.events.push({
      externalId: record.externalId,
      eventKind: 'CLOSED_PNL',
      role: 'RECONCILIATION',
      allocatedAmountUsd: amount,
    });
  }
}

function reconcileCycle(cycle: MutableCycle) {
  cycle.netPnlUsd = cycle.grossPnlUsd
    .minus(cycle.tradingFeesUsd)
    .plus(cycle.fundingUsd)
    .plus(cycle.adjustmentsUsd);

  let dataQuality: CycleDataQuality = 'VERIFIED';
  if (!cycle.reconciliationCount || cycle.sourceClosedPnlUsd === undefined) {
    cycle.qualityReasonSet.add('MISSING_RECONCILIATION');
    dataQuality = 'ESTIMATED';
  } else {
    const delta = cycle.netPnlUsd.minus(cycle.sourceClosedPnlUsd);
    const relativeBase = decimalMax(1, cycle.sourceClosedPnlUsd.abs());
    const tolerance = decimalMax(
      ABSOLUTE_RECONCILIATION_TOLERANCE,
      relativeBase.mul(RELATIVE_RECONCILIATION_TOLERANCE)
    );
    cycle.reconciliationDeltaUsd = delta;
    if (delta.abs().gt(tolerance)) {
      cycle.qualityReasonSet.add('RECONCILIATION_MISMATCH');
      dataQuality = 'NEEDS_REVIEW';
    }
  }

  if (cycle.qualityReasonSet.has('AMBIGUOUS_CLOSED_PNL')) dataQuality = 'NEEDS_REVIEW';
  if (cycle.qualityReasonSet.has('AMBIGUOUS_CASH_ALLOCATION') && dataQuality === 'VERIFIED') {
    dataQuality = 'ESTIMATED';
  }
  cycle.dataQuality = dataQuality;
  cycle.qualityReasons = [...cycle.qualityReasonSet].sort();
}

export function normalizeLinearPositionCycles({
  executions,
  cashEvents = [],
  closedPnl = [],
}: NormalizeLinearInput): NormalizedPositionCycle[] {
  const openCycles = new Map<string, OpenCycleState>();
  const completedCycles: MutableCycle[] = [];

  for (const execution of deduplicateExecutions(executions)) {
    const quantity = decimal(execution.quantity);
    const price = decimal(execution.price);
    const fee = decimal(execution.feeUsd).abs();
    if (quantity.lte(0)) throw new Error(`Execution ${execution.externalId} has invalid quantity`);
    if (price.lte(0)) throw new Error(`Execution ${execution.externalId} has invalid price`);

    const signedDelta = execution.side === 'BUY' ? quantity : quantity.negated();
    const key = streamKey(execution);
    const current = openCycles.get(key);
    if (!current) {
      openCycles.set(key, openCycle(execution, signedDelta, fee, 'OPEN'));
      continue;
    }

    const currentSign = decimalSign(current.signedQuantity);
    const deltaSign = decimalSign(signedDelta);
    if (currentSign === deltaSign) {
      current.signedQuantity = current.signedQuantity.plus(signedDelta);
      current.openCostValue = current.openCostValue.plus(quantity.mul(price));
      current.tradingFees = current.tradingFees.plus(fee);
      current.events.push({
        externalId: execution.externalId,
        orderId: execution.orderId,
        eventKind: 'EXECUTION',
        role: 'INCREASE',
        allocatedQuantity: quantity,
        allocatedAmountUsd: fee,
      });
      continue;
    }

    const previousQuantity = current.signedQuantity.abs();
    const closingQuantity = decimalMin(previousQuantity, quantity);
    const averageEntryPrice = current.openCostValue.div(previousQuantity);
    const closingFee = fee.mul(closingQuantity.div(quantity));
    const remainingSignedQuantity = current.signedQuantity.plus(signedDelta);
    const isFlip =
      decimalSign(remainingSignedQuantity) === deltaSign && !remainingSignedQuantity.isZero();
    const isClosed = remainingSignedQuantity.isZero() || isFlip;

    current.closedQuantity = current.closedQuantity.plus(closingQuantity);
    current.realizedEntryValue = current.realizedEntryValue.plus(
      averageEntryPrice.mul(closingQuantity)
    );
    current.exitValue = current.exitValue.plus(price.mul(closingQuantity));
    current.grossPnl = current.grossPnl.plus(
      price.minus(averageEntryPrice).mul(closingQuantity).mul(current.directionSign)
    );
    current.tradingFees = current.tradingFees.plus(closingFee);
    current.openCostValue = current.openCostValue.minus(averageEntryPrice.mul(closingQuantity));
    current.signedQuantity = isFlip ? DECIMAL_ZERO : remainingSignedQuantity;
    current.events.push({
      externalId: execution.externalId,
      orderId: execution.orderId,
      eventKind: 'EXECUTION',
      role: isFlip ? 'FLIP_CLOSE' : isClosed ? 'CLOSE' : 'REDUCE',
      allocatedQuantity: closingQuantity,
      allocatedAmountUsd: closingFee,
    });

    if (!isClosed) continue;
    completedCycles.push(finalizeCycle(current, execution.occurredAt));
    openCycles.delete(key);

    if (isFlip) {
      const openingQuantity = remainingSignedQuantity.abs();
      const openingFee = fee.minus(closingFee);
      openCycles.set(
        key,
        openCycle(
          execution,
          new Prisma.Decimal(deltaSign).mul(openingQuantity),
          openingFee,
          'FLIP_OPEN'
        )
      );
    }
  }

  completedCycles.sort(
    (left, right) =>
      left.closedAt.getTime() - right.closedAt.getTime() ||
      left.cycleKey.localeCompare(right.cycleKey)
  );
  applyCashEvents(completedCycles, cashEvents);
  applyClosedPnl(completedCycles, closedPnl);
  for (const cycle of completedCycles) reconcileCycle(cycle);

  return completedCycles.map(
    ({ qualityReasonSet: _qualityReasons, reconciliationCount: _count, ...cycle }) => cycle
  );
}
