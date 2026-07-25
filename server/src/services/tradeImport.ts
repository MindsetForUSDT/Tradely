import { prisma } from '../db.js';

const BYBIT_API = 'https://api.bybit.com';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_IMPORT_DAYS = 30;
// Bybit keeps execution and closed-PnL history for two years. A request made at the
// exact boundary can become invalid between building the window and reaching Bybit,
// so keep a small margin inside the supported period.
const BYBIT_HISTORY_SAFETY_MS = 60 * 1000;

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export interface FinalTradeData {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  exitPrice: number;
  value_usd: number;
  fee_usd: number;
  pnl_realized: number;
  openedAt: Date;
  closedAt: Date;
  tx_hash: string;
  exchange: string;
  marketType: 'spot' | 'linear';
  raw: Record<string, unknown>;
}

export interface SpotExecution {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  feeUsd: number;
  timestamp: Date;
  executionId: string;
  orderId: string;
}

interface SpotOrder {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  feeUsd: number;
  timestamp: Date;
  orderId: string;
  executionIds: string[];
}

interface InventoryLot {
  amount: number;
  price: number;
  feePerUnit: number;
  openedAt: Date;
  orderId: string;
}

async function signedBybitGet(
  path: string,
  params: URLSearchParams,
  apiKey: string,
  apiSecret: string
) {
  const timestamp = Date.now();
  const query = params.toString();
  const signature = await signHmac(`${timestamp}${apiKey}5000${query}`, apiSecret);
  const response = await fetch(`${BYBIT_API}${path}?${query}`, {
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': String(timestamp),
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': '5000',
    },
  });

  if (!response.ok) throw new Error(`Bybit HTTP ${response.status}`);
  const data = await response.json();
  if (data.retCode !== 0) throw new Error(data.retMsg || `Bybit error ${data.retCode}`);
  return data.result as { list?: any[]; nextPageCursor?: string };
}

function earliestBybitHistoryTime(now: number) {
  const earliest = new Date(now);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 2);
  return earliest.getTime() + BYBIT_HISTORY_SAFETY_MS;
}

export function importWindows(startTime?: Date, end = Date.now()) {
  const requestedStart = startTime?.getTime();
  const start = Math.max(
    requestedStart !== undefined && Number.isFinite(requestedStart)
      ? requestedStart
      : end - DEFAULT_IMPORT_DAYS * 24 * 60 * 60 * 1000,
    earliestBybitHistoryTime(end)
  );
  const windows: Array<{ start: number; end: number }> = [];
  for (let cursor = start; cursor < end; cursor += SEVEN_DAYS_MS) {
    windows.push({ start: cursor, end: Math.min(cursor + SEVEN_DAYS_MS - 1, end) });
  }
  return windows;
}

async function fetchAllPages(
  path: string,
  baseParams: Record<string, string>,
  apiKey: string,
  apiSecret: string
) {
  const records: any[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ ...baseParams, limit: '100', ...(cursor && { cursor }) });
    const result = await signedBybitGet(path, params, apiKey, apiSecret);
    records.push(...(result.list || []));
    cursor = result.nextPageCursor || undefined;
  } while (cursor);
  return records;
}

function normalizeSpotFee(execution: any) {
  const fee = Math.abs(Number(execution.execFee || 0));
  const currency = String(execution.feeCurrency || '').toUpperCase();
  if (!fee) return 0;
  if (currency === 'USDT' || currency === 'USDC' || currency === 'USD') return fee;
  const symbol = String(execution.symbol || '').toUpperCase();
  if (currency && symbol.startsWith(currency)) return fee * Number(execution.execPrice || 0);
  return 0;
}

