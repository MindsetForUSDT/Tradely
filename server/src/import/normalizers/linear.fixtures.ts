import type { LinearCashEvent, LinearClosedPnl, LinearExecution } from '../domain.js';

interface ExpectedCycle {
  direction: 'LONG' | 'SHORT';
  positionIndex: number;
  quantity: string;
  averageEntryPrice: string;
  averageExitPrice: string;
  grossPnlUsd: string;
  tradingFeesUsd: string;
  fundingUsd: string;
  adjustmentsUsd: string;
  netPnlUsd: string;
  dataQuality: 'VERIFIED' | 'ESTIMATED' | 'NEEDS_REVIEW' | 'INCOMPLETE';
  qualityReasons?: string[];
  eventRoles?: string[];
}

export interface LinearFixture {
  name: string;
  executions: LinearExecution[];
  cashEvents?: LinearCashEvent[];
  closedPnl?: LinearClosedPnl[];
  expected: ExpectedCycle[];
}

const at = (iso: string) => new Date(iso);

const execution = (
  partial: Omit<LinearExecution, 'sourceId' | 'symbol' | 'positionIndex' | 'feeUsd'> &
    Partial<Pick<LinearExecution, 'sourceId' | 'symbol' | 'positionIndex' | 'feeUsd'>>
): LinearExecution => ({
  sourceId: 'source-1',
  symbol: 'BTCUSDT',
  positionIndex: 0,
  feeUsd: '0',
  ...partial,
});

const reconciliation = (
  partial: Omit<LinearClosedPnl, 'sourceId' | 'symbol' | 'positionIndex'> &
    Partial<Pick<LinearClosedPnl, 'sourceId' | 'symbol' | 'positionIndex'>>
): LinearClosedPnl => ({
  sourceId: 'source-1',
  symbol: 'BTCUSDT',
  positionIndex: 0,
  ...partial,
});

