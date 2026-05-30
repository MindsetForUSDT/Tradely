import { prisma } from '../db';
import { Decimal } from '@prisma/client/runtime/library';

interface TradeData {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  value_usd: number;
  fee_usd: number;
  timestamp: Date;
  tx_hash?: string;
  exchange: string;
}

// ===================== WALLET VALIDATION =====================

export async function validateBybitWallet(
  apiKey: string,
  apiSecret: string
): Promise<{ valid: boolean; balance?: number; error?: string }> {
  try {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      accountType: 'UNIFIED',
    });

    const signPayload = `${timestamp}${apiKey}5000${params.toString()}`;
    const signature = await signHmac(signPayload, apiSecret);

    const response = await fetch(
      `https://api.bybit.com/v5/account/wallet-balance?${params.toString()}`,
      {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': String(timestamp),
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': '5000',
        },
      }
    );

    if (!response.ok) {
      return { valid: false, error: 'Invalid API credentials' };
    }

    const data = await response.json();

    if (data.retCode !== 0) {
      return { valid: false, error: data.retMsg || 'Bybit API error' };
    }

    // Получаем общий баланс
    let totalBalance = 0;
    const accounts = data.result?.list || [];

    console.log('[Bybit Validation] Accounts count:', accounts.length);

    for (const account of accounts) {
      console.log('[Bybit Validation] Account type:', account.accountType);
      console.log(
        '[Bybit Validation] totalEquity:',
        account.totalEquity,
        'totalMarginBalance:',
        account.totalMarginBalance
      );

      // totalEquity - это общий баланс в USD для этого аккаунта
      const equity = parseFloat(account.totalEquity || '0');
      totalBalance += equity;
    }

    console.log('[Bybit Validation] Total balance calculated: $' + totalBalance);
    return { valid: true, balance: totalBalance };
  } catch (err: any) {
    console.error('[Bybit Validation] Error:', err.message);
    console.error('[Bybit Validation] Stack:', err.stack);
    return { valid: false, error: err.message };
  }
}

export async function getBybitBalance(apiKey: string, apiSecret: string): Promise<number> {
  const result = await validateBybitWallet(apiKey, apiSecret);
  return result.balance || 0;
}

// ===================== BYBIT TRADES =====================