function aggregateSpotOrders(executions: SpotExecution[]): SpotOrder[] {
  const orders = new Map<string, SpotOrder>();
  for (const execution of [...executions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )) {
    const key = `${execution.symbol}:${execution.side}:${execution.orderId}`;
    const current = orders.get(key);
    if (!current) {
      orders.set(key, {
        symbol: execution.symbol,
        side: execution.side,
        amount: execution.amount,
        price: execution.price,
        feeUsd: execution.feeUsd,
        timestamp: execution.timestamp,
        orderId: execution.orderId,
        executionIds: [execution.executionId],
      });
      continue;
    }
    const totalAmount = current.amount + execution.amount;
    current.price =
      totalAmount > 0
        ? (current.price * current.amount + execution.price * execution.amount) / totalAmount
        : 0;
    current.amount = totalAmount;
    current.feeUsd += execution.feeUsd;
    current.timestamp = execution.timestamp;
    current.executionIds.push(execution.executionId);
  }
  return [...orders.values()].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/** Converts spot executions into completed buy→sell round trips using FIFO inventory matching. */
export function buildClosedSpotTrades(executions: SpotExecution[]): FinalTradeData[] {
  const inventory = new Map<string, InventoryLot[]>();
  const closed: FinalTradeData[] = [];

  for (const order of aggregateSpotOrders(executions)) {
    const lots = inventory.get(order.symbol) || [];
    if (order.side === 'buy') {
      lots.push({
        amount: order.amount,
        price: order.price,
        feePerUnit: order.amount ? order.feeUsd / order.amount : 0,
        openedAt: order.timestamp,
        orderId: order.orderId,
      });
      inventory.set(order.symbol, lots);
      continue;
    }

    let remaining = order.amount;
    let matched = 0;
    let entryValue = 0;
    let buyFees = 0;
    let openedAt = order.timestamp;
    const entryOrderIds: string[] = [];

    while (remaining > 1e-12 && lots.length) {
      const lot = lots[0];
      const quantity = Math.min(remaining, lot.amount);
      if (!matched) openedAt = lot.openedAt;
      matched += quantity;
      entryValue += quantity * lot.price;
      buyFees += quantity * lot.feePerUnit;
      entryOrderIds.push(lot.orderId);
      lot.amount -= quantity;
      remaining -= quantity;
      if (lot.amount <= 1e-12) lots.shift();
    }

    if (matched <= 1e-12) continue;
    const allocatedSellFee = order.feeUsd * (matched / order.amount);
    const exitValue = matched * order.price;
    const totalFees = buyFees + allocatedSellFee;
    closed.push({
      symbol: order.symbol,
      side: 'buy',
      amount: matched,
      entryPrice: entryValue / matched,
      exitPrice: order.price,
      value_usd: entryValue,
      fee_usd: totalFees,
      pnl_realized: exitValue - entryValue - totalFees,
      openedAt,
      closedAt: order.timestamp,
      tx_hash: `bybit:spot:${order.orderId}`,
      exchange: 'bybit',
      marketType: 'spot',
      raw: {
        entryOrderIds: [...new Set(entryOrderIds)],
        exitOrderId: order.orderId,
        executionIds: order.executionIds,
        unmatchedSellQuantity: Math.max(0, remaining),
      },
    });
    inventory.set(order.symbol, lots);
  }
  return closed;
}

async function fetchBybitSpotTrades(
  apiKey: string,
  apiSecret: string,
  startTime?: Date
): Promise<FinalTradeData[]> {
  const executions: SpotExecution[] = [];
  const now = Date.now();
  const reportStart = startTime?.getTime() || now - DEFAULT_IMPORT_DAYS * 24 * 60 * 60 * 1000;
  // Cost basis can originate before the selected report period. Load the full API history for
  // inventory matching, then keep only round trips closed inside the requested period.
  const inventoryStart = new Date(earliestBybitHistoryTime(now));
  for (const window of importWindows(inventoryStart, now)) {
    const records = await fetchAllPages(
      '/v5/execution/list',
      { category: 'spot', startTime: String(window.start), endTime: String(window.end) },
      apiKey,
      apiSecret
    );
    executions.push(
      ...records
        .filter((item) => item.execType === 'Trade')
        .map((item) => ({
          symbol: String(item.symbol),
          side: String(item.side).toLowerCase() as 'buy' | 'sell',
          amount: Number(item.execQty),
          price: Number(item.execPrice),
          feeUsd: normalizeSpotFee(item),
          timestamp: new Date(Number(item.execTime)),
          executionId: String(item.execId),
          orderId: String(item.orderId || item.execId),
        }))
    );
    await pause(120);
  }
  return buildClosedSpotTrades(executions).filter(
    (trade) => trade.closedAt.getTime() >= reportStart
  );
}

async function fetchBybitClosedLinearTrades(
  apiKey: string,
  apiSecret: string,
  startTime?: Date
): Promise<FinalTradeData[]> {
  const trades: FinalTradeData[] = [];
  for (const window of importWindows(startTime)) {
    const records = await fetchAllPages(
      '/v5/position/closed-pnl',
      { category: 'linear', startTime: String(window.start), endTime: String(window.end) },
      apiKey,
      apiSecret
    );
    for (const item of records) {
      const amount = Number(item.closedSize || item.qty || 0);
      const entryPrice = Number(item.avgEntryPrice || 0);
      const exitPrice = Number(item.avgExitPrice || 0);
      const closingSide = String(item.side).toLowerCase();
      if (!(amount > 0) || !(entryPrice > 0) || !(exitPrice > 0)) continue;
      trades.push({
        symbol: String(item.symbol),
        side: closingSide === 'sell' ? 'buy' : 'sell',
        amount,
        entryPrice,
        exitPrice,
        value_usd: Number(item.cumEntryValue || amount * entryPrice),
        fee_usd: Math.abs(Number(item.openFee || 0)) + Math.abs(Number(item.closeFee || 0)),
        pnl_realized: Number(item.closedPnl || 0),
        openedAt: new Date(Number(item.createdTime || item.updatedTime)),
        closedAt: new Date(Number(item.updatedTime)),
        tx_hash: `bybit:linear:${item.orderId}:${item.updatedTime}`,
        exchange: 'bybit',
        marketType: 'linear',
        raw: {
          orderId: item.orderId,
          closingSide: item.side,
          leverage: item.leverage,
          fillCount: item.fillCount,
          grossEntryValue: item.cumEntryValue,
          grossExitValue: item.cumExitValue,
        },
      });
    }
    await pause(120);
  }
  return trades;
}

export async function validateBybitWallet(
  apiKey: string,
  apiSecret: string
): Promise<{ valid: boolean; balance?: number; error?: string }> {
  try {
    const result = await signedBybitGet(
      '/v5/account/wallet-balance',
      new URLSearchParams({ accountType: 'UNIFIED' }),
      apiKey,
      apiSecret
    );
    const totalBalance = (result.list || []).reduce(
      (sum, account) => sum + Number(account.totalEquity || 0),
      0
    );
    return { valid: true, balance: totalBalance };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Bybit API error' };
  }
}

export async function getBybitBalance(apiKey: string, apiSecret: string): Promise<number> {
  const result = await validateBybitWallet(apiKey, apiSecret);
  return result.balance || 0;
}

/** Replaces exchange-imported rows with normalized, final round-trip trades. */
export async function saveTrades(
  userId: string,
  walletId: string,
  trades: FinalTradeData[]
): Promise<number> {
  await prisma.$transaction(async (tx) => {
    await tx.trade.deleteMany({
      where: { user_id: userId, wallet_id: walletId, import_source: 'api' },
    });
    for (const trade of trades) {
      await tx.trade.create({
        data: {
          user_id: userId,
          wallet_id: walletId,
          symbol: trade.symbol,
          side: trade.side,
          amount: trade.amount,
          price_usd: trade.exitPrice,
          value_usd: trade.value_usd,
          fee_usd: trade.fee_usd,
          pnl_realized: trade.pnl_realized,
          timestamp: trade.closedAt,
          tx_hash: trade.tx_hash,
          exchange: trade.exchange,
          import_source: 'api',
          status: 'closed',
          raw_data: JSON.stringify({
            version: 2,
            finalTrade: true,
            marketType: trade.marketType,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            openedAt: trade.openedAt.toISOString(),
            closedAt: trade.closedAt.toISOString(),
            ...trade.raw,
          }),
        },
      });
    }
  });
  return trades.length;
}

export async function importTradesFromExchange(
  exchange: string,
  apiKey: string,
  apiSecret: string,
  _passphrase?: string,
  startTime?: Date
): Promise<FinalTradeData[]> {
  if (exchange.toLowerCase() !== 'bybit') {
    throw new Error(`Exchange ${exchange} not supported yet`);
  }
  const [spot, linear] = await Promise.all([
    fetchBybitSpotTrades(apiKey, apiSecret, startTime),
    fetchBybitClosedLinearTrades(apiKey, apiSecret, startTime),
  ]);
  return [...spot, ...linear].sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime());
}

async function signHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