export const linearFixtures: LinearFixture[] = [
  {
    name: 'one long fill closes flat',
    executions: [
      execution({
        externalId: 'exec-open',
        orderId: 'order-open',
        side: 'BUY',
        quantity: '2',
        price: '100',
        feeUsd: '1',
        occurredAt: at('2026-01-01T10:00:00.000Z'),
      }),
      execution({
        externalId: 'exec-close',
        orderId: 'order-close',
        side: 'SELL',
        quantity: '2',
        price: '110',
        feeUsd: '1',
        occurredAt: at('2026-01-01T11:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'pnl-close',
        closingOrderId: 'order-close',
        netPnlUsd: '18',
        occurredAt: at('2026-01-01T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '2',
        averageEntryPrice: '100',
        averageExitPrice: '110',
        grossPnlUsd: '20',
        tradingFeesUsd: '2',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '18',
        dataQuality: 'VERIFIED',
        eventRoles: ['OPEN', 'CLOSE', 'RECONCILIATION'],
      },
    ],
  },
  {
    name: 'scale in and partial closes remain one flat-to-flat cycle',
    executions: [
      execution({
        externalId: 'scale-open-1',
        orderId: 'scale-open-1',
        side: 'BUY',
        quantity: '1',
        price: '100',
        feeUsd: '0.1',
        occurredAt: at('2026-01-02T10:00:00.000Z'),
      }),
      execution({
        externalId: 'scale-open-2',
        orderId: 'scale-open-2',
        side: 'BUY',
        quantity: '1',
        price: '120',
        feeUsd: '0.1',
        occurredAt: at('2026-01-02T10:05:00.000Z'),
      }),
      execution({
        externalId: 'scale-close-1',
        orderId: 'scale-close-1',
        side: 'SELL',
        quantity: '0.5',
        price: '130',
        feeUsd: '0.05',
        occurredAt: at('2026-01-02T10:30:00.000Z'),
      }),
      execution({
        externalId: 'scale-close-2',
        orderId: 'scale-close-2',
        side: 'SELL',
        quantity: '1.5',
        price: '90',
        feeUsd: '0.15',
        occurredAt: at('2026-01-02T11:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'scale-pnl',
        closingOrderId: 'scale-close-2',
        netPnlUsd: '-20.4',
        occurredAt: at('2026-01-02T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '2',
        averageEntryPrice: '110',
        averageExitPrice: '100',
        grossPnlUsd: '-20',
        tradingFeesUsd: '0.4',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '-20.4',
        dataQuality: 'VERIFIED',
        eventRoles: ['OPEN', 'INCREASE', 'REDUCE', 'CLOSE', 'RECONCILIATION'],
      },
    ],
  },
  {
    name: 'long to short flip closes one cycle and opens the next',
    executions: [
      execution({
        externalId: 'flip-open-long',
        orderId: 'flip-open-long',
        side: 'BUY',
        quantity: '1',
        price: '100',
        feeUsd: '0.1',
        occurredAt: at('2026-01-03T10:00:00.000Z'),
      }),
      execution({
        externalId: 'flip-execution',
        orderId: 'flip-order',
        side: 'SELL',
        quantity: '2',
        price: '90',
        feeUsd: '0.2',
        occurredAt: at('2026-01-03T10:30:00.000Z'),
      }),
      execution({
        externalId: 'flip-close-short',
        orderId: 'flip-close-short',
        side: 'BUY',
        quantity: '1',
        price: '80',
        feeUsd: '0.1',
        occurredAt: at('2026-01-03T11:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'flip-pnl-long',
        closingOrderId: 'flip-order',
        netPnlUsd: '-10.2',
        occurredAt: at('2026-01-03T10:30:00.000Z'),
      }),
      reconciliation({
        externalId: 'flip-pnl-short',
        closingOrderId: 'flip-close-short',
        netPnlUsd: '9.8',
        occurredAt: at('2026-01-03T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '90',
        grossPnlUsd: '-10',
        tradingFeesUsd: '0.2',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '-10.2',
        dataQuality: 'VERIFIED',
        eventRoles: ['OPEN', 'FLIP_CLOSE', 'RECONCILIATION'],
      },
      {
        direction: 'SHORT',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '90',
        averageExitPrice: '80',
        grossPnlUsd: '10',
        tradingFeesUsd: '0.2',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '9.8',
        dataQuality: 'VERIFIED',
        eventRoles: ['FLIP_OPEN', 'CLOSE', 'RECONCILIATION'],
      },
    ],
  },
  {
    name: 'same timestamp is ordered by stable external id',
    executions: [
      execution({
        externalId: 'exec-b-close',
        orderId: 'same-time-close',
        side: 'SELL',
        quantity: '1',
        price: '101',
        occurredAt: at('2026-01-04T10:00:00.000Z'),
      }),
      execution({
        externalId: 'exec-a-open',
        orderId: 'same-time-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-04T10:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'same-time-pnl',
        closingOrderId: 'same-time-close',
        netPnlUsd: '1',
        occurredAt: at('2026-01-04T10:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '101',
        grossPnlUsd: '1',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '1',
        dataQuality: 'VERIFIED',
      },
    ],
  },
  {
    name: 'hedge mode separates long and short position indexes',
    executions: [
      execution({
        externalId: 'hedge-long-open',
        orderId: 'hedge-long-open',
        positionIndex: 1,
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-05T10:00:00.000Z'),
      }),
      execution({
        externalId: 'hedge-short-open',
        orderId: 'hedge-short-open',
        positionIndex: 2,
        side: 'SELL',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-05T10:01:00.000Z'),
      }),
      execution({
        externalId: 'hedge-long-close',
        orderId: 'hedge-long-close',
        positionIndex: 1,
        side: 'SELL',
        quantity: '1',
        price: '110',
        occurredAt: at('2026-01-05T11:00:00.000Z'),
      }),
      execution({
        externalId: 'hedge-short-close',
        orderId: 'hedge-short-close',
        positionIndex: 2,
        side: 'BUY',
        quantity: '1',
        price: '90',
        occurredAt: at('2026-01-05T11:01:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'hedge-long-pnl',
        closingOrderId: 'hedge-long-close',
        positionIndex: 1,
        netPnlUsd: '10',
        occurredAt: at('2026-01-05T11:00:00.000Z'),
      }),
      reconciliation({
        externalId: 'hedge-short-pnl',
        closingOrderId: 'hedge-short-close',
        positionIndex: 2,
        netPnlUsd: '10',
        occurredAt: at('2026-01-05T11:01:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 1,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '110',
        grossPnlUsd: '10',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '10',
        dataQuality: 'VERIFIED',
      },
      {
        direction: 'SHORT',
        positionIndex: 2,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '90',
        grossPnlUsd: '10',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '10',
        dataQuality: 'VERIFIED',
      },
    ],
  },
  {
    name: 'funding uses signed internal convention',
    executions: [
      execution({
        externalId: 'funding-open',
        orderId: 'funding-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-06T10:00:00.000Z'),
      }),
      execution({
        externalId: 'funding-close',
        orderId: 'funding-close',
        side: 'SELL',
        quantity: '1',
        price: '110',
        occurredAt: at('2026-01-06T11:00:00.000Z'),
      }),
    ],
    cashEvents: [
      {
        sourceId: 'source-1',
        externalId: 'funding-paid',
        symbol: 'BTCUSDT',
        positionIndex: 0,
        kind: 'FUNDING',
        amountUsd: '-1',
        occurredAt: at('2026-01-06T10:30:00.000Z'),
      },
    ],
    closedPnl: [
      reconciliation({
        externalId: 'funding-pnl',
        closingOrderId: 'funding-close',
        netPnlUsd: '9',
        occurredAt: at('2026-01-06T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '110',
        grossPnlUsd: '10',
        tradingFeesUsd: '0',
        fundingUsd: '-1',
        adjustmentsUsd: '0',
        netPnlUsd: '9',
        dataQuality: 'VERIFIED',
      },
    ],
  },
  {
    name: 'reconciliation mismatch is never hidden as zero',
    executions: [
      execution({
        externalId: 'mismatch-open',
        orderId: 'mismatch-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-07T10:00:00.000Z'),
      }),
      execution({
        externalId: 'mismatch-close',
        orderId: 'mismatch-close',
        side: 'SELL',
        quantity: '1',
        price: '110',
        occurredAt: at('2026-01-07T11:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'mismatch-pnl',
        closingOrderId: 'mismatch-close',
        netPnlUsd: '8',
        occurredAt: at('2026-01-07T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '110',
        grossPnlUsd: '10',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '10',
        dataQuality: 'NEEDS_REVIEW',
        qualityReasons: ['RECONCILIATION_MISMATCH'],
      },
    ],
  },
  {
    name: 'cursor retry duplicate executions stay idempotent',
    executions: [
      execution({
        externalId: 'retry-open',
        orderId: 'retry-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-08T10:00:00.000Z'),
      }),
      execution({
        externalId: 'retry-open',
        orderId: 'retry-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-08T10:00:00.000Z'),
      }),
      execution({
        externalId: 'retry-close',
        orderId: 'retry-close',
        side: 'SELL',
        quantity: '1',
        price: '105',
        occurredAt: at('2026-01-08T11:00:00.000Z'),
      }),
      execution({
        externalId: 'retry-close',
        orderId: 'retry-close',
        side: 'SELL',
        quantity: '1',
        price: '105',
        occurredAt: at('2026-01-08T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '105',
        grossPnlUsd: '5',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '5',
        dataQuality: 'ESTIMATED',
        qualityReasons: ['MISSING_RECONCILIATION'],
      },
    ],
  },
  {
    name: 'fees are normalized to positive costs regardless of upstream sign',
    executions: [
      execution({
        externalId: 'signed-fee-open',
        orderId: 'signed-fee-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        feeUsd: '-0.2',
        occurredAt: at('2026-01-09T10:00:00.000Z'),
      }),
      execution({
        externalId: 'signed-fee-close',
        orderId: 'signed-fee-close',
        side: 'SELL',
        quantity: '1',
        price: '101',
        feeUsd: '-0.2',
        occurredAt: at('2026-01-09T11:00:00.000Z'),
      }),
    ],
    closedPnl: [
      reconciliation({
        externalId: 'signed-fee-pnl',
        closingOrderId: 'signed-fee-close',
        netPnlUsd: '0.6',
        occurredAt: at('2026-01-09T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '101',
        grossPnlUsd: '1',
        tradingFeesUsd: '0.4',
        fundingUsd: '0',
        adjustmentsUsd: '0',
        netPnlUsd: '0.6',
        dataQuality: 'VERIFIED',
      },
    ],
  },
  {
    name: 'rebate is a signed positive adjustment',
    executions: [
      execution({
        externalId: 'rebate-open',
        orderId: 'rebate-open',
        side: 'BUY',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-10T10:00:00.000Z'),
      }),
      execution({
        externalId: 'rebate-close',
        orderId: 'rebate-close',
        side: 'SELL',
        quantity: '1',
        price: '100',
        occurredAt: at('2026-01-10T11:00:00.000Z'),
      }),
    ],
    cashEvents: [
      {
        sourceId: 'source-1',
        externalId: 'rebate-transaction',
        symbol: 'BTCUSDT',
        positionIndex: 0,
        kind: 'ADJUSTMENT',
        amountUsd: '0.25',
        occurredAt: at('2026-01-10T10:30:00.000Z'),
      },
    ],
    closedPnl: [
      reconciliation({
        externalId: 'rebate-pnl',
        closingOrderId: 'rebate-close',
        netPnlUsd: '0.25',
        occurredAt: at('2026-01-10T11:00:00.000Z'),
      }),
    ],
    expected: [
      {
        direction: 'LONG',
        positionIndex: 0,
        quantity: '1',
        averageEntryPrice: '100',
        averageExitPrice: '100',
        grossPnlUsd: '0',
        tradingFeesUsd: '0',
        fundingUsd: '0',
        adjustmentsUsd: '0.25',
        netPnlUsd: '0.25',
        dataQuality: 'VERIFIED',
      },
    ],
  },
];