async function fetchBybitTrades(
  apiKey: string,
  apiSecret: string,
  startTime?: number
): Promise<TradeData[]> {
  const baseUrl = 'https://api.bybit.com';
  let allTrades: TradeData[] = [];

  // Запрашиваем и spot и futures
  const categories = ['spot', 'linear']; // linear = futures

  for (const category of categories) {
    console.log(`[Bybit Import] Fetching ${category} trades...`);

    let cursor: string | undefined;
    let page = 0;

    do {
      page++;
      const timestamp = Date.now();

      console.log(`[Bybit Import] ${category} page ${page}, startTime:`, startTime);

      const params = new URLSearchParams({
        category,
        limit: '100',
        ...(startTime && { startTime: String(startTime) }),
        ...(cursor && { cursor }),
      });

      const signPayload = `${timestamp}${apiKey}5000${params.toString()}`;
      const signature = await signHmac(signPayload, apiSecret);

      const response = await fetch(`${baseUrl}/v5/execution/list?${params.toString()}`, {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': String(timestamp),
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': '5000',
        },
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Bybit Import] ${category} Response error:`, err);
        continue; // Пропускаем эту категорию, продолжаем с другой
      }

      const data = await response.json();

      console.log(
        `[Bybit Import] ${category} Response retCode:`,
        data.retCode,
        'retMsg:',
        data.retMsg
      );

      if (data.retCode !== 0) {
        console.error(`[Bybit Import] ${category} retCode error:`, data.retCode, data.retMsg);
        continue;
      }

      const tradesList = data.result?.list || [];
      const nextCursor = data.result?.nextPageCursor;

      console.log(
        `[Bybit Import] ${category} Page ${page}: ${tradesList.length} trades, nextCursor: ${nextCursor || 'none'}`
      );

      const pageTrades = tradesList.map((t: any) => ({
        symbol: t.symbol,
        side: t.side.toLowerCase(),
        amount: parseFloat(t.execQty),
        price: parseFloat(t.execPrice),
        value_usd: parseFloat(t.execQty) * parseFloat(t.execPrice),
        fee_usd: parseFloat(t.execFee),
        timestamp: new Date(parseInt(t.execTime)),
        tx_hash: t.execId,
        exchange: 'bybit',
      }));

      allTrades = allTrades.concat(pageTrades);
      cursor = nextCursor;

      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } while (cursor);
  }

  console.log(`[Bybit Import] Total trades fetched: ${allTrades.length}`);
  return allTrades;
}

// ===================== SAVE TRADES =====================

export async function saveTrades(
  userId: string,
  walletId: string,
  trades: TradeData[]
): Promise<number> {
  let saved = 0;
  let updated = 0;
  let skipped = 0;

  for (const trade of trades) {
    try {
      const existing = await prisma.trade.findFirst({
        where: {
          user_id: userId,
          tx_hash: trade.tx_hash || undefined,
        },
      });

      if (existing) {
        await prisma.trade.update({
          where: { id: existing.id },
          data: {
            wallet_id: walletId,
            symbol: trade.symbol,
            side: trade.side,
            amount: trade.amount,
            price_usd: trade.price,
            value_usd: trade.value_usd,
            fee_usd: trade.fee_usd,
            timestamp: trade.timestamp,
          },
        });
        updated++;
      } else {
        await prisma.trade.create({
          data: {
            user_id: userId,
            wallet_id: walletId,
            symbol: trade.symbol,
            side: trade.side,
            amount: trade.amount,
            price_usd: trade.price,
            value_usd: trade.value_usd,
            fee_usd: trade.fee_usd,
            timestamp: trade.timestamp,
            tx_hash: trade.tx_hash,
            exchange: trade.exchange,
            import_source: 'api',
            status: 'completed',
          },
        });
        saved++;
      }
    } catch (err: any) {
      if (err.code === 'P2002') {
        console.log('[saveTrades] Duplicate trade skipped:', trade.tx_hash);
        skipped++;
      } else {
        console.error('[saveTrades] Error saving trade:', err.message);
      }
    }
  }

  // P&L calculation
  try {
    const allTrades = await prisma.trade.findMany({
      where: { user_id: userId, wallet_id: walletId },
      orderBy: { timestamp: 'asc' },
    });

    const symbolGroups = new Map<string, typeof allTrades>();
    allTrades.forEach((trade) => {
      if (!trade.symbol) return;
      if (!symbolGroups.has(trade.symbol)) symbolGroups.set(trade.symbol, []);
      symbolGroups.get(trade.symbol)!.push(trade);
    });

    let pnlCalculated = 0;

    for (const [symbol, symbolTrades] of symbolGroups.entries()) {
      const buys = symbolTrades.filter((t) => t.side === 'buy');
      const sells = symbolTrades.filter((t) => t.side === 'sell');

      if (buys.length > 0 && sells.length > 0) {
        let totalBuyValue = new Decimal(0);
        let totalSellValue = new Decimal(0);
        let totalFees = new Decimal(0);

        buys.forEach((t) => {
          totalBuyValue = totalBuyValue.add(t.value_usd || 0);
        });
        sells.forEach((t) => {
          totalSellValue = totalSellValue.add(t.value_usd || 0);
        });
        symbolTrades.forEach((t) => {
          totalFees = totalFees.add(t.fee_usd || 0);
        });

        const grossPnl = totalSellValue.sub(totalBuyValue);
        const netPnl = grossPnl.sub(totalFees);

        let totalAmount = new Decimal(0);
        symbolTrades.forEach((t) => {
          totalAmount = totalAmount.add(t.amount || 0);
        });

        for (const trade of symbolTrades) {
          const tradeAmount = trade.amount || 0;
          const tradeRatio = tradeAmount.div(totalAmount);
          const tradePnl = netPnl.mul(tradeRatio);

          await prisma.trade.update({
            where: { id: trade.id },
            data: { pnl_realized: tradePnl.toString() },
          });
        }

        console.log(`[saveTrades] P&L for ${symbol}: $${netPnl.toFixed(2)}`);
        pnlCalculated++;
      }
    }

    console.log(`[saveTrades] P&L calculated for ${pnlCalculated} symbols`);
  } catch (err: any) {
    console.error('[saveTrades] Error calculating P&L:', err.message);
  }

  console.log(`[saveTrades] Saved: ${saved}, Updated: ${updated}, Skipped: ${skipped}`);
  return saved + updated;
}

// ===================== HELPERS =====================

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
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// For backwards compatibility
export async function importTradesFromExchange(
  exchange: string,
  apiKey: string,
  apiSecret: string,
  passphrase?: string,
  startTime?: Date
): Promise<TradeData[]> {
  const startTimestamp = startTime ? startTime.getTime() : undefined;

  switch (exchange.toLowerCase()) {
    case 'bybit':
      return fetchBybitTrades(apiKey, apiSecret, startTimestamp);
    default:
      throw new Error(`Exchange ${exchange} not supported yet`);
  }
}
