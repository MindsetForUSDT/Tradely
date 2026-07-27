import type { Trade } from '@/types';

export interface TradeMeta {
  version?: number;
  finalTrade?: boolean;
  marketType?: 'spot' | 'linear' | 'manual';
  entryPrice?: number;
  exitPrice?: number;
  openedAt?: string;
  closedAt?: string;
  leverage?: number | string;
  grossPnl?: number;
  tradingFees?: number;
  fundingAndAdjustments?: number;
  netPnl?: number;
  mae?: number;
  mfe?: number;
  stopLoss?: number;
  strategy?: string;
  mistake?: string;
  emotion?: string;
  planScore?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface TradeBreakdown {
  meta: TradeMeta;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  amount: number;
  volume: number;
  grossPnl: number;
  fees: number;
  fundingAndAdjustments: number;
  netPnl: number;
  returnPercent: number;
  durationMinutes: number | null;
  rMultiple: number | null;
}

export function numeric(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseTradeMeta(rawData?: string): TradeMeta {
  if (!rawData) return {};
  try {
    const parsed = JSON.parse(rawData) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as TradeMeta) : {};
  } catch {
    return {};
  }
}

export function calculateTradeBreakdown(trade: Trade): TradeBreakdown {
  const meta = parseTradeMeta(trade.raw_data);
  const direction = trade.side === 'sell' ? 'short' : 'long';
  const directionMultiplier = direction === 'long' ? 1 : -1;
  const amount = numeric(trade.amount);
  const entryPrice = numeric(meta.entryPrice, numeric(trade.price_usd, numeric(trade.price)));
  const exitPrice = numeric(meta.exitPrice, numeric(trade.price_usd, numeric(trade.price)));
  const volume = numeric(trade.value_usd, entryPrice * amount) || entryPrice * amount;
  const derivedGrossPnl = (exitPrice - entryPrice) * amount * directionMultiplier;
  const grossPnl = numeric(meta.grossPnl, derivedGrossPnl);
  const fees = Math.abs(numeric(meta.tradingFees, numeric(trade.fee_usd, numeric(trade.fee))));
  const netPnl = numeric(trade.pnl_realized, numeric(meta.netPnl, grossPnl - fees));
  const fundingAndAdjustments = numeric(meta.fundingAndAdjustments, netPnl - (grossPnl - fees));

  const openedAt = meta.openedAt ? new Date(meta.openedAt).getTime() : Number.NaN;
  const closedAt = new Date(meta.closedAt || trade.timestamp).getTime();
  const durationMinutes =
    Number.isFinite(openedAt) && Number.isFinite(closedAt) && closedAt >= openedAt
      ? Math.max(0, Math.round((closedAt - openedAt) / 60_000))
      : null;

  const stopLoss = numeric(meta.stopLoss);
  const initialRisk = stopLoss > 0 ? Math.abs(entryPrice - stopLoss) * amount : 0;

  return {
    meta,
    direction,
    entryPrice,
    exitPrice,
    amount,
    volume,
    grossPnl,
    fees,
    fundingAndAdjustments,
    netPnl,
    returnPercent: volume > 0 ? (netPnl / volume) * 100 : 0,
    durationMinutes,
    rMultiple: initialRisk > 0 ? netPnl / initialRisk : null,
  };
}

export function formatSignedUSD(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Нет данных';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}
