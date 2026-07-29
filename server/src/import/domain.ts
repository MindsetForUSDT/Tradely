import type { Prisma } from '@prisma/client';
import type { DecimalInput } from '../domain/decimal.js';

export type LinearExecutionSide = 'BUY' | 'SELL';
export type PositionDirection = 'LONG' | 'SHORT';
export type CycleDataQuality = 'VERIFIED' | 'ESTIMATED' | 'NEEDS_REVIEW' | 'INCOMPLETE';
export type RawEventKind = 'EXECUTION' | 'CLOSED_PNL' | 'TRANSACTION' | 'BALANCE' | 'CSV_ROW';

export interface LinearExecution {
  sourceId: string;
  externalId: string;
  orderId: string;
  symbol: string;
  positionIndex: number;
  side: LinearExecutionSide;
  quantity: DecimalInput;
  price: DecimalInput;
  feeUsd: DecimalInput;
  occurredAt: Date;
}

export interface LinearCashEvent {
  sourceId: string;
  externalId: string;
  symbol: string;
  positionIndex?: number;
  kind: 'FUNDING' | 'ADJUSTMENT';
  amountUsd: DecimalInput;
  occurredAt: Date;
}

export interface LinearClosedPnl {
  sourceId: string;
  externalId: string;
  symbol: string;
  positionIndex?: number;
  closingOrderId?: string;
  netPnlUsd: DecimalInput;
  occurredAt: Date;
}

export interface NormalizedCycleEvent {
  externalId: string;
  orderId?: string;
  eventKind: Extract<RawEventKind, 'EXECUTION' | 'CLOSED_PNL' | 'TRANSACTION'>;
  role:
    | 'OPEN'
    | 'INCREASE'
    | 'REDUCE'
    | 'CLOSE'
    | 'FLIP_CLOSE'
    | 'FLIP_OPEN'
    | 'FUNDING'
    | 'ADJUSTMENT'
    | 'RECONCILIATION';
  allocatedQuantity?: Prisma.Decimal;
  allocatedAmountUsd?: Prisma.Decimal;
}

export interface NormalizedPositionCycle {
  sourceId: string;
  cycleKey: string;
  symbol: string;
  positionIndex: number;
  direction: PositionDirection;
  openedAt: Date;
  closedAt: Date;
  quantity: Prisma.Decimal;
  averageEntryPrice: Prisma.Decimal;
  averageExitPrice: Prisma.Decimal;
  entryValueUsd: Prisma.Decimal;
  exitValueUsd: Prisma.Decimal;
  grossPnlUsd: Prisma.Decimal;
  tradingFeesUsd: Prisma.Decimal;
  fundingUsd: Prisma.Decimal;
  adjustmentsUsd: Prisma.Decimal;
  netPnlUsd: Prisma.Decimal;
  dataQuality: CycleDataQuality;
  qualityReasons: string[];
  algorithmVersion: number;
  sourceClosedPnlUsd?: Prisma.Decimal;
  reconciliationDeltaUsd?: Prisma.Decimal;
  events: NormalizedCycleEvent[];
}

export interface RawExchangeEventInput {
  sourceId: string;
  jobId?: string;
  provider: 'BYBIT' | 'CSV' | 'MANUAL';
  eventKind: RawEventKind;
  externalId: string;
  symbol?: string;
  marketType?: 'SPOT' | 'LINEAR';
  occurredAt: Date;
  payload: Prisma.InputJsonValue;
  schemaVersion?: number;
}
